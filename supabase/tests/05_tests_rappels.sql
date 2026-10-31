\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Rappels automatiques'
-- 3 événements : demain, dans 5 jours, aujourd'hui (créés par le président)
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into evenements (titre, debut, responsable) values
 ('Evt demain', now() + interval '1 day', (select id from membres where nom='MEMBRE TEST C')),
 ('Evt semaine', now() + interval '5 days', null),
 ('Evt jour', date_trunc('day', now()) + interval '23 hours', null);
reset role;
-- MEMBRE TEST A : absent demain, participe aujourd'hui
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select repondre_evenement((select id from evenements where titre='Evt demain'), 'non');
select repondre_evenement((select id from evenements where titre='Evt jour'), 'oui');
reset role;
set role service_role; select set_config('request.jwt.claim.sub','',false);
select t_ok(rappels_evenements_auto() > 0, 'les rappels du matin partent');
select t_ok(rappels_evenements_auto() = 0, 'relancé : rien n''est envoyé deux fois');
reset role;
select t_ok((select count(*) from notifications n join membres m on m.id=n.membre_id where m.nom='MEMBRE TEST A' and titre = 'Demain : Evt demain') = 0, 'veille : pas de rappel à qui a dit « Absent »');
select t_ok((select count(*) from notifications where titre = 'Demain : Evt demain') >= 3, 'veille : les autres sont rappelés');
select t_ok((select count(*) from notifications where titre like 'Dans 5 jours : Evt semaine') >= 4, 'semaine : tout le monde est rappelé');
select t_ok((select count(*) from notifications where titre like 'C''est aujourd''hui : Evt jour') = 1, 'jour J : seulement ceux qui viennent');
select t_ok((select count(*) from notifications where titre like 'Demain : Evt demain (tu organises)') = 1, 'le responsable reçoit le point participants / tâches');
-- modification → tout le monde prévenu, et rappels remis à zéro si la date change
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
update evenements set debut = debut + interval '1 day' where titre = 'Evt demain';
update evenements set description = 'Apportez vos Bibles' where titre = 'Evt semaine';
reset role;
select t_ok((select count(*) from notifications where titre like 'Changement de date ou de lieu : Evt demain') >= 3, 'changement de date : tout le monde prévenu');
select t_ok((select count(*) from notifications where titre like 'Événement mis à jour : Evt semaine') >= 3, 'autre modification : tout le monde prévenu');
select t_ok((select count(*) from evenement_rappels r join evenements e on e.id=r.evenement_id where e.titre='Evt demain') = 0, 'date changée : les rappels repartent de zéro');
\echo '=== TESTS RAPPELS PASSÉS ==='
