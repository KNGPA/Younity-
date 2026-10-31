\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Mot de passe oublié'
set role service_role; select set_config('request.jwt.claim.sub','',false);
select t_ok((select count(*) from enregistrer_code_reinit('membre.c@exemple.ci','h1')) = 1, 'code enregistré pour un e-mail connu');
select t_ok((select count(*) from enregistrer_code_reinit('membre.c@exemple.ci','h2')) = 0, 'pas deux codes en moins d''une minute');
select t_ok((select count(*) from enregistrer_code_reinit('inconnu@exemple.ci','h3')) = 0, 'e-mail inconnu : rien');
select t_ok(valider_code_reinit('membre.c@exemple.ci','faux')->>'erreur' like 'Code incorrect (4 essai%', 'code faux : refusé');
select t_ok(valider_code_reinit('membre.c@exemple.ci','faux')->>'erreur' like 'Code incorrect (3 essai%', 'les essais sont bien décomptés');
select t_ok(valider_code_reinit('membre.c@exemple.ci','h1')->>'user_id' = '00000000-0000-0000-0000-000000000005', 'bon code : compte retrouvé');
select t_ok(valider_code_reinit('membre.c@exemple.ci','h1')->>'erreur' like '%expiré%', 'un code ne sert qu''une fois');
reset role;
select t_ok((select count(*) from codes_reinitialisation) = 0, 'codes effacés après usage');
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$ begin perform enregistrer_code_reinit('membre.c@exemple.ci','x'); raise exception 'x';
exception when insufficient_privilege then perform t_ok(true, 'l''appli ne peut pas créer de code elle-même'); end $$;
reset role;
set role anon;
select t_ok(demander_reinitialisation('01 0000 0004') = '0100000001', 'demande au président : son numéro WhatsApp est renvoyé');
select t_ok(demander_reinitialisation('99 99 99 99') = '0100000001', 'même réponse pour un numéro inconnu');
select demander_reinitialisation('+225 0100000004');
reset role;
select t_ok((select count(*) from notifications where titre like 'Mot de passe oublié : %') = 1, 'le président est prévenu une seule fois (anti-spam)');
\echo '=== TESTS MOT DE PASSE OUBLIÉ PASSÉS ==='
