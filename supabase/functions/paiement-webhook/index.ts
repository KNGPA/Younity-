// Réception des confirmations de paiement Mobile Money (Orange Money, MTN MoMo,
// Moov Money, Wave). Chaque opérateur appelle cette adresse quand un paiement
// lancé depuis l'application réussit ou échoue.
//
// ⚠️ À compléter quand les contrats et clés API des opérateurs seront disponibles :
// chaque opérateur signe ses messages à sa façon. Tant qu'un opérateur n'est pas
// configuré, ses messages sont refusés — aucun paiement ne peut être inventé.
// Les clés restent dans les variables secrètes du serveur, jamais dans l'application.
import { clientAdmin, ErreurMetier, reponse, rpc, servir } from "../_shared/commun.ts";

type Confirmation = { attente_id: string; reussi: boolean; reference: string };
type Operateur = (req: Request, corps: string) => Promise<Confirmation>;

const nonConfigure: Operateur = () => Promise.reject(new ErreurMetier("Opérateur non configuré", 501));

// Un « adaptateur » par opérateur : vérifie la signature puis lit le résultat.
const operateurs: Record<string, Operateur> = {
  wave: nonConfigure,          // en-tête Wave-Signature (HMAC SHA-256 avec WAVE_WEBHOOK_SECRET)
  "orange-money": nonConfigure,
  "mtn-momo": nonConfigure,
  "moov-money": nonConfigure,
};

servir(async (req) => {
  const op = new URL(req.url).searchParams.get("operateur") ?? "";
  const adaptateur = operateurs[op];
  if (!adaptateur) throw new ErreurMetier("Opérateur inconnu", 404);

  const c = await adaptateur(req, await req.text());
  const traite = await rpc<boolean>(clientAdmin(), "confirmer_paiement",
    { p_attente: c.attente_id, p_reussi: c.reussi, p_reference: c.reference });
  return reponse({ ok: true, deja_traite: !traite });
});
