-- =====================================================================
-- Younity — 0003 : affiches, événements, rôle « Organisateur »
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nouvelles permissions et rôle Organisateur
--    affiches_gerer    : publier les affiches (visuels) qui défilent dans l'appli
--    evenements_gerer  : créer / modifier / annuler les événements, gérer
--                        les participants, les tâches et les rappels
-- ---------------------------------------------------------------------
update public.roles set permissions = permissions || array['affiches_gerer','evenements_gerer']
 where id = 'president' and not ('evenements_gerer' = any(permissions));

insert into public.roles (id, nom, systeme, permissions) values
  ('organisateur', 'Organisateur', false, array['membres_voir','evenements_gerer','exports'])
on conflict (id) do nothing;

-- Nouveau type de notification « événements »
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('messages','paiements','campagnes','relances','anniversaires','evenements'));
alter table public.comptes alter column prefs
  set default '{"messages":true,"paiements":true,"campagnes":true,"relances":true,"anniversaires":true,"evenements":true}';
update public.comptes set prefs = prefs || '{"evenements":true}' where not prefs ? 'evenements';

-- ---------------------------------------------------------------------
-- 2. Événements
-- ---------------------------------------------------------------------
create table public.evenements (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null check (length(trim(titre)) > 0),
  description  text not null default '',
  categorie    text not null default 'Autre'
               check (categorie in ('Culte','Réunion','Sortie','Formation','Action sociale','Célébration','Autre')),
  debut        timestamptz not null,
  fin          timestamptz,
  lieu         text not null default '',
  image        text,                                   -- chemin dans le stockage « visuels »
  responsable  uuid references public.membres(id) on delete set null,   -- organisateur en charge
  inscription  boolean not null default true,         -- les jeunes peuvent répondre « je participe »
  annule       boolean not null default false,
  motif_annulation text,
  cree_par     uuid references public.membres(id) on delete set null,
  cree_le      timestamptz not null default now(),
  check (fin is null or fin >= debut)
);
create index evenements_debut_idx on public.evenements (debut);

-- Réponse de chaque jeune + présence pointée le jour J par l'organisateur
create table public.evenement_participants (
  evenement_id uuid not null references public.evenements(id) on delete cascade,
  membre_id    uuid not null references public.membres(id) on delete cascade,
  reponse      text check (reponse in ('oui','peut_etre','non')),
  present      boolean,                                -- null = pas encore pointé
  maj_le       timestamptz not null default now(),
  primary key (evenement_id, membre_id)
);

