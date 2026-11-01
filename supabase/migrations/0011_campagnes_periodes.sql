-- 0011 — Campagnes définies par une période (du … au …) et un rythme de versement :
--        chaque jour, chaque semaine, chaque mois, ou en une fois.
--        Après la date de fin, la campagne reste ouverte (« délai dépassé ») : on peut encore payer.
--        nb_mois garde son nom mais compte désormais le nombre d'échéances (jours, semaines ou mois).

alter table public.campagnes drop constraint if exists campagnes_debut_check;
alter table public.campagnes drop constraint if exists campagnes_nb_mois_check;
alter table public.campagnes add column if not exists fin date;
alter table public.campagnes add column if not exists periode text not null default 'mois';
alter table public.campagnes drop constraint if exists campagnes_periode_check;
alter table public.campagnes add constraint campagnes_periode_check check (periode in ('jour','semaine','mois','unique'));
alter table public.campagnes add constraint campagnes_nb_mois_check check (nb_mois between 1 and 120);

update public.campagnes set fin = (debut + make_interval(months => nb_mois) - interval '1 day')::date where fin is null;
alter table public.campagnes drop constraint if exists campagnes_fin_check;
alter table public.campagnes add constraint campagnes_fin_check check (fin is null or fin >= debut);

-- Libellé de la durée : « 10 mois », « 7 semaines », « 12 jours », « 1 versement unique »
create or replace function public.libelle_duree(n integer, per text) returns text
language sql immutable as $$
  select case per when 'unique' then '1 versement unique'
                  when 'jour' then n || case when n > 1 then ' jours' else ' jour' end
                  when 'semaine' then n || case when n > 1 then ' semaines' else ' semaine' end
                  else n || ' mois' end
$$;
create or replace function public.libelle_periode(per text) returns text
language sql immutable as $$
  select case per when 'jour' then 'Jour' when 'semaine' then 'Semaine' when 'unique' then 'Échéance' else 'Mois' end
$$;

-- Échéance en cours (1..nb_mois) selon le rythme ; après la fin, toutes les échéances sont dues
create or replace function public.mois_courant(c public.campagnes) returns integer
language sql stable as $$
  select case
    when c.statut = 'cloturee' then c.nb_mois
    when c.periode = 'unique' then case when current_date >= coalesce(c.fin, c.debut) then 1 else 0 end
    when c.periode = 'jour' then greatest(0, least(c.nb_mois, (current_date - c.debut) + 1))
    when c.periode = 'semaine' then greatest(0, least(c.nb_mois, floor((current_date - c.debut) / 7.0)::int + 1))
    else greatest(0, least(c.nb_mois,
      (extract(year from age(date_trunc('month', current_date), date_trunc('month', c.debut))) * 12
       + extract(month from age(date_trunc('month', current_date), date_trunc('month', c.debut))))::int + 1)) end
$$;

create or replace function public.trg_campagne() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser('Campagne lancée', format('« %s » — %s, du %s au %s', new.nom, libelle_duree(new.nb_mois, new.periode),
      to_char(new.debut, 'DD/MM/YYYY'), to_char(new.fin, 'DD/MM/YYYY')));
    perform notifier_permission('campagnes_voir', 'campagnes', 'Nouvelle campagne : ' || new.nom,
      libelle_duree(new.nb_mois, new.periode) || coalesce(' · fin le ' || to_char(new.fin, 'DD/MM/YYYY'), ''));
  elsif tg_op = 'UPDATE' then
    if new.statut <> old.statut then
      perform journaliser(case when new.statut = 'cloturee' then 'Campagne clôturée' else 'Campagne rouverte' end, new.nom);
    end if;
    if new.nom <> old.nom or new.nb_mois <> old.nb_mois or new.periode <> old.periode
       or new.debut <> old.debut or new.fin is distinct from old.fin then
      perform journaliser('Campagne modifiée', format('« %s » → « %s », %s (%s → %s) devient %s (%s → %s)', old.nom, new.nom,
        libelle_duree(old.nb_mois, old.periode), to_char(old.debut, 'DD/MM/YYYY'), to_char(old.fin, 'DD/MM/YYYY'),
        libelle_duree(new.nb_mois, new.periode), to_char(new.debut, 'DD/MM/YYYY'), to_char(new.fin, 'DD/MM/YYYY')));
    end if;
  end if;
  return new;
end $$;

-- Relance : le message suit le rythme et signale un délai dépassé
create or replace function public.enregistrer_relance(p_campagne uuid, p_membre uuid, p_canal text) returns void
language plpgsql security definer set search_path = public as $$
declare s record; c record;
begin
  if not has_perm('relances') then raise exception 'Action réservée au bureau'; end if;
  select * into s from v_situations where campagne_id = p_campagne and membre_id = p_membre;
  select * into c from campagnes where id = p_campagne;
  insert into relances (campagne_id, membre_id, canal, par) values (p_campagne, p_membre, p_canal, current_membre());
  insert into notifications (membre_id, type, titre, corps, auteur)
    values (p_membre, 'relances', 'Rappel : ' || c.nom,
            case when c.periode = 'unique' then format('Échéance le %s : tu dois payer %s.', to_char(c.fin, 'DD/MM'), fmt_fcfa(greatest(s.retard, s.reste)))
                 else format('%s %s/%s : tu dois payer %s pour être à jour.', libelle_periode(c.periode), s.mois_courant, s.nb_mois, fmt_fcfa(greatest(s.retard, 0))) end
            || case when c.fin is not null and current_date > c.fin and c.statut = 'en_cours'
                    then ' Le délai (' || to_char(c.fin, 'DD/MM/YYYY') || ') est dépassé, mais tu peux encore payer.' else '' end,
            current_membre());
  perform journaliser('Relance envoyée', format('%s — %s (%s)', nom_complet(p_membre), c.nom, p_canal));
end $$;

-- Ancienne version de l'appli (sans dates) : la date de fin est déduite du nombre de mois
create or replace function public.trg_campagne_fin() returns trigger
language plpgsql as $$
begin
  if new.fin is null then
    new.fin := case new.periode when 'jour' then new.debut + new.nb_mois - 1
                                when 'semaine' then new.debut + 7 * new.nb_mois - 1
                                when 'unique' then new.debut
                                else (date_trunc('month', new.debut) + make_interval(months => new.nb_mois) - interval '1 day')::date end;
  end if;
  return new;
end $$;
drop trigger if exists campagnes_fin on public.campagnes;
create trigger campagnes_fin before insert or update on public.campagnes
  for each row execute function public.trg_campagne_fin();
