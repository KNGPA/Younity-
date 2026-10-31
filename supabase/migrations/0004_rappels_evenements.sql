-- =====================================================================
-- Younity — 0004 : rappels automatiques des événements
--   J-7 (ou dès la semaine de l'événement) : tous les jeunes
--   Veille (J-1)  : tous, sauf ceux qui ont répondu « Absent »
--   Jour J        : ceux qui ont répondu « Je participe » ou « Peut-être »
--   + le responsable reçoit la veille et le jour J le point participants / tâches.
--   Chaque rappel n'est envoyé qu'une fois (table evenement_rappels).
--   Toute modification d'un événement prévient aussi tout le monde.
-- =====================================================================
create table public.evenement_rappels (
  evenement_id uuid not null references public.evenements(id) on delete cascade,
  etape        text not null check (etape in ('j7','j1','jj')),
  envoye_le    timestamptz not null default now(),
  primary key (evenement_id, etape)
);
alter table public.evenement_rappels enable row level security;   -- aucune lecture depuis l'appli

create or replace function public.rappels_evenements_auto() returns integer
language plpgsql security definer set search_path = public as $$
declare e evenements; d int; st text; quand text; n int := 0; k int; t_rest int; c_oui int; c_pe int;
begin
  for e in select * from evenements where not annule and coalesce(fin, debut)::date >= (now() at time zone 'Africa/Abidjan')::date loop
    d := (e.debut at time zone 'Africa/Abidjan')::date - (now() at time zone 'Africa/Abidjan')::date;
    st := case when d = 0 then 'jj' when d = 1 then 'j1' when d between 2 and 7 then 'j7' end;
    continue when st is null;
    insert into evenement_rappels (evenement_id, etape) values (e.id, st) on conflict do nothing;
    get diagnostics k = row_count;
    continue when k = 0;                                  -- déjà envoyé
    quand := fmt_date_evt(e.debut) || coalesce(nullif(' · ' || e.lieu, ' · '), '');
    insert into notifications (membre_id, type, titre, corps)
    select c.membre_id, 'evenements',
           case st when 'j7' then format('Dans %s jours : %s', d, e.titre)
                   when 'j1' then 'Demain : ' || e.titre
                   else 'C''est aujourd''hui : ' || e.titre end,
           quand || case when st = 'j7' and e.inscription then ' — dis-nous si tu viens !'
                         when st = 'jj' then ' — on t''attend !' else '' end
    from comptes c join membres m on m.id = c.membre_id
    left join evenement_participants p on p.evenement_id = e.id and p.membre_id = c.membre_id
    where c.actif and m.actif
      and (st = 'j7'
        or (st = 'j1' and p.reponse is distinct from 'non')
        or (st = 'jj' and p.reponse in ('oui','peut_etre')));
    get diagnostics k = row_count; n := n + k;
    if st <> 'j7' and e.responsable is not null then
      select count(*) filter (where not faite) into t_rest from evenement_taches where evenement_id = e.id;
      select count(*) filter (where reponse = 'oui'), count(*) filter (where reponse = 'peut_etre')
        into c_oui, c_pe from evenement_participants where evenement_id = e.id;
      insert into notifications (membre_id, type, titre, corps)
      values (e.responsable, 'evenements',
              (case st when 'jj' then 'Aujourd''hui : ' else 'Demain : ' end) || e.titre || ' (tu organises)',
              format('%s participent, %s peut-être', c_oui, c_pe)
              || case when t_rest > 0 then format(' · %s tâche(s) pas encore faite(s)', t_rest) else ' · toutes les tâches sont faites' end);
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.rappels_evenements_auto() from public, anon, authenticated;
grant execute on function public.rappels_evenements_auto() to service_role;

-- Toute modification prévient tout le monde (date / lieu, ou autre changement)
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
  elsif (new.titre, new.description, new.categorie, new.debut, new.fin, new.lieu, new.image)
        is distinct from (old.titre, old.description, old.categorie, old.debut, old.fin, old.lieu, old.image) then
    perform journaliser('Événement modifié', new.titre);
    perform notifier_tous('evenements',
      case when (new.debut, new.fin, new.lieu) is distinct from (old.debut, old.fin, old.lieu)
           then 'Changement de date ou de lieu : ' else 'Événement mis à jour : ' end || new.titre,
      fmt_date_evt(new.debut) || coalesce(nullif(' · ' || new.lieu, ' · '), ''));
    -- si la date change, les rappels repartent de zéro
    if new.debut is distinct from old.debut then delete from evenement_rappels where evenement_id = new.id; end if;
  end if;
  return new;
end $$;

-- Planification : chaque matin à 7h (heure d'Abidjan = UTC), si pg_cron est disponible (c'est le cas sur Supabase)
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('cotijes-rappels-evenements', '0 7 * * *', 'select public.rappels_evenements_auto()');
  end if;
end $$;
