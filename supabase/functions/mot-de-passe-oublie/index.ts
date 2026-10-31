// « Mot de passe oublié » — réinitialiser soi-même avec un code reçu par e-mail.
// Fonction publique (pas besoin d'être connecté).
//   { action: "envoyer", email }                       → envoie un code à 6 chiffres (15 min)
//   { action: "valider", email, code, mot_de_passe }   → vérifie le code et change le mot de passe
// L'e-mail part du Gmail de l'application (mot de passe d'application Google).
// Variables secrètes : GMAIL_USER, GMAIL_APP_PASSWORD
import nodemailer from "npm:nodemailer@6.9.15";
import { clientAdmin, ErreurMetier, reponse, rpc, servir } from "../_shared/commun.ts";
import { LOGO_BLANC_PNG_BASE64, LOGO_CID } from "../_shared/logo.ts";

const MESSAGE = "Si cet e-mail correspond à un compte, un code vient d'y être envoyé. Pense à regarder dans les spams.";

async function empreinte(email: string, code: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email.trim().toLowerCase()}:${code}`));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

function nouveauCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 900000;
  return String(100000 + n);
}

function courriel(prenom: string, code: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:auto;border:1px solid #e3e8e5;border-radius:14px;overflow:hidden">
  <div style="background:#135C2E;padding:18px 22px;border-bottom:4px solid #D48F00"><img src="cid:${LOGO_CID}" alt="Younity — Gestion des jeunes Harvest" width="200" style="display:block;width:200px;height:auto;border:0"></div>
  <div style="padding:22px;color:#16211c;font-size:15px;line-height:1.5">
    <p>Bonjour ${prenom},</p>
    <p>Voici ton code pour choisir un nouveau mot de passe :</p>
    <p style="font-size:32px;font-weight:800;letter-spacing:8px;text-align:center;background:#f0f6f2;border-radius:10px;padding:14px 0;margin:18px 0">${code}</p>
    <p style="font-size:13px;color:#4a5852">Ce code est valable 15 minutes. Si tu n'as rien demandé, ignore ce message : ton mot de passe ne change pas.</p>
  </div></div>`;
}

servir(async (req) => {
  const { action, email, code, mot_de_passe } = await req.json();
  const mail = String(email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new ErreurMetier("Entre une adresse e-mail valide.");
  const admin = clientAdmin();

  if (action === "envoyer") {
    const c = nouveauCode();
    const dest = await rpc<{ email: string; prenom: string }[]>(admin, "enregistrer_code_reinit",
      { p_email: mail, p_hash: await empreinte(mail, c) });
    if (dest.length === 1) {
      const smtp = nodemailer.createTransport({
        host: "smtp.gmail.com", port: 465, secure: true,
        auth: { user: Deno.env.get("GMAIL_USER"), pass: Deno.env.get("GMAIL_APP_PASSWORD") },
      });
      try {
        await smtp.sendMail({
          from: `"Younity" <${Deno.env.get("GMAIL_USER")}>`, to: dest[0].email,
          subject: `${c} est ton code Younity`, html: courriel(dest[0].prenom, c),
          text: `Bonjour ${dest[0].prenom}, ton code Younity est ${c}. Il est valable 15 minutes.`,
          attachments: [{ filename: "younity.png", content: LOGO_BLANC_PNG_BASE64, encoding: "base64", cid: LOGO_CID }],
        });
      } catch (e) {
        console.error("Envoi Gmail échoué", e);
        throw new ErreurMetier("L'e-mail n'a pas pu partir. Réessaie plus tard ou demande au président.", 502);
      }
    }
    return reponse({ message: MESSAGE });             // même réponse que l'e-mail existe ou non
  }

  if (action === "valider") {
    if (!/^\d{6}$/.test(String(code ?? ""))) throw new ErreurMetier("Le code fait 6 chiffres.");
    if (String(mot_de_passe ?? "").length < 6) throw new ErreurMetier("6 caractères minimum pour le mot de passe.");
    const r = await rpc<{ user_id?: string; erreur?: string }>(admin, "valider_code_reinit",
      { p_email: mail, p_hash: await empreinte(mail, String(code)) });
    if (!r.user_id) throw new ErreurMetier(r.erreur ?? "Code incorrect.");
    const { error } = await admin.auth.admin.updateUserById(r.user_id, { password: String(mot_de_passe) });
    if (error) throw new ErreurMetier("Impossible de changer le mot de passe : " + error.message);
    return reponse({ ok: true, message: "Mot de passe changé. Tu peux te connecter." });
  }

  throw new ErreurMetier("Action inconnue");
});
