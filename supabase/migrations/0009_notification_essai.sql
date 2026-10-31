-- Younity — 0009 : notification d'essai (bouton « Tester » dans Mon profil)
create or replace function public.notification_essai() returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_membre() is null then raise exception 'Non connecté'; end if;
  if exists (select 1 from notifications where membre_id = current_membre() and titre = 'Notification d''essai ✅'
             and cree_le > now() - interval '30 seconds') then return; end if;   -- anti-répétition
  insert into notifications (membre_id, type, titre, corps)
  values (current_membre(), 'messages', 'Notification d''essai ✅', 'Les notifications Younity arrivent bien sur ce téléphone.');
end $$;
revoke all on function public.notification_essai() from public, anon;
grant execute on function public.notification_essai() to authenticated;
