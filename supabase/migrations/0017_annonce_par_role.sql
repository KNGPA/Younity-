-- 0017 — Annonce de mise à jour ciblée : seulement les rôles concernés (ex. {tresorier,president}).
--        Sans liste de rôles : tout le monde.
drop function if exists public.annoncer_mise_a_jour(text, text);
create or replace function public.annoncer_mise_a_jour(p_version text, p_texte text default '', p_roles text[] default null) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is not null and not is_president() then raise exception 'Action réservée au président'; end if;
  insert into versions_annoncees (version, texte) values (p_version, p_texte) on conflict (version) do nothing;
  if not found then return 0; end if;
  insert into notifications (membre_id, type, titre, corps)
    select c.membre_id, 'maj', 'Mise à jour disponible : Younity ' || p_version,
           coalesce(nullif(trim(p_texte), ''), 'Touche pour installer la nouvelle version.')
    from comptes c join membres m on m.id = c.membre_id
    where c.actif and m.actif and (p_roles is null or cardinality(p_roles) = 0 or c.role_id = any (p_roles));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.annoncer_mise_a_jour(text, text, text[]) from public, anon, authenticated;