-- Liste de tâches de l'organisation (qui fait quoi)
create table public.evenement_taches (
  id           bigserial primary key,
  evenement_id uuid not null references public.evenements(id) on delete cascade,
  libelle      text not null check (length(trim(libelle)) > 0),
  responsable  uuid references public.membres(id) on delete set null,
  echeance     date,
  faite        boolean not null default false,
  cree_le      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Affiches (visuels qui défilent en haut de l'accueil)
-- ---------------------------------------------------------------------
create table public.affiches (
  id           uuid primary key default gen_random_uuid(),
  titre        text not null default '',
  image        text not null,                          -- chemin dans le stockage « visuels »
  lien         text,                                   -- lien facultatif (ex. formulaire, live)
  evenement_id uuid references public.evenements(id) on delete set null,  -- ouvre l'événement au toucher
  debut        date not null default current_date,     -- affichée à partir de…
  fin          date,                                   -- …jusqu'au (inclus) ; vide = sans limite
  ordre        integer not null default 0,
  actif        boolean not null default true,
  cree_par     uuid references public.membres(id) on delete set null,
  cree_le      timestamptz not null default now(),
  check (fin is null or fin >= debut)
);

-- ---------------------------------------------------------------------
-- 4. Notifications et journal automatiques
-- ---------------------------------------------------------------------
create or replace function public.notifier_tous(p_type text, p_titre text, p_corps text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (membre_id, type, titre, corps, auteur)
  select c.membre_id, p_type, p_titre, p_corps, auteur_actuel()
  from comptes c join membres m on m.id = c.membre_id
  where c.actif and m.actif and c.membre_id is distinct from auteur_actuel()
$$;
revoke execute on function public.notifier_tous(text, text, text) from public, anon, authenticated;

create or replace function public.fmt_date_evt(d timestamptz) returns text
language sql stable as $$
  select to_char(d at time zone 'Africa/Abidjan', 'DD/MM/YYYY "à" HH24"h"MI')
$$;

create or replace function public.trg_evenement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser('Événement créé', new.titre || ' — ' || fmt_date_evt(new.debut));
    perform notifier_tous('evenements', 'Nouvel événement : ' || new.titre,
      fmt_date_evt(new.debut) || coalesce(nullif(' · ' || new.lieu, ' · '), ''));
  elsif new.annule and not old.annule then
    perform journaliser('Événement annulé', new.titre || coalesce(' — motif : ' || new.motif_annulation, ''));
    perform notifier_tous('evenements', 'Événement annulé : ' || new.titre, coalesce(new.motif_annulation, ''));
  elsif (new.debut, new.lieu) is distinct from (old.debut, old.lieu) then
    perform journaliser('Événement modifié', new.titre);
    perform notifier_tous('evenements', 'Changement : ' || new.titre,
      'Nouvelle date : ' || fmt_date_evt(new.debut) || coalesce(nullif(' · ' || new.lieu, ' · '), ''));
  elsif row(new.*) is distinct from row(old.*) then
    perform journaliser('Événement modifié', new.titre);
  end if;
  return new;
end $$;
create trigger evenements_apres after insert or update on public.evenements
  for each row execute function public.trg_evenement();

create or replace function public.trg_affiche() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then perform journaliser('Affiche publiée', coalesce(nullif(new.titre, ''), 'Sans titre'));
  elsif tg_op = 'DELETE' then perform journaliser('Affiche retirée', coalesce(nullif(old.titre, ''), 'Sans titre')); return old;
  end if;
  return new;
end $$;
create trigger affiches_apres after insert or delete on public.affiches
  for each row execute function public.trg_affiche();

-- ---------------------------------------------------------------------
-- 5. Actions
-- ---------------------------------------------------------------------
-- Un jeune répond à une invitation
create or replace function public.repondre_evenement(p_evt uuid, p_reponse text) returns void
language plpgsql security definer set search_path = public as $$
declare moi uuid := current_membre(); e evenements;
begin
  if moi is null then raise exception 'Non connecté'; end if;
  select * into e from evenements where id = p_evt;
  if not found or e.annule then raise exception 'Événement introuvable ou annulé'; end if;
  if not e.inscription then raise exception 'Pas d''inscription pour cet événement'; end if;
  if coalesce(e.fin, e.debut) < now() then raise exception 'Cet événement est terminé'; end if;
  if p_reponse not in ('oui','peut_etre','non') then raise exception 'Réponse invalide'; end if;
  insert into evenement_participants (evenement_id, membre_id, reponse) values (p_evt, moi, p_reponse)
  on conflict (evenement_id, membre_id) do update set reponse = excluded.reponse, maj_le = now();
end $$;

-- L'organisateur pointe la présence (le jour J)
create or replace function public.pointer_presence(p_evt uuid, p_membre uuid, p_present boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('evenements_gerer') then raise exception 'Action réservée aux organisateurs'; end if;
  insert into evenement_participants (evenement_id, membre_id, present) values (p_evt, p_membre, p_present)
  on conflict (evenement_id, membre_id) do update set present = excluded.present, maj_le = now();
end $$;

-- L'organisateur envoie un rappel : à ceux qui ont répondu oui / peut-être, ou à tous
create or replace function public.rappel_evenement(p_evt uuid, p_tous boolean, p_message text) returns integer
language plpgsql security definer set search_path = public as $$
declare e evenements; n integer;
begin
  if not has_perm('evenements_gerer') then raise exception 'Action réservée aux organisateurs'; end if;
  select * into e from evenements where id = p_evt;
  if not found then raise exception 'Événement introuvable'; end if;
  insert into notifications (membre_id, type, titre, corps, auteur)
  select c.membre_id, 'evenements', 'Rappel : ' || e.titre,
         coalesce(nullif(trim(p_message), ''), fmt_date_evt(e.debut) || coalesce(nullif(' · ' || e.lieu, ' · '), '')),
         current_membre()
  from comptes c join membres m on m.id = c.membre_id
  where c.actif and m.actif and (p_tous or exists (select 1 from evenement_participants p
        where p.evenement_id = p_evt and p.membre_id = c.membre_id and p.reponse in ('oui','peut_etre')));
  get diagnostics n = row_count;
  perform journaliser('Rappel d''événement', format('%s — %s personne(s)', e.titre, n));
  return n;
end $$;

-- Bilan d'un événement (réponses et présences)
create or replace view public.v_evenements_bilan with (security_invoker = true) as
select e.id, e.titre, e.debut, e.annule,
  count(*) filter (where p.reponse = 'oui')       as oui,
  count(*) filter (where p.reponse = 'peut_etre') as peut_etre,
  count(*) filter (where p.reponse = 'non')       as non,
  count(*) filter (where p.present)               as presents,
  (select count(*) from evenement_taches t where t.evenement_id = e.id)            as taches,
  (select count(*) from evenement_taches t where t.evenement_id = e.id and t.faite) as taches_faites
from evenements e left join evenement_participants p on p.evenement_id = e.id
group by e.id;

-- ---------------------------------------------------------------------
-- 6. Règles d'accès
-- ---------------------------------------------------------------------
alter table public.evenements enable row level security;
alter table public.evenement_participants enable row level security;
alter table public.evenement_taches enable row level security;
alter table public.affiches enable row level security;

-- Tout jeune connecté voit les événements ; les organisateurs (et le président) les gèrent
create policy lire on public.evenements for select to authenticated using (current_membre() is not null);
create policy gerer on public.evenements for all to authenticated
  using (has_perm('evenements_gerer')) with check (has_perm('evenements_gerer'));

-- Chacun voit sa réponse ; les organisateurs voient tout. Écriture via les fonctions ci-dessus.
create policy lire on public.evenement_participants for select to authenticated
  using (membre_id = current_membre() or has_perm('evenements_gerer'));

-- Tâches : les organisateurs gèrent ; chacun voit les tâches qui lui sont confiées
create policy lire on public.evenement_taches for select to authenticated
  using (has_perm('evenements_gerer') or responsable = current_membre());
create policy gerer on public.evenement_taches for all to authenticated
  using (has_perm('evenements_gerer')) with check (has_perm('evenements_gerer'));

-- Affiches : visibles par tous pendant leur période ; gérées par qui a la permission
create policy lire on public.affiches for select to authenticated using (
  has_perm('affiches_gerer')
  or (current_membre() is not null and actif and debut <= current_date and (fin is null or fin >= current_date)));
create policy gerer on public.affiches for all to authenticated
  using (has_perm('affiches_gerer')) with check (has_perm('affiches_gerer'));

grant select, insert, update, delete on public.evenements, public.evenement_participants,
  public.evenement_taches, public.affiches to authenticated;
grant usage, select on sequence public.evenement_taches_id_seq to authenticated;
grant select on public.v_evenements_bilan to authenticated;
revoke all on function public.repondre_evenement(uuid, text) from public, anon;
revoke all on function public.pointer_presence(uuid, uuid, boolean) from public, anon;
revoke all on function public.rappel_evenement(uuid, boolean, text) from public, anon;
grant execute on function public.repondre_evenement(uuid, text), public.pointer_presence(uuid, uuid, boolean),
  public.rappel_evenement(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Stockage des images (affiches et visuels d'événements)
--    Bucket public « visuels » : lecture libre (les images s'affichent vite),
--    dépôt / suppression réservés à ceux qui gèrent affiches ou événements.
--    Taille max 5 Mo, formats JPG / PNG / WEBP.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visuels', 'visuels', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "visuels : déposer" on storage.objects for insert to authenticated
  with check (bucket_id = 'visuels' and (public.has_perm('affiches_gerer') or public.has_perm('evenements_gerer')));
create policy "visuels : remplacer" on storage.objects for update to authenticated
  using (bucket_id = 'visuels' and (public.has_perm('affiches_gerer') or public.has_perm('evenements_gerer')));
create policy "visuels : supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'visuels' and (public.has_perm('affiches_gerer') or public.has_perm('evenements_gerer')));
