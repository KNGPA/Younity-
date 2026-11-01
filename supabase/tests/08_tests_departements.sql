\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Plusieurs départements'
reset role;
insert into departements (nom) values ('Chorale'), ('Accueil'), ('Médias') on conflict do nothing;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select definir_departements((select id from membres where nom='MEMBRE TEST A'),
  array[(select id from departements where nom='Chorale'),(select id from departements where nom='Médias')]);
select t_ok((select count(*) from membre_departements where membre_id=(select id from membres where nom='MEMBRE TEST A')) = 2, 'un jeune dans deux départements');
select t_ok((select departement_id from membres where nom='MEMBRE TEST A') = (select id from departements where nom='Chorale'), 'le premier devient le principal');
select definir_departements((select id from membres where nom='MEMBRE TEST A'), array[(select id from departements where nom='Médias')]);
select t_ok((select count(*) from membre_departements where membre_id=(select id from membres where nom='MEMBRE TEST A')) = 1, 'on retire un département');
select t_ok((importer_jeunes('[{"nom":"Multi Dep","prenoms":"Ok","departement":"Chorale ; accueil"}]'::jsonb)->>'ajoutes')::int = 1, 'import avec deux départements');
select t_ok((select count(*) from membre_departements md join membres m on m.id=md.membre_id where m.nom='MULTI DEP') = 2, 'les deux départements importés');
select t_ok(jsonb_array_length(importer_jeunes('[{"nom":"Bad Dep","departement":"Chorale, Inconnu"}]'::jsonb)->'erreurs') = 1, 'département inconnu refusé');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ begin perform definir_departements((select id from membres limit 1), '{}'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%président%', 'un membre ne change pas les départements'); end $$;
reset role;
