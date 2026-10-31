-- Tests de la migration 0003 : affiches, événements, organisateur
\set ON_ERROR_STOP 1
\set QUIET 1
-- MEMBRE TEST C (compte ...05) devient organisateur
update comptes set role_id = 'organisateur' where user_id = '00000000-0000-0000-0000-000000000005';

\echo '--- Organisateur'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
insert into evenements (titre, categorie, debut, lieu, responsable)
values ('Sortie détente', 'Sortie', now() + interval '10 days', 'Bassam', current_membre());
select t_ok((select count(*) from evenements) = 1, 'l''organisateur crée un événement');
insert into evenement_taches (evenement_id, libelle, responsable)
select id, 'Réserver le car', (select id from membres where nom='MEMBRE TEST A') from evenements;
select t_ok((select count(*) from evenement_taches) = 1, 'il ajoute une tâche confiée à un jeune');
do $$ begin insert into affiches (titre, image) values ('x','x.jpg'); raise exception 'aurait dû échouer';
exception when insufficient_privilege then perform t_ok(true, 'l''organisateur ne publie pas d''affiche d''accueil'); end $$;
select t_ok((select count(*) from paiements) = 0, 'il ne voit pas les paiements');
reset role;

\echo '--- Membre'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok((select count(*) from notifications where type='evenements' and titre like 'Nouvel événement%') = 1, 'tout le monde est prévenu du nouvel événement');
select t_ok((select count(*) from evenements) = 1, 'le membre voit les événements');
select repondre_evenement((select id from evenements), 'oui');
select t_ok((select reponse from evenement_participants) = 'oui', 'il répond « je participe »');
select repondre_evenement((select id from evenements), 'peut_etre');
select t_ok((select reponse from evenement_participants) = 'peut_etre', 'il peut changer sa réponse');
select t_ok((select count(*) from evenement_taches) = 1, 'il voit la tâche qui lui est confiée');
do $$ begin insert into evenements (titre, debut) values ('x', now()); raise exception 'aurait dû échouer';
exception when insufficient_privilege then perform t_ok(true, 'un membre ne crée pas d''événement'); end $$;
do $$ begin perform pointer_presence((select id from evenements), current_membre(), true); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%organisateurs%', 'un membre ne pointe pas les présences'); end $$;
reset role;

\echo '--- Rappel, présence, annulation'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select t_ok(rappel_evenement((select id from evenements), false, '') = 1, 'rappel envoyé à ceux qui ont répondu (1)');
select pointer_presence((select id from evenements), (select id from membres where nom='MEMBRE TEST A'), true);
select t_ok((select presents from v_evenements_bilan) = 1 and (select peut_etre from v_evenements_bilan) = 1, 'bilan : réponses et présences');
update evenements set annule = true, motif_annulation = 'Pluie annoncée';
reset role;
select t_ok((select count(*) from notifications where titre like 'Événement annulé%') >= 4, 'annulation : tout le monde est prévenu');

\echo '--- Affiches (président)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into affiches (titre, image, ordre) values ('Moisson 2026', 'affiches/moisson.jpg', 1);
insert into affiches (titre, image, debut, fin) values ('Ancienne', 'affiches/old.jpg', current_date - 10, current_date - 1);
insert into storage.objects (bucket_id, name) values ('visuels', 'affiches/moisson.jpg');
select t_ok(true, 'le président dépose une image dans « visuels »');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok((select string_agg(titre, ',') from affiches) = 'Moisson 2026', 'le membre ne voit que les affiches en cours');
do $$ begin insert into storage.objects (bucket_id, name) values ('visuels', 'pirate.jpg'); raise exception 'aurait dû échouer';
exception when insufficient_privilege then perform t_ok(true, 'un membre ne dépose pas d''image'); end $$;
reset role;
\echo '=== TESTS ÉVÉNEMENTS PASSÉS ==='
