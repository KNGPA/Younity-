-- Données FICTIVES, uniquement pour les tests automatiques (jamais chargées en production).
insert into departements(nom) values ('Département test');
insert into fonctions(nom) values ('Fonction test');
insert into membres(nom,tel,departement_id,fonction_id)
select n, t, (select id from departements limit 1), (select id from fonctions limit 1)
from (values ('PRESIDENT TEST','+225 01 0000 0001'),('TRESORIERE TEST','01 0000 0002'),('SECRETAIRE TEST','01 0000 0003'),
             ('MEMBRE TEST A','01 0000 0004'),('MEMBRE TEST B','01 0000 0005'),('MEMBRE TEST C','01 0000 0006')) v(n,t);
insert into campagnes(nom,nb_mois,debut) values ('Campagne test',10,date_trunc('month',current_date)::date);
insert into campagne_lignes(campagne_id,membre_id,montant)
select (select id from campagnes where nom='Campagne test'), id, 20000 from membres where nom<>'MEMBRE TEST C';
