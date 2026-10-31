-- =====================================================================
-- Younity — 0002 : fonctions utilisées par les fonctions serveur
-- (création des accès, mots de passe, installation, import Excel)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Auteur des actions faites par le serveur
--    Les fonctions serveur agissent avec la clé « service_role » : auth.uid()
--    est vide. Elles indiquent alors l'auteur réel (le président) via le
--    réglage local « cotijes.auteur », pour que le journal reste exact.
-- ---------------------------------------------------------------------
create or replace function public.auteur_actuel() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(current_membre(), nullif(current_setting('cotijes.auteur', true), '')::uuid)
$$;

create or replace function public.journaliser(p_action text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into journal (auteur, action, detail) values (auteur_actuel(), p_action, coalesce(p_detail, ''))
$$;

create or replace function public.notifier_permission(p_perm text, p_type text, p_titre text, p_corps text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (membre_id, type, titre, corps, auteur)
  select c.membre_id, p_type, p_titre, p_corps, auteur_actuel()
  from comptes c join roles r on r.id = c.role_id
  where c.actif and (r.id = 'president' or p_perm = any(r.permissions))
    and c.membre_id is distinct from auteur_actuel()
$$;
revoke execute on function public.journaliser(text, text) from public, anon, authenticated;
revoke execute on function public.notifier_permission(text, text, text, text) from public, anon, authenticated;

-- Adresse technique de connexion d'un jeune (jamais affichée, jamais utilisée
-- pour envoyer des e-mails). Liée à l'identifiant du jeune, elle ne change pas
-- quand le téléphone ou l'e-mail du jeune change.
create or replace function public.email_technique(p_membre uuid) returns text
language sql immutable as $$ select p_membre::text || '@membres.cotijes.app' $$;

-- ---------------------------------------------------------------------
-- 2. Mon compte : ce que l'application charge au démarrage
-- ---------------------------------------------------------------------
create or replace function public.mon_compte() returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when c.user_id is null then jsonb_build_object('etat', 'inconnu')
    when not m.actif then jsonb_build_object('etat', 'inactif')
    when not c.actif then jsonb_build_object('etat', 'bloque', 'motif', c.motif_blocage)
    else jsonb_build_object(
      'etat', 'actif',
      'membre_id', m.id, 'nom', m.nom, 'prenoms', m.prenoms, 'tel', m.tel, 'email', m.email,
      'role', r.id, 'role_nom', r.nom,
      'permissions', case when r.id = 'president'
                       then (select permissions from roles where id = 'president') else r.permissions end,
      'doit_changer_mdp', c.doit_changer_mdp,
      'prefs', c.prefs,
      'parametres', (select to_jsonb(p) - 'id' from parametres p))
  end
  from (select auth.uid() as uid) u
  left join comptes c on c.user_id = u.uid
  left join membres m on m.id = c.membre_id
  left join roles r on r.id = c.role_id
$$;
revoke all on function public.mon_compte() from public, anon;
grant execute on function public.mon_compte() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Création d'un accès (en deux temps, appelée par la fonction serveur)
-- ---------------------------------------------------------------------
-- a) Vérification, faite AVEC les droits du président connecté.
--    Renvoie l'adresse technique à créer et d'éventuels avertissements.
create or replace function public.verifier_creation_acces(p_membre uuid, p_role text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m membres; avert text[] := '{}'; nb int;
begin
  if not is_president() then raise exception 'Action réservée au président'; end if;
  select * into m from membres where id = p_membre;
  if not found then raise exception 'Jeune introuvable'; end if;
  if not m.actif then raise exception 'Ce jeune est inactif : réactive-le avant de lui créer un accès.'; end if;
  if exists (select 1 from comptes where membre_id = p_membre) then raise exception 'Ce jeune a déjà un accès.'; end if;
  if p_role = 'president' then raise exception 'Il ne peut y avoir qu''un seul président.'; end if;
  if not exists (select 1 from roles where id = p_role) then raise exception 'Rôle inconnu'; end if;
  if coalesce(m.tel, '') = '' and coalesce(m.email, '') = '' then
    raise exception 'Renseigne d''abord un téléphone ou un e-mail : c''est son identifiant de connexion.';
  end if;
  if length(regexp_replace(coalesce(m.tel, ''), '\D', '', 'g')) >= 8 then
    select count(*) into nb from membres x join comptes c on c.membre_id = x.id
     where x.id <> m.id and regexp_replace(x.tel, '\D', '', 'g') = regexp_replace(m.tel, '\D', '', 'g');
    if nb > 0 then
      avert := avert || case when coalesce(m.email, '') = ''
        then 'Ce numéro est déjà utilisé par un autre compte : ajoute un e-mail, sinon ce jeune ne pourra pas se connecter.'
        else 'Ce numéro est partagé : ce jeune devra se connecter avec son e-mail.' end;
    end if;
  end if;
  return jsonb_build_object('email_technique', email_technique(p_membre),
                            'identifiant', coalesce(nullif(m.tel, ''), m.email),
                            'avertissements', to_jsonb(avert));
end $$;
revoke all on function public.verifier_creation_acces(uuid, text) from public, anon;
grant execute on function public.verifier_creation_acces(uuid, text) to authenticated;

-- b) Enregistrement du compte, réservé au serveur (service_role).
create or replace function public.lier_compte(p_user uuid, p_membre uuid, p_role text, p_auteur uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform set_config('cotijes.auteur', coalesce(p_auteur::text, ''), true);
  insert into comptes (user_id, membre_id, role_id, doit_changer_mdp) values (p_user, p_membre, p_role, true);
  insert into notifications (membre_id, type, titre, corps, auteur)
    values (p_membre, 'messages', 'Bienvenue sur Younity', 'Ton accès a été créé. Change ton mot de passe à la première connexion.', p_auteur);
end $$;
revoke all on function public.lier_compte(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.lier_compte(uuid, uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------
-- 4. Réinitialisation du mot de passe par le président
-- ---------------------------------------------------------------------
create or replace function public.preparer_reinitialisation(p_membre uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  if not is_president() then raise exception 'Action réservée au président'; end if;
  select user_id into u from comptes where membre_id = p_membre;
  if u is null then raise exception 'Ce jeune n''a pas d''accès.'; end if;
  update comptes set doit_changer_mdp = true where membre_id = p_membre;
  perform journaliser('Mot de passe réinitialisé', nom_complet(p_membre));
  return u;
end $$;
revoke all on function public.preparer_reinitialisation(uuid) from public, anon;
grant execute on function public.preparer_reinitialisation(uuid) to authenticated;

-- Retrouver le compte pour « mot de passe oublié » (serveur uniquement).
-- Seul l'e-mail réel du jeune est accepté : le lien part à cette adresse.
create or replace function public.compte_pour_email(p_email text) returns table (user_id uuid, membre_id uuid, email text, prenom text)
language sql stable security definer set search_path = public as $$
  select c.user_id, m.id, m.email, coalesce(nullif(split_part(m.prenoms, ' ', 1), ''), m.nom)
  from membres m join comptes c on c.membre_id = m.id
  where c.actif and m.actif and m.email is not null and lower(m.email) = lower(trim(p_email))
$$;
revoke all on function public.compte_pour_email(text) from public, anon, authenticated;
grant execute on function public.compte_pour_email(text) to service_role;

-- Utilisateurs Auth des jeunes bloqués / débloqués (pour couper les sessions)
create or replace function public.user_du_membre(p_membre uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select user_id from comptes where membre_id = p_membre and is_president()
$$;
revoke all on function public.user_du_membre(uuid) from public, anon;
grant execute on function public.user_du_membre(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Installation : création du tout premier compte (le président)
-- ---------------------------------------------------------------------
create or replace function public.installation_possible() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from comptes where role_id = 'president')
$$;
revoke all on function public.installation_possible() from public, anon, authenticated;
grant execute on function public.installation_possible() to service_role;

create or replace function public.installer_president(p_nom text, p_prenoms text, p_tel text, p_email text) returns uuid
language plpgsql security definer set search_path = public as $$
declare mid uuid;
begin
  if not installation_possible() then raise exception 'Le président existe déjà.'; end if;
  insert into membres (nom, prenoms, tel, email)
    values (upper(trim(p_nom)), trim(coalesce(p_prenoms, '')), nullif(trim(p_tel), ''), nullif(lower(trim(p_email)), ''))
    returning id into mid;
  return mid;
end $$;
revoke all on function public.installer_president(text, text, text, text) from public, anon, authenticated;
grant execute on function public.installer_president(text, text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 6. Import Excel des jeunes (depuis l'application)
--    p_lignes : tableau JSON [{nom, prenoms, tel, email, anniversaire:"JJ/MM",
--               baptise, profession, habitation, departement, fonction}]
--    Les départements et fonctions doivent déjà exister dans les listes.
--    Un jeune déjà présent (même e-mail, ou même nom + même téléphone) est ignoré.
-- ---------------------------------------------------------------------
create or replace function public.importer_jeunes(p_lignes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  l jsonb; i int := 0; ajoutes int := 0; ignores int := 0; erreurs jsonb := '[]';
  v_nom text; v_tel text; v_email text; v_dep int; v_fon int; v_j int; v_m int; v_anniv text;
begin
  if not has_perm('membres_gerer') then raise exception 'Action réservée au président'; end if;
  for l in select * from jsonb_array_elements(p_lignes) loop
    i := i + 1;
    begin
      v_nom := upper(trim(coalesce(l->>'nom', '')));
      if v_nom = '' then raise exception 'nom manquant'; end if;
      v_tel := nullif(trim(coalesce(l->>'tel', '')), '');
      v_email := nullif(lower(trim(coalesce(l->>'email', ''))), '');
      if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'e-mail invalide'; end if;
      v_dep := null; v_fon := null; v_j := null; v_m := null;
      if nullif(trim(coalesce(l->>'departement', '')), '') is not null then
        select id into v_dep from departements where lower(nom) = lower(trim(l->>'departement'));
        if v_dep is null then raise exception 'département « % » absent de la liste', trim(l->>'departement'); end if;
      end if;
      if nullif(trim(coalesce(l->>'fonction', '')), '') is not null then
        select id into v_fon from fonctions where lower(nom) = lower(trim(l->>'fonction'));
        if v_fon is null then raise exception 'fonction « % » absente de la liste', trim(l->>'fonction'); end if;
      end if;
      v_anniv := nullif(trim(coalesce(l->>'anniversaire', '')), '');
      if v_anniv is not null then
        if v_anniv !~ '^\d{1,2}[/.-]\d{1,2}' then raise exception 'anniversaire attendu au format JJ/MM'; end if;
        v_j := split_part(regexp_replace(v_anniv, '[.-]', '/', 'g'), '/', 1)::int;
        v_m := split_part(regexp_replace(v_anniv, '[.-]', '/', 'g'), '/', 2)::int;
        if v_m not between 1 and 12 or v_j not between 1 and 31 then raise exception 'anniversaire invalide'; end if;
      end if;
      if exists (select 1 from membres where (v_email is not null and lower(email) = v_email)
                 or (nom = v_nom and coalesce(prenoms,'') = trim(coalesce(l->>'prenoms',''))
                     and regexp_replace(coalesce(tel,''), '\D', '', 'g') = regexp_replace(coalesce(v_tel,''), '\D', '', 'g'))) then
        ignores := ignores + 1;
        continue;
      end if;
      insert into membres (nom, prenoms, tel, email, anniv_jour, anniv_mois, baptise, profession, habitation, departement_id, fonction_id)
      values (v_nom, trim(coalesce(l->>'prenoms', '')), v_tel, v_email, v_j, v_m,
              lower(coalesce(l->>'baptise', '')) in ('oui', 'true', 'o', 'x', '1'),
              nullif(trim(coalesce(l->>'profession', '')), ''), nullif(trim(coalesce(l->>'habitation', '')), ''), v_dep, v_fon);
      ajoutes := ajoutes + 1;
    exception when others then
      erreurs := erreurs || jsonb_build_object('ligne', i, 'nom', l->>'nom', 'erreur', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('ajoutes', ajoutes, 'ignores', ignores, 'erreurs', erreurs);
end $$;
revoke all on function public.importer_jeunes(jsonb) from public, anon;
grant execute on function public.importer_jeunes(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Paiements intégrés (Mobile Money) — enregistrement par le serveur
--    Appelée par la fonction « paiement-webhook » une fois le paiement
--    confirmé par l'opérateur. La référence évite tout doublon.
-- ---------------------------------------------------------------------
create unique index if not exists paiements_ref_appli_unique on public.paiements (reference)
  where source = 'appli' and reference is not null;

create table if not exists public.paiements_en_attente (
  id          uuid primary key default gen_random_uuid(),
  campagne_id uuid not null,
  membre_id   uuid not null,
  montant     integer not null check (montant > 0),
  moyen       text not null check (moyen in ('Orange Money','MTN MoMo','Moov Money','Wave')),
  statut      text not null default 'en_attente' check (statut in ('en_attente','reussi','echoue','expire')),
  reference_operateur text,
  cree_le     timestamptz not null default now(),
  foreign key (campagne_id, membre_id) references public.campagne_lignes(campagne_id, membre_id)
);
alter table public.paiements_en_attente enable row level security;
create policy lire on public.paiements_en_attente for select to authenticated using (membre_id = current_membre());

-- Le membre lance un paiement depuis l'application (étape 1)
create or replace function public.initier_paiement(p_campagne uuid, p_montant integer, p_moyen text) returns uuid
language plpgsql security definer set search_path = public as $$
declare moi uuid := current_membre(); p parametres; reste int; pid uuid;
begin
  if moi is null then raise exception 'Non connecté'; end if;
  select * into p from parametres;
  if not p.paiement_integre then raise exception 'Le paiement dans l''application n''est pas encore activé.'; end if;
  if coalesce((p.operateurs->>p_moyen)::boolean, false) is not true then raise exception 'Ce moyen de paiement n''est pas disponible.'; end if;
  if not exists (select 1 from campagnes where id = p_campagne and statut = 'en_cours') then raise exception 'Campagne clôturée ou introuvable'; end if;
  select s.reste into reste from v_situations s where s.campagne_id = p_campagne and s.membre_id = moi;
  if reste is null then raise exception 'Tu ne participes pas à cette campagne.'; end if;
  if p_montant is null or p_montant < 100 then raise exception 'Montant minimum : 100 FCFA'; end if;
  if p_montant > reste then raise exception 'Le montant dépasse ce qu''il te reste à payer (% FCFA).', reste; end if;
  insert into paiements_en_attente (campagne_id, membre_id, montant, moyen) values (p_campagne, moi, p_montant, p_moyen)
    returning id into pid;
  return pid;
end $$;
revoke all on function public.initier_paiement(uuid, integer, text) from public, anon;
grant execute on function public.initier_paiement(uuid, integer, text) to authenticated;

-- L'opérateur confirme (étape 2, serveur uniquement). Sans effet si déjà traité.
create or replace function public.confirmer_paiement(p_attente uuid, p_reussi boolean, p_reference text) returns boolean
language plpgsql security definer set search_path = public as $$
declare a paiements_en_attente;
begin
  select * into a from paiements_en_attente where id = p_attente for update;
  if not found or a.statut <> 'en_attente' then return false; end if;
  update paiements_en_attente set statut = case when p_reussi then 'reussi' else 'echoue' end,
         reference_operateur = p_reference where id = p_attente;
  if p_reussi then
    insert into paiements (campagne_id, membre_id, montant, moyen, reference, source, saisi_par)
    values (a.campagne_id, a.membre_id, a.montant, a.moyen, p_reference, 'appli', a.membre_id);
  end if;
  return true;
end $$;
revoke all on function public.confirmer_paiement(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.confirmer_paiement(uuid, boolean, text) to service_role;
grant select on public.paiements_en_attente to authenticated;
