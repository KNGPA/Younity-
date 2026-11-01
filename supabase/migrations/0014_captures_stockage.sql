-- 0014 — Espace PRIVÉ pour les captures de paiement : seul le jeune concerné et la trésorerie y ont accès.
--        Chemin : <membre_id>/<fichier>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('captures', 'captures', false, 3145728, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "captures : déposer" on storage.objects;
drop policy if exists "captures : voir" on storage.objects;
create policy "captures : déposer" on storage.objects for insert to authenticated
  with check (bucket_id = 'captures' and ((storage.foldername(name))[1] = public.current_membre()::text or public.has_perm('paiements_valider')));
create policy "captures : voir" on storage.objects for select to authenticated
  using (bucket_id = 'captures' and ((storage.foldername(name))[1] = public.current_membre()::text or public.has_perm('paiements_valider')));
