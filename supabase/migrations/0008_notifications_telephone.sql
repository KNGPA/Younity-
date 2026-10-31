-- =====================================================================
-- Younity — 0008 : notifications sur le téléphone (Web Push)
--   Chaque notification créée dans la base est aussi envoyée sur les
--   téléphones de la personne (Android, et iPhone avec iOS 16.4+ quand
--   Younity est ajoutée à l'écran d'accueil), si elle l'a autorisé et
--   si ce type de notification est activé dans son profil.
--   Les clés (VAPID) sont rangées dans reglages_serveur, jamais dans ce fichier.
-- =====================================================================
create extension if not exists pg_net with schema extensions;

-- Réglages réservés au serveur (aucun accès depuis l'application)
create table if not exists public.reglages_serveur (cle text primary key, valeur text not null);
alter table public.reglages_serveur enable row level security;
revoke all on public.reglages_serveur from anon, authenticated;

-- Clé publique VAPID : la seule que l'application a besoin de connaître
create or replace function public.cle_push_publique() returns text
language sql stable security definer set search_path = public as $$
  select valeur from reglages_serveur where cle = 'vapid_public'
$$;
grant execute on function public.cle_push_publique() to anon, authenticated;

-- Téléphones abonnés (un jeune peut en avoir plusieurs)
create table if not exists public.push_abonnements (
  endpoint   text primary key,
  membre_id  uuid not null references public.membres(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  appareil   text not null default '',
  cree_le    timestamptz not null default now(),
  vu_le      timestamptz not null default now()
);
create index if not exists push_abonnements_membre_idx on public.push_abonnements (membre_id);
alter table public.push_abonnements enable row level security;
create policy lire on public.push_abonnements for select to authenticated using (user_id = auth.uid());
grant select on public.push_abonnements to authenticated;

create or replace function public.enregistrer_abonnement(p_endpoint text, p_p256dh text, p_auth text, p_appareil text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_membre() is null then raise exception 'Non connecté'; end if;
  insert into push_abonnements (endpoint, membre_id, user_id, p256dh, auth, appareil)
  values (p_endpoint, current_membre(), auth.uid(), p_p256dh, p_auth, left(coalesce(p_appareil, ''), 200))
  on conflict (endpoint) do update set membre_id = excluded.membre_id, user_id = excluded.user_id,
    p256dh = excluded.p256dh, auth = excluded.auth, appareil = excluded.appareil, vu_le = now();
end $$;
create or replace function public.supprimer_abonnement(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_abonnements where endpoint = p_endpoint and user_id = auth.uid()
$$;
revoke all on function public.enregistrer_abonnement(text, text, text, text), public.supprimer_abonnement(text) from public, anon;
grant execute on function public.enregistrer_abonnement(text, text, text, text), public.supprimer_abonnement(text) to authenticated;

-- À chaque nouvelle notification : on demande au serveur de l'envoyer sur les téléphones
create or replace function public.trg_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare s text;
begin
  if not exists (select 1 from push_abonnements where membre_id = new.membre_id) then return new; end if;
  select valeur into s from reglages_serveur where cle = 'push_hook_secret';
  if s is null then return new; end if;
  perform net.http_post(
    url := 'https://zrnhsdtpfyjlvrgrmssf.supabase.co/functions/v1/envoyer-push',
    body := jsonb_build_object('id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', s),
    timeout_milliseconds := 10000);
  return new;
exception when others then
  return new;   -- une panne d'envoi ne doit jamais bloquer l'application
end $$;
drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.trg_push();
