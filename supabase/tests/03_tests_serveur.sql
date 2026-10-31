-- Tests de la migration 0002 (à lancer après 02_tests.sql)
\set ON_ERROR_STOP 1
\set QUIET 1

\echo '--- Création d''un accès (président puis serveur)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select t_ok((verifier_creation_acces((select id from membres where nom='MEMBRE TEST C'),'membre')->>'email_technique')
            like '%@membres.cotijes.app', 'le président obtient l''adresse technique');
do $$ begin
  perform verifier_creation_acces((select id from membres where nom='MEMBRE TEST A'),'membre'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%déjà un accès%', 'refus : accès déjà existant'); end $$;
do $$ begin
  perform verifier_creation_acces((select id from membres where nom='MEMBRE TEST C'),'president'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%seul président%', 'refus : un seul président'); end $$;
select t_ok((mon_compte()->>'role') = 'president' and (mon_compte()->'permissions') ? 'acces_gerer', 'mon_compte() du président');

-- La trésorière ne peut pas créer d'accès
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin
  perform verifier_creation_acces((select id from membres where nom='MEMBRE TEST C'),'membre'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%réservée au président%', 'la trésorière ne crée pas d''accès'); end $$;
do $$ begin
  perform lier_compte(gen_random_uuid(), (select id from membres where nom='MEMBRE TEST C'), 'membre', null); raise exception 'aurait dû échouer';
exception when insufficient_privilege then perform t_ok(true, 'lier_compte interdit depuis l''application'); end $$;
reset role;

-- Le serveur crée l'utilisateur Auth (API admin) puis lie le compte
insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000005',
  email_technique((select id from membres where nom='MEMBRE TEST C')));
set role service_role; select set_config('request.jwt.claim.sub','',false);
select lier_compte('00000000-0000-0000-0000-000000000005', (select id from membres where nom='MEMBRE TEST C'), 'membre',
                   (select id from membres where nom='PRESIDENT TEST'));
reset role;
select t_ok((select auteur from journal where action='Accès créé' order by id desc limit 1)
            = (select id from membres where nom='PRESIDENT TEST'), 'le journal attribue la création au président');
set role anon;
select t_ok(login_email('01 0000 0006') like '%@membres.cotijes.app', 'le nouveau compte se connecte par téléphone');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
select t_ok((mon_compte()->>'doit_changer_mdp')::boolean, 'première connexion : changement de mot de passe exigé');
select t_ok((select count(*) from notifications where titre='Bienvenue sur Younity') = 1, 'message de bienvenue reçu');
reset role;

set role anon;
select t_ok(login_email('+225 01 00 00 00 06') like '%@membres.cotijes.app', 'connexion avec +225 devant le numéro');
select t_ok(login_email('00225 0100000006') like '%@membres.cotijes.app', 'connexion avec 00225 devant le numéro');
reset role;
\echo '--- Réinitialisation et blocage'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select t_ok(preparer_reinitialisation((select id from membres where nom='MEMBRE TEST A')) = '00000000-0000-0000-0000-000000000004',
            'le président réinitialise un mot de passe');
select t_ok(user_du_membre((select id from membres where nom='MEMBRE TEST A')) is not null, 'le président retrouve l''utilisateur à bloquer');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select t_ok(user_du_membre((select id from membres where nom='MEMBRE TEST A')) is null, 'la secrétaire ne peut pas');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok((mon_compte()->>'doit_changer_mdp')::boolean, 'après réinitialisation : nouveau mot de passe exigé');
reset role;

\echo '--- Mot de passe oublié'
set role service_role; select set_config('request.jwt.claim.sub','',false);
update membres set email='membre.c@exemple.ci' where nom='MEMBRE TEST C';
select t_ok((select count(*) from compte_pour_email('MEMBRE.C@exemple.ci')) = 1, 'compte retrouvé par e-mail réel');
select t_ok((select count(*) from compte_pour_email('inconnu@exemple.ci')) = 0, 'e-mail inconnu : rien');
reset role;

\echo '--- Import Excel'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select t_ok((r->>'ajoutes')::int = 2 and (r->>'ignores')::int = 1 and jsonb_array_length(r->'erreurs') = 2, 'import : 2 ajoutés, 1 doublon, 2 erreurs')
from (select importer_jeunes('[
  {"nom":"Nouveau Un","prenoms":"Awa","tel":"01 2222 3333","anniversaire":"14/02","baptise":"Oui","departement":"Département test"},
  {"nom":"Nouveau Deux","email":"deux@exemple.ci","fonction":"Fonction test"},
  {"nom":"MEMBRE TEST A","tel":"01 0000 0004"},
  {"nom":"","tel":"01"},
  {"nom":"Nouveau Trois","departement":"Inconnu"}]'::jsonb) r) x;
select t_ok((select anniv_jour||'/'||anniv_mois||' '||baptise from membres where nom='NOUVEAU UN') = '14/2 true', 'anniversaire et baptême importés');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$ begin perform importer_jeunes('[]'); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%réservée%', 'la trésorière ne peut pas importer'); end $$;
reset role;

\echo '--- Paiement dans l''application (Mobile Money)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
do $$ begin perform initier_paiement((select id from campagnes where nom='Campagne test'),1000,'Wave'); raise exception 'x';
exception when others then perform t_ok(sqlerrm like '%participes pas%' or sqlerrm like '%pas encore activé%', 'paiement refusé tant que non activé'); end $$;
reset role;
update parametres set paiement_integre = true;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ begin perform initier_paiement((select id from campagnes where nom='Campagne test'),999999,'Wave'); raise exception 'x';
exception when others then perform t_ok(sqlerrm like '%dépasse%', 'montant supérieur au reste refusé'); end $$;
select set_config('test.attente', initier_paiement((select id from campagnes where nom='Campagne test'),2000,'Wave')::text, false);
reset role;
set role service_role; select set_config('request.jwt.claim.sub','',false);
select t_ok(confirmer_paiement(current_setting('test.attente')::uuid, true, 'WAVE-TX-1'), 'l''opérateur confirme');
select t_ok(not confirmer_paiement(current_setting('test.attente')::uuid, true, 'WAVE-TX-1'), 'confirmation en double sans effet');
reset role;
select t_ok((select count(*) from paiements where reference='WAVE-TX-1' and source='appli') = 1, 'paiement enregistré une seule fois');
select t_ok((select verse from v_situations s join campagnes c on c.id=s.campagne_id
             join membres m on m.id=s.membre_id where c.nom='Campagne test' and m.nom='MEMBRE TEST A') = 2000, 'situation mise à jour');

\echo '=== TESTS SERVEUR PASSÉS ==='
