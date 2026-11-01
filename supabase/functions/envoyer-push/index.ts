// Envoie une notification Younity sur les téléphones de la personne :
// Web Push (navigateur, iPhone) et Firebase Cloud Messaging (application Android native).
// Appelée par la base de données à chaque nouvelle notification (déclencheur
// notifications_push), avec un code secret. Respecte les réglages du profil.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } });

/* ---- Firebase (FCM HTTP v1) : clé du compte de service dans le secret FCM_SERVICE_ACCOUNT ---- */
const SA = (() => { try { return JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT") ?? ""); } catch { return null; } })();
let jeton: { v: string; exp: number } | null = null;
const b64u = (b: ArrayBuffer | string) => btoa(typeof b === "string" ? b : String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function jetonGoogle(): Promise<string> {
  if (jeton && jeton.exp > Date.now() + 60000) return jeton.v;
  const t = Math.floor(Date.now() / 1000);
  const corps = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64u(JSON.stringify({
    iss: SA.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat: t, exp: t + 3600 }));
  const pem = SA.private_key.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const cle = await crypto.subtle.importKey("pkcs8", Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cle, new TextEncoder().encode(corps));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${corps}.${b64u(sig)}` });
  const j = await r.json();
  if (!j.access_token) throw new Error("Jeton Google refusé : " + JSON.stringify(j));
  jeton = { v: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return jeton.v;
}
async function envoyerFcm(token: string, n: { id: number | string; titre: string; corps: string; type: string }): Promise<number> {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${SA.project_id}/messages:send`, {
    method: "POST", headers: { Authorization: `Bearer ${await jetonGoogle()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { token,
      notification: { title: n.titre, body: n.corps },
      data: { type: String(n.type), id: String(n.id) },
      android: { priority: "HIGH", ttl: "86400s",
        notification: { channel_id: "younity", color: "#135C2E", icon: "ic_stat_younity", tag: `younity-${n.id}` } } } }) });
  if (!r.ok) console.error("FCM", r.status, await r.text());
  return r.status;
}

let reglages: Record<string, string> | null = null;
async function lireReglages() {
  if (reglages) return reglages;
  const { data } = await admin.from("reglages_serveur").select("cle,valeur");
  reglages = Object.fromEntries((data ?? []).map((r: { cle: string; valeur: string }) => [r.cle, r.valeur]));
  webpush.setVapidDetails(reglages.vapid_subject, reglages.vapid_public, reglages.vapid_private);
  return reglages;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const r = await lireReglages();
  if (!r.push_hook_secret || req.headers.get("x-push-secret") !== r.push_hook_secret) return new Response("refusé", { status: 403 });

  const { id } = await req.json();
  const { data: n } = await admin.from("notifications").select("id,membre_id,type,titre,corps").eq("id", id).single();
  if (!n) return new Response("introuvable", { status: 404 });

  const { data: c } = await admin.from("comptes").select("prefs,actif").eq("membre_id", n.membre_id).maybeSingle();
  if (!c || !c.actif || (c.prefs && c.prefs[n.type] === false)) return Response.json({ envoyes: 0, raison: "désactivé" });

  const { data: abos } = await admin.from("push_abonnements").select("endpoint,p256dh,auth").eq("membre_id", n.membre_id);
  const charge = JSON.stringify({ title: n.titre, body: n.corps, type: n.type, tag: `younity-${n.id}`, url: "/Younity-/#notifications" });
  let envoyes = 0;
  for (const a of abos ?? []) {
    if (a.endpoint.startsWith("fcm:")) {
      if (!SA) continue; // Firebase pas encore configuré
      try {
        const st = await envoyerFcm(a.endpoint.slice(4), n);
        if (st === 200) envoyes++;
        else if (st === 404) await admin.from("push_abonnements").delete().eq("endpoint", a.endpoint); // appli désinstallée
      } catch (e) { console.error("FCM échoué", (e as Error).message); }
      continue;
    }
    try {
      await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, charge, { TTL: 86400, urgency: "high" });
      envoyes++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_abonnements").delete().eq("endpoint", a.endpoint); // téléphone désabonné
      else console.error("Envoi échoué", code, (e as Error).message);
    }
  }
  return Response.json({ envoyes });
});
