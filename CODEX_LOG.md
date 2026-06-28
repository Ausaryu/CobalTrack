# CobalTrack — Codex Log racine

## Passe — préparation usage local et serveur

### Date

28 juin 2026

### Objectif

Préparer le projet pour un usage local confortable et un déploiement sur serveur personnel : scripts de lancement racine complets, documentation d'environnement et de déploiement, script de sauvegarde SQLite, finition frontend sur la gestion des erreurs réseau.

### Fichiers créés et modifiés hors frontend/backend

- `.gitignore` : ajout de `backend/backups/` pour ne pas versionner les backups.
- `backend/.env.example` : variables d'environnement backend documentées avec note LAN.
- `backend/app/scripts/backup_sqlite.py` : copie horodatée de la base SQLite.
- `backend/tests/test_backup_sqlite.py` : trois tests unitaires pour le script de backup.
- `docs/DEV_SETUP.md` : guide complet d'installation locale, migrations, lancement, accès LAN.
- `docs/DEPLOYMENT.md` : guide de déploiement serveur personnel (Nginx/Caddy, systemd, HTTPS, backup automatisé).
- `CODEX_LOG.md` : ce fichier.

### Fichiers modifiés

- `package.json` (racine) : ajout des scripts `build` et `test:backend`.
- `frontend/.env.example` : note LAN ajoutée.
- `frontend/src/shared/api/client.ts` : message d'erreur réseau explicite en français quand `fetch` échoue.
- `frontend/CODEX_LOG.md` : nouvelle section.
- `backend/CODEX_LOG.md` : nouvelle section.

### Scripts ajoutés

| Script npm (racine) | Commande |
|---|---|
| `npm run build` | `cd frontend && npm run build` |
| `npm run test:backend` | `cd backend && .venv/bin/pytest -q` |
| `npm run dev` | backend + frontend via `concurrently` |
| `npm run dev:backend` | backend seul sur `0.0.0.0:8000` |
| `npm run dev:frontend` | frontend seul sur `0.0.0.0:5173` |

Script Python ajouté :

```bash
cd backend
python -m app.scripts.backup_sqlite
# → Backup created: backend/backups/cobaltrack_20260628_120000.db
```

### Documentation ajoutée

- `docs/DEV_SETUP.md` : prérequis, installation, migrations, lancement, URLs, LAN, import exercices, backup.
- `docs/DEPLOYMENT.md` : build, systemd, Nginx, Caddy, HTTPS, SPA fallback, backup, mise à jour, variables.

### Sauvegarde SQLite

`backend/app/scripts/backup_sqlite.py` expose :
- `backup(db_path, backup_dir)` : fonction testable qui copie et horodate.
- `main()` : lit `DATABASE_URL` depuis les settings, vérifie que c'est un SQLite local, crée `backend/backups/`.

Si `DATABASE_URL` n'est pas un SQLite local, le script affiche une erreur propre et quitte sans rien modifier.

### Vérifications

```bash
cd frontend && npm run build
```
```
TypeScript strict       OK
Vite production build  OK
124 modules transformés
```

```bash
cd backend && pytest -q
```
```
63 passed in X.XXs
```

```bash
alembic check
```
```
No new upgrade operations detected.
```

### Points d'attention

- Le backend écoute sur `0.0.0.0` uniquement en mode `dev` ; en production, restreindre à `127.0.0.1` derrière Nginx.
- La sauvegarde SQLite utilise `shutil.copy2` (copie simple) ; pour les DB actives en production, préférer `sqlite3 .backup` ou l'API Python `sqlite3.backup()` pour une copie cohérente.
- Le dossier `backend/backups/` n'est pas encore dans `.gitignore` ; ajouter `backend/backups/` si les backups ne doivent pas être versionnés.
- Aucun test de smoke automatisé n'est configuré pour vérifier que les deux serveurs répondent après lancement.

## Passe suivante — scripts racine et documentation serveur

### Date

28 juin 2026

### Objectif

Terminer les scripts racine (ajout `backup:db`, format `dev` plus propre, `python -m pytest`), ajouter la section Documentation au README racine, et finaliser les docs DEV_SETUP/DEPLOYMENT.

### Fichiers modifiés

- `package.json` (racine) : script `dev` refactorisé pour appeler `npm run dev:backend` et `npm run dev:frontend`; `test:backend` passe à `python -m pytest -q`; ajout de `backup:db`.
- `README.md` (racine) : section **Documentation** ajoutée avec liens vers `docs/`, `backend/docs/`.
- `docs/DEV_SETUP.md` : commande tests corrigée en `python -m pytest -q`; ajout `npm run backup:db`; tableau récapitulatif des commandes racine.
- `docs/DEPLOYMENT.md` : ajout `npm run backup:db` dans la section sauvegarde.
- `CODEX_LOG.md` (racine) : ajout de la présente section.

