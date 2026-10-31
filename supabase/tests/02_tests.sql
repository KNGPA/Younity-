-- Tests de bout en bout : comptes, droits par rôle, calculs mois par mois.
\set ON_ERROR_STOP 1
\set QUIET 1

-- Comptes de test (en vrai, créés par la fonction serveur « creer-acces »)
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000001','0100000001@tel.cotijes.app'),
 ('00000000-0000-0000-0000-000000000002','0100000002@tel.cotijes.app'),
 ('00000000-0000-0000-0000-000000000003','0100000003@tel.cotijes.app'),
 ('00000000-0000-0000-0000-000000000004','0100000004@tel.cotijes.app');
insert into comptes(user_id,membre_id,role_id) values
 ('00000000-0000-0000-0000-000000000001',(select id from membres where nom='PRESIDENT TEST'),'president'),
 ('00000000-0000-0000-0000-000000000002',(select id from membres where nom='TRESORIERE TEST'),'tresorier'),
 ('00000000-0000-0000-0000-000000000003',(select id from membres where nom='SECRETAIRE TEST'),'secretaire'),
 ('00000000-0000-0000-0000-000000000004',(select id from membres where nom='MEMBRE TEST A'),'membre');

-- Petite campagne de test : lancée le mois dernier → nous sommes au Mois 2 ; 16 000 sur 4 mois = 4 000/mois
insert into campagnes(nom,nb_mois,debut) values ('Test allocation',4,(date_trunc('month',current_date) - interval '1 month')::date);
insert into campagne_lignes select id,(select id from membres where nom='MEMBRE TEST A'),16000 from campagnes where nom='Test allocation';

create function t_ok(cond boolean, msg text) returns void language plpgsql as $$
begin if cond is not true then raise exception 'ÉCHEC : %', msg; end if; raise notice 'OK  %', msg; end $$;
grant execute on function t_ok(boolean,text) to authenticated, anon;

\echo '--- Connexion'
set role anon;
select t_ok(login_email('01 0000 0004') = '0100000004@tel.cotijes.app', 'login par téléphone (espaces ignorés)');
select t_ok(login_email('99 99 99 99') is null, 'numéro inconnu → rien');
reset role;

\echo '--- Trésorière'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select t_ok((select count(*) from membres) = 6, 'la trésorière voit le registre (6 jeunes)');
insert into paiements(campagne_id,membre_id,montant,moyen,saisi_par)
  select c.id, m.id, 2000, 'Wave', current_membre() from campagnes c, membres m where c.nom='Test allocation' and m.nom='MEMBRE TEST A';
