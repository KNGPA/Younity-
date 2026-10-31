-- =====================================================================
-- Younity — 0006 : numéros de téléphone avec ou sans indicatif
--   « +225 07 59 23 59 84 », « 002250759235984 » et « 0759235984 » désignent
--   le même numéro : la connexion et les contrôles de doublons les comparent
--   sans l'indicatif de la Côte d'Ivoire.
-- =====================================================================
create or replace function public.tel_norm(t text) returns text
language sql immutable as $$
  select case
    when d like '00225%' then substr(d, 6)
    when d like '225%' and length(d) = 13 then substr(d, 4)
    else d end
  from (select regexp_replace(coalesce(t, ''), '\D', '', 'g') as d) x
$$;
drop index if exists public.membres_tel_idx;
create index membres_tel_idx on public.membres (public.tel_norm(tel));

create or replace function public.login_email(identifiant text) returns text
language sql stable security definer set search_path = public, auth as $$
  with t as (
    select u.email from comptes c join membres m on m.id = c.membre_id join auth.users u on u.id = c.user_id
    where c.actif and m.actif and (
      (length(tel_norm(identifiant)) >= 8
         and tel_norm(m.tel) = tel_norm(identifiant))
      or (position('@' in identifiant) > 0 and lower(m.email) = lower(trim(identifiant)))))
  select email from t where (select count(*) from t) = 1   -- identifiant ambigu → refusé
$$;

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
  if length(tel_norm(m.tel)) >= 8 then
    select count(*) into nb from membres x join comptes c on c.membre_id = x.id
     where x.id <> m.id and tel_norm(x.tel) = tel_norm(m.tel);
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
                     and tel_norm(tel) = tel_norm(v_tel))) then
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