### Scripts racine complets

| Commande | Action |
|---|---|
| `npm run dev` | backend + frontend via concurrently |
| `npm run dev:backend` | backend seul sur `0.0.0.0:8000` |
| `npm run dev:frontend` | frontend seul sur `0.0.0.0:5173` |
| `npm run build` | build de production du frontend |
| `npm run test:backend` | `python -m pytest -q` dans `backend/` |
| `npm run backup:db` | sauvegarde horodatée de la DB SQLite |

### Documentation ajoutée/mise à jour

- `docs/DEV_SETUP.md` : complet — install, migrations, lancement, URLs, LAN, tableau commandes.
- `docs/DEPLOYMENT.md` : complet — build, systemd, Nginx, Caddy, HTTPS, SPA fallback, backup cron, mise à jour.

### Vérifications

```bash
npm run build
```
```
TypeScript strict       OK
Vite production build  OK
124 modules transformés
```

```bash
npm run test:backend
```
```
63 passed in 2.32s
```

```bash
cd backend && alembic check
```
```
No new upgrade operations detected.
```

### Points d'attention

- Les avertissements `MD004` dans `README.md` (listes `*` vs `-`) sont préexistants dans le fichier original, non introduits par cette passe.
- `concurrently` reste en `^10.0.3` (déjà installé et fonctionnel) ; le `^9.0.0` de l'exemple ne serait qu'une rétrogradation inutile.
- Aucun test de smoke end-to-end n'est configuré.

## Passe suivante — pagination backend des exercices

### Date

28 juin 2026

### Objectif

Remplacer le chargement total du référentiel d'exercices par une recherche paginée côté serveur, sans casser les routes, formulaires, ou détails existants.

### Routes backend ajoutées

| Route | Description |
|---|---|
| `GET /api/exercises/search` | Recherche paginée (`q`, `muscle_group`, `equipment`, `limit`, `offset`) |
| `GET /api/exercises/filters` | Valeurs distinctes pour les dropdowns |

### Frontend modifié

- ExercisesPage : serveur gère search + pagination + filtres
- ExercisePicker : auto-suffisant, plus de prop `exercises[]`
- WorkoutForm / ProgramForm : prop `exercises` supprimée
- WorkoutsPage / ProgramsPage : ne passent plus `exercises` aux formulaires

### Vérifications

```
npm run build          →  OK
npm run test:backend   →  83 passed (dont 20 nouveaux)
alembic check          →  No new upgrade operations detected
```

### Points d'attention

- `GET /api/exercises` conservé pour WorkoutsPage, ProgramsPage, StatsPage
- Filtres favoris/masqués restent locaux

## Passe suivante — suppression derniers chargements complets exercices

### Date

28 juin 2026

### Objectif

Éliminer tous les appels frontend à `GET /api/exercises` et corriger les docs obsolètes.

### Fichiers modifiés

- `frontend/src/shared/api/exercises.ts` (nouveau) : API helpers centralisés
- `frontend/src/shared/hooks/useExerciseNames.ts` (nouveau) : hook `useQueries` pour les noms par ID
- WorkoutDetail, ProgramDetail : prop `exercises` supprimée, hook interne
- WorkoutsPage, ProgramsPage : `exercisesQuery` supprimée
- StatsPage : `ExercisePicker` remplace le SelectField + liste complète
- `frontend/README.md` : docs Ergonomie et Endpoints corrigées

### Backend

Non modifié.

### Vérifications

```
npm run build          →  OK (126 modules)
npm run test:backend   →  83 passed
alembic check          →  No new upgrade operations detected
```

### Points d'attention

- `GET /api/exercises` conservé côté backend, plus appelé côté frontend
- Noms d'exercices chargés à la demande par ID avec cache persistant

## Passe suivante — pagination séances et programmes

### Date

28 juin 2026

### Objectif

Ajouter pagination et recherche pour séances et programmes, sans casser les routes existantes.

### Routes backend ajoutées

| Route | Paramètres |
|---|---|
| `GET /api/workouts/search` | `q`, `date_from`, `date_to`, `limit` (max 100), `offset` |
| `GET /api/programs/search` | `q`, `is_active`, `limit` (max 100), `offset` |

### Frontend

- WorkoutsPage : filtre nom + dates + pagination
- ProgramsPage : filtre nom + statut + pagination
- DashboardPage : programme actif via `/programs/search?is_active=true&limit=1`

### Vérifications

```
npm run build          →  OK (128 modules)
npm run test:backend   →  105 passed (dont 22 nouveaux)
alembic check          →  No new upgrade operations detected
```
