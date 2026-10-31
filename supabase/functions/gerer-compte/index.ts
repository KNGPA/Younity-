// Actions du président sur un compte existant.
// Entrée : { action: "reinitialiser" | "bloquer" | "debloquer", membre_id, motif? }
//  - reinitialiser → nouveau mot de passe provisoire (à changer à la connexion)
//  - bloquer       → accès coupé tout de suite (données conservées)
//  - debloquer     → accès rétabli
import { clientAdmin, clientUtilisateur, ErreurMetier, motDePasseProvisoire, reponse, rpc, servir } from "../_shared/commun.ts";

const BLOCAGE = "876000h"; // ≈ 100 ans : levé uniquement par « débloquer »

servir(async (req) => {
  const { action, membre_id, motif } = await req.json();
  if (!membre_id) throw new ErreurMetier("Jeune non précisé");
  const moi = clientUtilisateur(req);
  const admin = clientAdmin();

  switch (action) {
    case "reinitialiser": {
      const user = await rpc<string>(moi, "preparer_reinitialisation", { p_membre: membre_id });
      const mot_de_passe = motDePasseProvisoire();
      const { error } = await admin.auth.admin.updateUserById(user, { password: mot_de_passe });
      if (error) throw new ErreurMetier("Réinitialisation impossible : " + error.message);
      return reponse({ mot_de_passe });
    }
    case "bloquer": {
      // 1) la base cache aussitôt toutes les données à ce compte (règles d'accès)
      await rpc(moi, "bloquer_compte", { p_membre: membre_id, p_motif: motif ?? null });
      // 2) la connexion est refusée et la session ne peut plus être prolongée
      const user = await rpc<string | null>(moi, "user_du_membre", { p_membre: membre_id });
      if (user) await admin.auth.admin.updateUserById(user, { ban_duration: BLOCAGE });
      return reponse({ ok: true });
    }
    case "debloquer": {
      await rpc(moi, "debloquer_compte", { p_membre: membre_id });
      const user = await rpc<string | null>(moi, "user_du_membre", { p_membre: membre_id });
      if (user) await admin.auth.admin.updateUserById(user, { ban_duration: "none" });
      return reponse({ ok: true });
    }
    default:
      throw new ErreurMetier("Action inconnue");
  }
});
