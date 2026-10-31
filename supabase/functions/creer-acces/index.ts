// Création d'un accès par le président : génère un mot de passe provisoire,
// crée l'utilisateur de connexion et le relie au jeune avec son rôle.
// Entrée : { membre_id, role }   Sortie : { identifiant, mot_de_passe, avertissements }
import { clientAdmin, clientUtilisateur, ErreurMetier, motDePasseProvisoire, reponse, rpc, servir } from "../_shared/commun.ts";

servir(async (req) => {
  const { membre_id, role = "membre" } = await req.json();
  if (!membre_id) throw new ErreurMetier("Jeune non précisé");

  const moi = clientUtilisateur(req);
  // Vérifications faites avec les droits du président (refus sinon)
  const verif = await rpc<{ email_technique: string; identifiant: string; avertissements: string[] }>(
    moi, "verifier_creation_acces", { p_membre: membre_id, p_role: role });
  const compte = await rpc<{ membre_id: string }>(moi, "mon_compte");

  const admin = clientAdmin();
  const mot_de_passe = motDePasseProvisoire();
  const { data, error } = await admin.auth.admin.createUser({
    email: verif.email_technique, password: mot_de_passe, email_confirm: true,
  });
  if (error || !data.user) throw new ErreurMetier("Création de l'accès impossible : " + (error?.message ?? ""));

  try {
    await rpc(admin, "lier_compte", { p_user: data.user.id, p_membre: membre_id, p_role: role, p_auteur: compte.membre_id });
  } catch (e) {
    await admin.auth.admin.deleteUser(data.user.id); // on n'en laisse pas à moitié créé
    throw e;
  }
  return reponse({ identifiant: verif.identifiant, mot_de_passe, avertissements: verif.avertissements });
});
