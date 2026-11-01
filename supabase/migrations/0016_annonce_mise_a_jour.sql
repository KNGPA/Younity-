-- 0016 — Annonce d'une nouvelle version : une notification « Mise à jour disponible » à chaque compte actif
--        (arrive aussi sur les téléphones). Appelée au moment de publier une mise à jour importante.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('messages','paiements','campagnes','relances','anniversaires','evenements','taches','maj'));

create table if not exists public.versions_annoncees (version text primary key, texte text, le timestamptz not null default now());
alter table public.versions_annoncees enable row level security;

create or replace function public.annoncer_mise_a_jour(p_version text, p_texte text default '') returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is not null and not is_president() then raise exception 'Action réservée au président'; end if;
  insert into versions_annoncees (version, texte) values (p_version, p_texte) on conflict (version) do nothing;
  if not found then return 0; end if;
  insert into notifications (membre_id, type, titre, corps)
    select c.membre_id, 'maj', 'Mise à jour disponible : Younity ' || p_version,
           coalesce(nullif(trim(p_texte), ''), 'Touche pour installer la nouvelle version.')
    from comptes c join membres m on m.id = c.membre_id where c.actif and m.actif;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.annoncer_mise_a_jour(text, text) from public, anon, authenticated;
