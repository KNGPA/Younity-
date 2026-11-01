\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Numéro unique'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin insert into membres (nom, tel) values ('DOUBLON', '+225 01 00 00 00 04'); raise exception 'aurait dû échouer';
exception when unique_violation then perform t_ok(sqlerrm like '%déjà enregistré pour MEMBRE TEST A%', 'numéro déjà utilisé refusé (même écrit autrement)'); end $$;
select t_ok(jsonb_array_length(importer_jeunes('[{"nom":"Autre Nom","tel":"0100000005"}]'::jsonb)->'erreurs') = 1, 'import : numéro déjà utilisé refusé');
update membres set tel = '01 0000 0004' where nom = 'MEMBRE TEST A';
select t_ok(true, 'un jeune peut garder son propre numéro');
reset role;
