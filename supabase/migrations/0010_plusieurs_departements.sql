-- 0010 — Un jeune peut appartenir à plusieurs départements.
-- membres.departement_id reste le département « principal » (le premier choisi) pour compatibilité.

create table if not exists public.membre_departements (
  membre_id      uuid    not null references public.membres(id) on delete cascade,
  departement_id integer not null references public.departements(id) on delete cascade,
  primary key (membre_id, departement_id)
);
create index if not exists membre_departements_dep_idx on public.membre_departements (departement_id);

insert into public.membre_departements (membre_id, departement_id)
select id, departement_id from public.membres where departement_id is not null
on conflict do nothing;

alter table public.membre_departements enable row level security;
create policy lire on public.membre_departements for select to authenticated
  using (has_perm('membres_voir') or membre_id = current_membre());
create policy gerer on public.membre_departements for all to authenticated
  using (has_perm('membres_gerer')) with check (has_perm('membres_gerer'));
grant select, insert, delete on public.membre_departements to authenticated;

-- Remplace la liste des départements d'un jeune (le premier devient le principal)
create or replace function public.definir_departements(p_membre uuid, p_departements integer[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('membres_gerer') then raise exception 'Action réservée au président'; end if;
  delete from membre_departements where membre_id = p_membre
    and not (departement_id = any (coalesce(p_departements, '{}')));
  insert into membre_departements (membre_id, departement_id)
  select p_membre, d from unnest(coalesce(p_departements, '{}')) d
  where exists (select 1 from departements where id = d)
  on conflict do nothing;
  update membres set departement_id = (coalesce(p_departements, '{}'))[1] where id = p_membre;
end $$;
revoke all on function public.definir_departements(uuid, integer[]) from public, anon;
grant execute on function public.definir_departements(uuid, integer[]) to authenticated;

-- Import Excel : la colonne Département accepte plusieurs noms séparés par « , » « ; » ou « / »
create or replace function public.importer_jeunes(p_lignes jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  l jsonb; i int := 0; ajoutes int := 0; ignores int := 0; erreurs jsonb := '[]';
  v_nom text; v_tel text; v_email text; v_dep int; v_deps int[]; v_d text; v_fon int; v_j int; v_m int; v_anniv text; v_id uuid;
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
      v_deps := '{}'; v_fon := null; v_j := null; v_m := null;
      for v_d in select trim(x) from regexp_split_to_table(coalesce(l->>'departement', ''), '[,;/]') x where trim(x) <> '' loop
        select id into v_dep from departements where lower(nom) = lower(v_d);
        if v_dep is null then raise exception 'département « % » absent de la liste', v_d; end if;
        if not (v_dep = any (v_deps)) then v_deps := v_deps || v_dep; end if;
      end loop;
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
              nullif(trim(coalesce(l->>'profession', '')), ''), nullif(trim(coalesce(l->>'habitation', '')), ''), v_deps[1], v_fon)
      returning id into v_id;
      insert into membre_departements (membre_id, departement_id) select v_id, d from unnest(v_deps) d on conflict do nothing;
      ajoutes := ajoutes + 1;
    exception when others then
      erreurs := erreurs || jsonb_build_object('ligne', i, 'nom', l->>'nom', 'erreur', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('ajoutes', ajoutes, 'ignores', ignores, 'erreurs', erreurs);
end $$;
