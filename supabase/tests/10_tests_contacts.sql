\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Contacts pour payer'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok((select count(*) from contacts_paiement()) >= 1, 'un membre voit à qui payer');
select t_ok((select role from contacts_paiement() limit 1) like 'Trésori%', 'la trésorière en premier');
reset role;
set role anon; select set_config('request.jwt.claim.sub','',false);
do $$ begin perform * from contacts_paiement(); raise exception 'aurait dû échouer';
exception when insufficient_privilege then perform t_ok(true, 'invisible sans connexion'); end $$;
reset role;
