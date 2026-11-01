-- 0012 — Contacts de ceux qui encaissent (trésorière d'abord, puis président) pour le bouton « Payer ma cotisation ».
--        Seuls le prénom/nom, le rôle et le téléphone sont renvoyés, et seulement aux jeunes connectés.
create or replace function public.contacts_paiement() returns table (role text, nom text, tel text)
language sql stable security definer set search_path = public as $$
  select r.nom, trim(m.nom || ' ' || coalesce(m.prenoms, '')), m.tel
  from comptes c join roles r on r.id = c.role_id join membres m on m.id = c.membre_id
  where current_membre() is not null and c.actif and m.actif
    and (c.role_id in ('tresorier', 'president') or 'paiements_valider' = any (r.permissions))
  order by case c.role_id when 'tresorier' then 0 when 'president' then 2 else 1 end, m.nom
$$;
revoke all on function public.contacts_paiement() from public, anon;
grant execute on function public.contacts_paiement() to authenticated;
