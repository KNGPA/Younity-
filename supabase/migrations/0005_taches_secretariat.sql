-- =====================================================================
-- Younity — 0005 : tâches et rappels du secrétariat
--   La secrétaire note ce qui a été décidé en réunion, à qui c'est confié
--   (une ou plusieurs personnes, ou toute la jeunesse), avant quand,
--   et envoie des rappels. Les personnes concernées sont notifiées.
-- =====================================================================
update public.roles set permissions = permissions || array['suivi_taches']
 where id in ('president','secretaire') and not ('suivi_taches' = any(permissions));

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('messages','paiements','campagnes','relances','anniversaires','evenements','taches'));
update public.comptes set prefs = prefs || '{"taches":true}' where not prefs ? 'taches';
alter table public.comptes alter column prefs set default
  '{"messages":true,"paiements":true,"campagnes":true,"relances":true,"anniversaires":true,"evenements":true,"taches":true}';

create table public.taches (
  id         uuid primary key default gen_random_uuid(),
  titre      text not null check (length(trim(titre)) > 0),
  details    text not null default '',
  origine    text not null default '',          -- Réunion du bureau, Réunion de la jeunesse, Décidé par le président, … ou texte libre
  date_origine date check (date_origine <= current_date),   -- date de la réunion / de la décision / de l'échange
  echeance   date,
  pour_tous  boolean not null default false,    -- toute la jeunesse
  faite      boolean not null default false,
  faite_le   timestamptz,
  cree_par   uuid references public.membres(id) on delete set null,
  cree_le    timestamptz not null default now()
);
create table public.tache_personnes (
  tache_id  uuid not null references public.taches(id) on delete cascade,
  membre_id uuid not null references public.membres(id) on delete cascade,
  primary key (tache_id, membre_id)
);
create table public.tache_rappels (
  id        bigserial primary key,
  tache_id  uuid not null references public.taches(id) on delete cascade,
  canal     text not null check (canal in ('appli','whatsapp','sms','groupe')),
  par       uuid references public.membres(id) on delete set null,
  le        timestamptz not null default now()
);

