// Installation : crée le tout premier compte, celui du président.
// Ne fonctionne qu'une seule fois, et seulement avec le code secret INSTALLATION_SECRET
// (en-tête « x-installation-secret »). Ensuite, elle refuse toujours.
// Entrée : { nom, prenoms, tel, email }   Sortie : { identifiant, mot_de_passe }
import { clientAdmin, ErreurMetier, motDePasseProvisoire, reponse, rpc, servir } from "../_shared/commun.ts";

servir(async (req) => {
  const secret = Deno.env.get("INSTALLATION_SECRET");
  if (!secret || req.headers.get("x-installation-secret") !== secret) throw new ErreurMetier("Code d'installation invalide", 403);

  const { nom, prenoms = "", tel = "", email = "" } = await req.json();
  if (!nom || (!tel && !email)) throw new ErreurMetier("Nom et téléphone (ou e-mail) obligatoires");

  const admin = clientAdmin();
  if (!(await rpc<boolean>(admin, "installation_possible"))) throw new ErreurMetier("Le président existe déjà.", 409);

  const membre = await rpc<string>(admin, "installer_president", { p_nom: nom, p_prenoms: prenoms, p_tel: tel, p_email: email });
  const mot_de_passe = motDePasseProvisoire();
  const { data, error } = await admin.auth.admin.createUser({
    email: `${membre}@membres.cotijes.app`, password: mot_de_passe, email_confirm: true,
  });
  if (error || !data.user) throw new ErreurMetier("Création impossible : " + (error?.message ?? ""));
  await rpc(admin, "lier_compte", { p_user: data.user.id, p_membre: membre, p_role: "president", p_auteur: membre });

  return reponse({ identifiant: tel || email, mot_de_passe });
});