select t_ok((select s.statut from v_situations s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation') = 'en_retard', 'après 2 000 : en retard');
select t_ok((select s.retard from v_situations s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation') = 6000, 'retard = 8 000 dû à ce jour − 2 000 = 6 000');
select t_ok((select etat||':'||paye from v_situation_mois s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation' and mois=1) = 'partiel:2000', 'Mois 1 : partiel 2 000 / 4 000');
insert into paiements(campagne_id,membre_id,montant,moyen,saisi_par)
  select c.id, m.id, 6000, 'Espèces', current_membre() from campagnes c, membres m where c.nom='Test allocation' and m.nom='MEMBRE TEST A';
select t_ok((select string_agg(etat,',' order by mois) from v_situation_mois s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation') = 'paye,paye,a_venir,a_venir', 'après +6 000 : Mois 1 et 2 soldés');
select t_ok((select s.statut from v_situations s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation') = 'a_jour', 'statut : à jour');
insert into paiements(campagne_id,membre_id,montant,moyen,saisi_par)
  select c.id, m.id, 1000, 'Orange Money', current_membre() from campagnes c, membres m where c.nom='Test allocation' and m.nom='MEMBRE TEST A';
select t_ok((select etat||':'||paye from v_situation_mois s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation' and mois=3) = 'partiel:1000', 'paiement d''avance : Mois 3 partiel 1 000');
select annuler_paiement((select id from paiements where montant=1000 and moyen='Orange Money'), 'Erreur de saisie');
select t_ok((select s.verse from v_situations s join campagnes c on c.id=s.campagne_id where c.nom='Test allocation') = 8000, 'annulation : le paiement ne compte plus');
do $$ begin
  begin update roles set nom='x' where id='tresorier'; perform t_ok((select nom from roles where id='tresorier')<>'x','la trésorière ne modifie pas les rôles');
  end; end $$;
do $$ begin
  begin perform bloquer_compte((select id from membres where nom='MEMBRE TEST A'),'x'); raise exception 'aurait dû échouer';
  exception when others then if sqlerrm like '%président%' then raise notice 'OK  la trésorière ne peut pas bloquer un compte'; else raise; end if; end; end $$;
reset role;

\echo '--- Membre'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok((select count(*) from membres) = 1, 'un membre ne voit que sa propre fiche');
select t_ok((select count(*) from paiements where membre_id <> current_membre()) = 0, 'un membre ne voit pas les paiements des autres');
select t_ok((select count(*) from v_situations) = 2, 'un membre voit ses 2 cotisations');
select t_ok((select count(*) from notifications where titre like 'Versement enregistré%') >= 3, 'il a reçu les notifications de versement');
select t_ok((select count(*) from anniversaires()) >= 0, 'il peut voir les anniversaires');
do $$ begin
  begin insert into paiements(campagne_id,membre_id,montant,moyen,saisi_par)
    select campagne_id, membre_id, 500, 'Wave', current_membre() from v_situations limit 1;
    raise exception 'aurait dû échouer';
  exception when insufficient_privilege then raise notice 'OK  un membre ne peut pas enregistrer de paiement';
  end; end $$;
select maj_mon_email('membre.a@exemple.ci');
select t_ok((select email from membres where id=current_membre())='membre.a@exemple.ci', 'un membre change son e-mail');
reset role;
set role anon;
select t_ok(login_email('membre.a@exemple.ci') = '0100000004@tel.cotijes.app', 'login par e-mail');
reset role;

\echo '--- Président'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select bloquer_compte((select id from membres where nom='MEMBRE TEST A'),'Téléphone perdu');
reset role; set role anon;
select t_ok(login_email('0100000004') is null, 'compte bloqué → connexion refusée');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select t_ok(current_membre() is null and (select count(*) from v_situations)=0, 'compte bloqué → plus aucune donnée visible');
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select debloquer_compte((select id from membres where nom='MEMBRE TEST A'));
update membres set actif=false where nom='MEMBRE TEST B';
select t_ok((select count(*) from journal where action='Membre rendu inactif')=1, 'rendre inactif est journalisé');
update comptes set actif=false where role_id='president';
select t_ok((select actif from comptes where role_id='president'), 'personne ne peut bloquer le président depuis l''application');
select t_ok((select attendu from v_campagnes_stats where nom='Campagne test') = 100000, 'Campagne test : 100 000 attendus');
select t_ok((select count(*) from journal) > 5, 'le journal se remplit automatiquement');
reset role;

\echo '--- Secrétaire'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select enregistrer_relance((select id from campagnes where nom='Test allocation'),(select id from membres where nom='MEMBRE TEST A'),'whatsapp');
select t_ok((select count(*) from relances)=1, 'la secrétaire enregistre une relance');
select t_ok((select count(*) from journal)=0, 'la secrétaire ne voit pas le journal (réservé)');
reset role;
\echo '--- Protection côté serveur'
do $$ begin
  begin update comptes set actif=false where role_id='president'; raise exception 'aurait dû échouer';
  exception when others then if sqlerrm like '%président%' then raise notice 'OK  même le serveur refuse de bloquer le président'; else raise; end if; end; end $$;
\echo '=== TOUS LES TESTS SONT PASSÉS ==='