-- Destinataires d'une tâche (comptes actifs)
create or replace function public.destinataires_tache(p_tache uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select c.membre_id from comptes c join membres m on m.id = c.membre_id, taches t
  where t.id = p_tache and c.actif and m.actif
    and (t.pour_tous or exists (select 1 from tache_personnes tp where tp.tache_id = t.id and tp.membre_id = c.membre_id))
$$;
revoke all on function public.destinataires_tache(uuid) from public, anon, authenticated;

-- Enregistrer (créer ou modifier) une tâche et prévenir les personnes concernées
create or replace function public.enregistrer_tache(p_id uuid, p_titre text, p_details text, p_origine text,
  p_date_origine date, p_echeance date, p_pour_tous boolean, p_personnes uuid[]) returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid := p_id; nouveau boolean := p_id is null;
begin
  if not has_perm('suivi_taches') then raise exception 'Action réservée au secrétariat'; end if;
  if coalesce(trim(p_titre), '') = '' then raise exception 'Écris ce qu''il faut faire.'; end if;
  if not p_pour_tous and coalesce(array_length(p_personnes, 1), 0) = 0 then
    raise exception 'Choisis au moins une personne, ou « Toute la jeunesse ».';
  end if;
  if nouveau then
    insert into taches (titre, details, origine, date_origine, echeance, pour_tous, cree_par)
    values (trim(p_titre), coalesce(p_details, ''), coalesce(p_origine, ''), coalesce(p_date_origine, current_date), p_echeance, p_pour_tous, current_membre())
    returning id into tid;
  else
    update taches set titre = trim(p_titre), details = coalesce(p_details, ''), origine = coalesce(p_origine, ''),
                      date_origine = coalesce(p_date_origine, date_origine), echeance = p_echeance, pour_tous = p_pour_tous where id = tid;
    if not found then raise exception 'Tâche introuvable'; end if;
    delete from tache_personnes where tache_id = tid;
  end if;
  if not p_pour_tous then
    insert into tache_personnes (tache_id, membre_id) select tid, unnest(p_personnes) on conflict do nothing;
  end if;
  insert into notifications (membre_id, type, titre, corps, auteur)
  select d, 'taches',
         case when not nouveau then 'Tâche mise à jour : ' when p_pour_tous then 'Pour toute la jeunesse : ' else 'Nouvelle tâche pour toi : ' end || trim(p_titre),
         concat_ws(' · ', 'À faire avant le ' || to_char(p_echeance, 'DD/MM/YYYY'),
           nullif(p_origine, '') || coalesce(case when p_origine like 'Réunion%' then ' du ' else ' le ' end || to_char(coalesce(p_date_origine, current_date), 'DD/MM/YYYY'), '')),
         current_membre()
  from destinataires_tache(tid) d where d is distinct from current_membre();
  perform journaliser(case when nouveau then 'Tâche notée' else 'Tâche modifiée' end, trim(p_titre));
  return tid;
end $$;

create or replace function public.tache_faite(p_id uuid, p_faite boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not has_perm('suivi_taches') then raise exception 'Action réservée au secrétariat'; end if;
  update taches set faite = p_faite, faite_le = case when p_faite then now() end where id = p_id;
  if p_faite then perform journaliser('Tâche terminée', (select titre from taches where id = p_id)); end if;
end $$;

-- Rappel dans l'appli (canal 'appli') ou trace d'un rappel WhatsApp / SMS / groupe
create or replace function public.rappel_tache(p_id uuid, p_canal text, p_message text, p_membre uuid default null) returns integer
language plpgsql security definer set search_path = public as $$
declare t taches; n int := 0;
begin
  if not has_perm('suivi_taches') then raise exception 'Action réservée au secrétariat'; end if;
  select * into t from taches where id = p_id;
  if not found then raise exception 'Tâche introuvable'; end if;
  if p_canal = 'appli' then
    insert into notifications (membre_id, type, titre, corps, auteur)
    select d, 'taches', 'Rappel : ' || t.titre, coalesce(nullif(trim(p_message), ''), t.titre), current_membre()
    from destinataires_tache(p_id) d where p_membre is null or d = p_membre;
    get diagnostics n = row_count;
  end if;
  insert into tache_rappels (tache_id, canal, par) values (p_id, p_canal, current_membre());
  perform journaliser('Rappel envoyé', format('%s (%s)', t.titre, p_canal));
  return n;
end $$;

alter table public.taches enable row level security;
alter table public.tache_personnes enable row level security;
alter table public.tache_rappels enable row level security;
create policy lire on public.taches for select to authenticated using (
  has_perm('suivi_taches') or (current_membre() is not null and (pour_tous
    or exists (select 1 from tache_personnes tp where tp.tache_id = id and tp.membre_id = current_membre()))));
create policy lire on public.tache_personnes for select to authenticated using (has_perm('suivi_taches') or membre_id = current_membre());
create policy lire on public.tache_rappels for select to authenticated using (has_perm('suivi_taches'));
create policy supprimer on public.taches for delete to authenticated using (has_perm('suivi_taches'));
grant select, delete on public.taches to authenticated;
grant select on public.tache_personnes, public.tache_rappels to authenticated;
revoke all on function public.enregistrer_tache(uuid, text, text, text, date, date, boolean, uuid[]) from public, anon;
revoke all on function public.tache_faite(uuid, boolean) from public, anon;
revoke all on function public.rappel_tache(uuid, text, text, uuid) from public, anon;
grant execute on function public.enregistrer_tache(uuid, text, text, text, date, date, boolean, uuid[]),
  public.tache_faite(uuid, boolean), public.rappel_tache(uuid, text, text, uuid) to authenticated;

-- La secrétaire peut aussi rappeler une activité (événement) à la jeunesse
create or replace function public.rappel_evenement(p_evt uuid, p_tous boolean, p_message text) returns integer
language plpgsql security definer set search_path = public as $$
declare e evenements; n integer;
begin
  if not (has_perm('evenements_gerer') or has_perm('suivi_taches')) then raise exception 'Action réservée aux organisateurs et au secrétariat'; end if;
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
