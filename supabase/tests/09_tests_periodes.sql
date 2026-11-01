\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Campagnes par période'
reset role;
insert into campagnes (nom, nb_mois, debut, fin, periode) values
  ('P semaines', 4, current_date - 14, current_date + 13, 'semaine'),
  ('P jours', 10, current_date - 2, current_date + 7, 'jour'),
  ('P unique future', 1, current_date - 2, current_date + 5, 'unique'),
  ('P unique passée', 1, current_date - 10, current_date - 1, 'unique'),
  ('P mois depassee', 2, (date_trunc('month', current_date) - interval '3 months')::date, (date_trunc('month', current_date) - interval '1 month' - interval '1 day')::date, 'mois');
select t_ok(mois_courant(c) = 3, 'semaine 3 en cours (début il y a 14 jours)') from campagnes c where nom='P semaines';
select t_ok(mois_courant(c) = 3, 'jour 3 en cours') from campagnes c where nom='P jours';
select t_ok(mois_courant(c) = 0, 'versement unique : rien de dû avant la date de fin') from campagnes c where nom='P unique future';
select t_ok(mois_courant(c) = 1, 'versement unique : dû après la date de fin') from campagnes c where nom='P unique passée';
select t_ok(mois_courant(c) = 2 and statut = 'en_cours', 'délai dépassé : tout est dû mais la campagne reste ouverte') from campagnes c where nom='P mois depassee';
select t_ok(libelle_duree(7,'semaine') = '7 semaines' and libelle_duree(1,'unique') = '1 versement unique', 'libellés de durée');
do $$ begin insert into campagnes (nom, nb_mois, debut, fin) values ('Bad', 1, current_date, current_date - 1); raise exception 'aurait dû échouer';
exception when check_violation then perform t_ok(true, 'fin avant début refusée'); end $$;
select t_ok((select count(*) from campagnes where fin is null) = 0, 'toutes les campagnes ont une date de fin');
