\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Tâches du secrétariat'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select set_config('test.t1', enregistrer_tache(null, 'Préparer les chants de Noël', '8 chants', 'Réunion du bureau', current_date - 3, current_date + 5, false,
  array[(select id from membres where nom='MEMBRE TEST A')])::text, false);
select set_config('test.t2', enregistrer_tache(null, 'Venir en blanc dimanche', '', 'Réunion de la jeunesse', null, current_date + 1, true, '{}')::text, false);
select t_ok((select count(*) from taches) = 2, 'la secrétaire note deux tâches');
select t_ok((select date_origine from taches where titre like 'Préparer%') = current_date - 3, 'date de la réunion enregistrée');
select t_ok((select date_origine from taches where titre like 'Venir%') = current_date, 'sans date : date du jour');
do $$ begin perform enregistrer_tache(null, 'x', '', 'Réunion du bureau', current_date + 2, null, true, '{}'); raise exception 'aurait dû échouer';
exception when check_violation then perform t_ok(true, 'date de réunion dans le futur refusée'); end $$;
do $$ begin perform enregistrer_tache(null, 'x', '', '', null, null, false, '{}'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%au moins une personne%', 'il faut désigner quelqu''un'); end $$;
select t_ok(rappel_tache(current_setting('test.t1')::uuid, 'appli', 'N''oublie pas !') = 1, 'rappel dans l''appli à la personne concernée');
select rappel_tache(current_setting('test.t2')::uuid, 'groupe', '');
select tache_faite(current_setting('test.t1')::uuid, true);
select t_ok((select faite from taches where id = current_setting('test.t1')::uuid), 'tâche marquée comme faite');
select t_ok(rappel_evenement((select id from evenements where titre='Evt semaine'), true, '') > 0, 'la secrétaire rappelle une activité');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok((select count(*) from notifications where titre = 'Nouvelle tâche pour toi : Préparer les chants de Noël' and corps like '%Réunion du bureau du %') = 1, 'le jeune est prévenu de sa tâche');
select t_ok((select count(*) from notifications where titre = 'Rappel : Préparer les chants de Noël') = 1, 'il reçoit le rappel');
select t_ok((select count(*) from taches) = 2, 'il voit sa tâche et celle pour tous');
do $$ begin perform enregistrer_tache(null, 'x', '', '', null, null, true, '{}'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%secrétariat%', 'un membre ne crée pas de tâche'); end $$;
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select t_ok((select count(*) from taches) = 1, 'la trésorière ne voit que la tâche pour tous');
reset role;
\echo '=== TESTS TÂCHES PASSÉS ==='
