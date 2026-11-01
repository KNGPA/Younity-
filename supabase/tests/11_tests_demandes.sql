\set ON_ERROR_STOP 1
\set QUIET 1
\echo '--- Paiement QR et captures'
-- le jeune (A) génère un QR
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select set_config('test.qr', creer_demande_qr((select id from campagnes where nom='Campagne test'), 4000)::text, false);
select t_ok(length(current_setting('test.qr')::jsonb->>'code') = 6, 'le QR a un code à 6 caractères');
select t_ok((select count(*) from demandes_paiement) = 1, 'le jeune voit sa demande');
select set_config('test.cap', envoyer_capture((select id from campagnes where nom='Campagne test'), 2000, 'x/cap.jpg', 'Wave', 'T_ABC123', current_date, true)::text, false);
do $$ begin perform envoyer_capture((select id from campagnes where nom='Campagne test'), 2000, 'x', 'Wave', 't_abc 123', current_date, true); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%référence%', 'même référence refusée'); end $$;
do $$ begin perform valider_demande((current_setting('test.qr')::jsonb->>'id')::uuid); raise exception 'aurait dû échouer';
exception when others then perform t_ok(sqlerrm like '%trésorerie%', 'un membre ne valide pas'); end $$;
reset role;
-- la trésorière scanne et valide
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select t_ok(verifier_qr((current_setting('test.qr')::jsonb->>'id')::uuid, 'ZZZZZZ')->>'erreur' = 'inconnu', 'mauvais code refusé');
select t_ok((verifier_qr(null, current_setting('test.qr')::jsonb->>'code')->>'montant')::int = 4000, 'code saisi à la main retrouvé');
select t_ok((valider_demande((current_setting('test.qr')::jsonb->>'id')::uuid)->>'numero') is not null, 'QR validé : paiement créé');
select t_ok((select moyen from paiements where demande_id = (current_setting('test.qr')::jsonb->>'id')::uuid) = 'Espèces', 'payé en espèces');
select t_ok(verifier_qr((current_setting('test.qr')::jsonb->>'id')::uuid, current_setting('test.qr')::jsonb->>'code')->>'erreur' = 'utilise', 'QR à usage unique');
reset role;
-- le président valide la capture : la trésorière est prévenue
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select valider_demande(current_setting('test.cap')::uuid, 2500, 'Orange Money', 'T_ABC123', current_date);
select t_ok((select montant from paiements where demande_id = current_setting('test.cap')::uuid) = 2500 and (select moyen from paiements where demande_id = current_setting('test.cap')::uuid) = 'Orange Money', 'montant et opérateur corrigés à la validation');
reset role;
select t_ok((select count(*) from notifications n join membres m on m.id = n.membre_id where m.nom = 'TRESORIERE TEST' and n.titre like 'Le Président a validé%') = 1, 'la trésorière sait que le président a validé');
select t_ok((select count(*) from notifications n join membres m on m.id = n.membre_id where m.nom = 'MEMBRE TEST A' and n.titre like 'Versement enregistré : 2%500%') = 1, 'le jeune reçoit sa confirmation');
-- refus
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
select set_config('test.cap2', envoyer_capture((select id from campagnes where nom='Campagne test'), 1000, 'x/2.jpg', 'Wave', '', current_date, false)::text, false);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select rejeter_demande(current_setting('test.cap2')::uuid, 'Capture illisible');
reset role;
select t_ok((select statut from demandes_paiement where id = current_setting('test.cap2')::uuid) = 'rejetee', 'capture refusée');
-- QR expiré
update demandes_paiement set statut = 'en_attente', expire_le = now() - interval '1 minute', paiement_id = null where id = (current_setting('test.qr')::jsonb->>'id')::uuid;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select t_ok(verifier_qr((current_setting('test.qr')::jsonb->>'id')::uuid, current_setting('test.qr')::jsonb->>'code')->>'erreur' = 'expire', 'QR expiré refusé');
reset role;
