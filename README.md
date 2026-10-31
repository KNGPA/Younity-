# Younity — Gestion des jeunes Harvest

Application de la jeunesse Harvest : cotisations, paiements et reçus, événements, tâches du secrétariat,
anniversaires, notifications. Une seule application pour téléphone, tablette et ordinateur.

- **Application** : https://kngpa.github.io/younity-/ (publiée par GitHub Pages depuis la racine de ce dépôt)
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
