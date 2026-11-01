#!/bin/sh
# Lance tous les tests sur une base PostgreSQL vide. Usage : ./run_tests.sh "psql -d ma_base_vide"
set -e
P=${1:-"psql -h /tmp/pg -p 5433 -U postgres -d t1"}
for f in tests/00_supabase_stub.sql migrations/0001_init.sql migrations/0002_comptes_serveur.sql migrations/0003_affiches_evenements.sql migrations/0004_rappels_evenements.sql migrations/0005_taches_secretariat.sql migrations/0006_telephones.sql migrations/0007_oubli_mot_de_passe.sql migrations/0010_plusieurs_departements.sql migrations/0011_campagnes_periodes.sql migrations/0012_contacts_paiement.sql migrations/0013_demandes_paiement.sql \
         tests/01_seed_test.sql tests/02_tests.sql tests/03_tests_serveur.sql tests/04_tests_evenements.sql tests/05_tests_rappels.sql tests/06_tests_taches.sql tests/07_tests_oubli.sql tests/08_tests_departements.sql tests/09_tests_periodes.sql tests/10_tests_contacts.sql tests/11_tests_demandes.sql; do
  $P -q -v ON_ERROR_STOP=1 -f "$f" 2>&1 | grep -E "ERR|ÉCHEC|PASSÉS|^psql.*OK" | sed 's/^psql:[^ ]* NOTICE:  //'
done
