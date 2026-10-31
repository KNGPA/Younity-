-- =====================================================================
-- Younity — 0007 : mot de passe oublié
--   1) Réinitialiser soi-même : code à 6 chiffres envoyé par e-mail (Gmail),
--      valable 15 minutes, 5 essais maximum, 1 envoi par minute, 5 par heure.
--   2) Demander au président : il est notifié dans l'application ; le jeune
--      peut aussi le prévenir sur WhatsApp (lien gratuit).
-- =====================================================================
create table public.codes_reinitialisation (
  id         bigserial primary key,
  membre_id  uuid not null references public.membres(id) on delete cascade,
  code_hash  text not null,                 -- empreinte SHA-256, jamais le code en clair
  expire_le  timestamptz not null default now() + interval '15 minutes',
  essais     integer not null default 0,
  cree_le    timestamptz not null default now()
);
create index codes_reinit_membre_idx on public.codes_reinitialisation (membre_id, cree_le desc);
alter table public.codes_reinitialisation enable row level security;   -- aucun accès depuis l'appli

-- Enregistre un nouveau code (appelé par le serveur). Renvoie le destinataire,
-- ou rien si l'e-mail est inconnu ou si trop de demandes récentes.
create or replace function public.enregistrer_code_reinit(p_email text, p_hash text)
returns table (membre_id uuid, user_id uuid, email text, prenom text)
language plpgsql security definer set search_path = public as $$
declare c record;
begin
  select * into c from compte_pour_email(p_email) limit 1;
  if c.membre_id is null then return; end if;
  if exists (select 1 from codes_reinitialisation r where r.membre_id = c.membre_id and r.cree_le > now() - interval '1 minute')
     or (select count(*) from codes_reinitialisation r where r.membre_id = c.membre_id and r.cree_le > now() - interval '1 hour') >= 5 then
    return;
  end if;
  update codes_reinitialisation set expire_le = now() where codes_reinitialisation.membre_id = c.membre_id and expire_le > now();
  insert into codes_reinitialisation (membre_id, code_hash) values (c.membre_id, p_hash);
  membre_id := c.membre_id; user_id := c.user_id; email := c.email; prenom := c.prenom;
  return next;
end $$;

-- Vérifie le code. Renvoie l'utilisateur à qui changer le mot de passe,
-- ou une erreur claire (code faux, expiré, trop d'essais).
create or replace function public.valider_code_reinit(p_email text, p_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c record; r codes_reinitialisation;
begin
  select * into c from compte_pour_email(p_email) limit 1;
  if c.membre_id is null then return jsonb_build_object('erreur', 'Code incorrect ou expiré.'); end if;
  select * into r from codes_reinitialisation x where x.membre_id = c.membre_id and x.expire_le > now()
   order by x.cree_le desc limit 1;
  if not found then return jsonb_build_object('erreur', 'Code incorrect ou expiré. Demande un nouveau code.'); end if;
  if r.essais >= 5 then return jsonb_build_object('erreur', 'Trop d''essais. Demande un nouveau code.'); end if;
  if r.code_hash <> p_hash then
    update codes_reinitialisation set essais = essais + 1 where id = r.id;   -- l'essai est bien compté
    return jsonb_build_object('erreur', format('Code incorrect (%s essai(s) restant(s)).', 4 - r.essais));
  end if;
  delete from codes_reinitialisation where codes_reinitialisation.membre_id = c.membre_id;
  update comptes set doit_changer_mdp = false where comptes.membre_id = c.membre_id;
  perform set_config('cotijes.auteur', c.membre_id::text, true);
  perform journaliser('Mot de passe réinitialisé', nom_complet(c.membre_id) || ' — par code reçu par e-mail');
  return jsonb_build_object('user_id', c.user_id);
end $$;
revoke all on function public.enregistrer_code_reinit(text, text) from public, anon, authenticated;
revoke all on function public.valider_code_reinit(text, text) from public, anon, authenticated;
grant execute on function public.enregistrer_code_reinit(text, text), public.valider_code_reinit(text, text) to service_role;

-- « Demander au président » : accessible sans être connecté.
-- Prévient le(s) président(s) dans l'appli (au plus une fois toutes les 10 minutes
-- pour un même jeune) et renvoie le numéro WhatsApp du président.
create or replace function public.demander_reinitialisation(p_identifiant text) returns text
language plpgsql security definer set search_path = public as $$
declare m membres; pres_tel text;
begin
  select tel into pres_tel from membres x join comptes c on c.membre_id = x.id
   where c.role_id = 'president' and c.actif limit 1;
  select x.* into m from membres x join comptes c on c.membre_id = x.id
   where c.actif and x.actif and (
     (length(tel_norm(p_identifiant)) >= 8 and tel_norm(x.tel) = tel_norm(p_identifiant))
     or (position('@' in coalesce(p_identifiant, '')) > 0 and lower(x.email) = lower(trim(p_identifiant))))
   limit 1;
  if m.id is not null and not exists (
       select 1 from notifications n where n.titre = 'Mot de passe oublié : ' || nom_complet(m.id)
         and n.cree_le > now() - interval '10 minutes') then
    insert into notifications (membre_id, type, titre, corps)
    select c.membre_id, 'messages', 'Mot de passe oublié : ' || nom_complet(m.id),
           'Réinitialise son mot de passe : Jeunes → sa fiche → Réinitialiser, puis envoie-le-lui sur WhatsApp.'
    from comptes c where c.role_id = 'president' and c.actif;
    perform set_config('cotijes.auteur', m.id::text, true);
    perform journaliser('Demande de réinitialisation', nom_complet(m.id) || ' — envoyée au président');
  end if;
  return tel_norm(pres_tel);                -- même réponse que le compte existe ou non
end $$;
revoke all on function public.demander_reinitialisation(text) from public;
grant execute on function public.demander_reinitialisation(text) to anon, authenticated;
