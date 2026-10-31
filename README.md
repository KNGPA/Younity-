# Younity — Gestion des jeunes Harvest

Application de la jeunesse Harvest : cotisations, paiements et reçus, événements, tâches du secrétariat,
anniversaires, notifications. Une seule application pour téléphone, tablette et ordinateur.

- **Application** : https://kngpa.github.io/Younity-/ (publiée par GitHub Pages depuis la racine de ce dépôt)
- **Base de données et serveur** : Supabase (projet `zrnhsdtpfyjlvrgrmssf`, région Paris)

## Contenu du dépôt
| Dossier | Rôle |
|---|---|
| `/` (racine) | l'application publiée : `index.html`, `manifest.webmanifest`, `sw.js`, `vendor/`, `icons/` |
| `dev/` | les sources : écrans (`dev/ecrans/`), couche serveur (`dev/src/data.js`), styles, et `dev/build.py` qui reconstruit la racine |
| `supabase/` | migrations SQL de la base, fonctions serveur (Edge Functions), tests |
| `.github/workflows/` | sauvegarde automatique de la base (deux fois par semaine) |

## Reconstruire l'application
```
python3 dev/build.py
```

## Installer l'application
- **iPhone / iPad** : ouvrir l'adresse dans Safari → Partager → « Sur l'écran d'accueil ».
- **Android** : ouvrir l'adresse dans Chrome → menu ⋮ → « Installer l'application » (ou APK généré avec PWABuilder).

La clé présente dans l'application est la clé **publique** de Supabase : elle ne donne accès qu'à ce que les règles
de la base autorisent (chaque rôle ne voit que ce qui le concerne). Aucune clé secrète n'est dans ce dépôt.

## Application Android native (depuis la v2.0.0)

- Projet Capacitor : `dev/natif/` (splash vert, icône, plugins Fichiers/Partage/Mises à jour).
- **Mise à jour sans nouvel APK** : augmenter `dev/VERSION`, lancer `python3 dev/natif/publier_maj.py`, puis pousser sur GitHub.
  Les téléphones lisent `natif/version.json`, téléchargent la nouvelle version en arrière-plan et l'installent quand l'appli passe en arrière-plan.
- Un **nouvel APK** n'est nécessaire que pour une nouvelle fonction native (plugin, permission, notifications Firebase…).
- La clé de signature n'est **jamais** dans ce dépôt (même clé que l'APK 1.0 pour pouvoir installer par-dessus).
