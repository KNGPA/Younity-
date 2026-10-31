// Envoie une notification Younity sur les téléphones de la personne (Web Push).
// Appelée par la base de données à chaque nouvelle notification (déclencheur
// notifications_push), avec un code secret. Respecte les réglages du profil.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } });

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
