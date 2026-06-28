# CobalTrack Backend — Codex Log

## Date

28 juin 2026

## Objectif de la passe

Vérifier l'implémentation backend existante sans modifier le scope fonctionnel : démarrage FastAPI, migrations SQLite, authentification JWT, permissions par utilisateur, référentiel global d'exercices, personnalisation via `UserExercise`, import idempotent et tests automatisés.

## Fichiers vérifiés

- `README.md` : source de vérité fonctionnelle et schéma MVP.
- `backend/app/main.py` : création de l'application et préfixe `/api`.
- `backend/app/core/config.py` : configuration et valeurs par défaut.
- `backend/app/core/database.py` : moteur SQLAlchemy SQLite et clés étrangères.
- `backend/app/core/security.py` : hash des mots de passe et JWT.
- `backend/app/models/` : modèles utilisateur, exercices, séances et programmes.
- `backend/app/schemas/` : contrats Pydantic.
- `backend/app/routers/` : routes auth, exercices, séances et programmes.
- `backend/app/services/` : logique CRUD, authentification et filtrage par utilisateur.
- `backend/app/scripts/import_exercises.py` : import JSON relançable.
- `backend/alembic/env.py` et `backend/alembic/versions/20260628_0001_initial_mvp.py` : configuration et migration initiale.
- `backend/tests/` : tests API, permissions et import.
- `backend/requirements.txt`, `backend/requirements-dev.txt` et `backend/pyproject.toml` : dépendances et configuration Pytest.

## Fichiers modifiés

- `backend/tests/test_api.py` : ajout d'un test pour `/docs` et d'un contrôle paramétré vérifiant que chaque route privée renvoie `401` sans Bearer token.
- `backend/tests/test_import_exercises.py` : ajout d'une assertion confirmant que l'import ne crée aucun utilisateur.
- `backend/CODEX_LOG.md` : création du présent journal de vérification.

Aucun fichier frontend et aucun modèle fonctionnel n'ont été modifiés pendant cette passe.

## Routes disponibles

Routes publiques confirmées :

```text
GET    /api/health
POST   /api/auth/register
POST   /api/auth/login
GET    /docs
```

Routes protégées par Bearer token confirmées :

```text
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/exercises
POST   /api/exercises
GET    /api/exercises/{exercise_id}
PUT    /api/exercises/{exercise_id}
DELETE /api/exercises/{exercise_id}
GET    /api/exercises/{exercise_id}/personalization
PUT    /api/exercises/{exercise_id}/personalization
DELETE /api/exercises/{exercise_id}/personalization

GET    /api/workouts
POST   /api/workouts
GET    /api/workouts/{workout_id}
PUT    /api/workouts/{workout_id}
DELETE /api/workouts/{workout_id}

GET    /api/programs
POST   /api/programs
GET    /api/programs/{program_id}
PUT    /api/programs/{program_id}
DELETE /api/programs/{program_id}
```

Le serveur Uvicorn a démarré correctement. Les contrôles HTTP réels ont confirmé `200` sur `/api/health`, `200` sur `/docs` et `401` avec l'en-tête `WWW-Authenticate: Bearer` sur `/api/workouts` sans token.

## Base de données

- Moteur : SQLite via SQLAlchemy 2.
- URL par défaut : `sqlite:///./cobaltrack.db`.
- Fichier par défaut lorsque les commandes sont lancées depuis `backend/` : `backend/cobaltrack.db`.
- Migration appliquée : `20260628_0001 (head)`.
- `alembic check` : aucune nouvelle opération détectée, donc les modèles et la migration sont synchronisés.
- Les clés étrangères SQLite sont activées à la connexion avec `PRAGMA foreign_keys=ON`.

Tables principales confirmées :

```text
users
exercises
exercise_secondary_muscles
user_exercises
workout_sessions
workout_exercises
workout_sets
programs
program_days
program_exercises
alembic_version
```

Les exercices sont globaux et ne portent pas de `user_id`. Les séances et programmes portent un `user_id`; leurs opérations de lecture, modification et suppression filtrent simultanément sur l'identifiant de ressource et l'utilisateur connecté. Les personnalisations sont isolées par la contrainte unique `(user_id, exercise_id)` de `UserExercise`.

## Authentification

- `register` normalise l'email, refuse les doublons et stocke uniquement un hash Argon2 du mot de passe.
- `login` vérifie le mot de passe et émet un JWT signé.
- `me` récupère l'utilisateur depuis le sujet `sub` du JWT.
- `logout` est stateless : l'API confirme l'opération et le client doit supprimer son token.
- Les JWT utilisent l'algorithme `HS256` et expirent par défaut après 24 heures.
- `OAuth2PasswordBearer` impose un Bearer token sur toutes les routes privées via la dépendance `get_current_user`.
- Le secret de développement par défaut doit être remplacé avec `SECRET_KEY` dans tout environnement partagé.

## Import du dataset

Commande depuis le dossier `backend/` :

```bash
python -m app.scripts.import_exercises /chemin/vers/exercises.json
```

Une source peut être forcée :

```bash
python -m app.scripts.import_exercises /chemin/vers/exercises.json --source exercise-db
```

Formats acceptés : tableau JSON direct, objet contenant `exercises`, `data` ou `results`, ou objet représentant un exercice unique. Le script accepte les variantes usuelles camelCase et snake_case.

Comportement confirmé :

- mise à jour sur `external_id`, `externalId` ou `id` sans dupliquer l'exercice ;
- repli sur le couple nom/source pour les entrées sans identifiant externe ;
- déduplication insensible à la casse des muscles secondaires ;
- relances successives sans violation de contrainte ni ligne dupliquée ;
- entrées sans nom ignorées et comptabilisées ;
- aucune création d'utilisateur et aucune association à un `user_id`.

Champs principaux importés : nom, identifiant externe, catégorie, partie du corps, cible, groupe musculaire, équipement, instructions, image, GIF, source et muscles secondaires.

## Tests

Commande exécutée :

```bash
cd backend
pytest -q
```

Résultat final :

```text
26 passed in 0.53s
```

Les tests couvrent le healthcheck, `/docs`, l'authentification, le hash du mot de passe, toutes les routes privées sans token, le CRUD, les ressources imbriquées, l'isolation des workouts et programmes, le caractère global des exercices, l'isolation de `UserExercise` et l'idempotence de l'import.

Contrôles complémentaires exécutés :

```text
python -m compileall -q app tests alembic    OK
alembic upgrade head                         OK
alembic current                              20260628_0001 (head)
alembic check                                No new upgrade operations detected
```

## Points d'attention

- Le logout est stateless et ne révoque pas un JWT déjà émis côté serveur.
- Dans ce MVP personnel, tout utilisateur authentifié peut créer, modifier ou supprimer un exercice global.
- Le secret JWT par défaut est réservé au développement et doit être remplacé hors environnement local.
- Les statistiques et le dashboard décrits dans le README ne sont pas encore implémentés côté API.
- La base SQLite convient au scope actuel mais impose de conserver des migrations prudentes lors des évolutions de schéma.

## Prochaines étapes recommandées

1. Définir la politique d'administration du référentiel global d'exercices avant toute ouverture multi-utilisateur.
2. Ajouter les routes de statistiques et de dashboard prévues par le README, sans anticiper les fonctionnalités hors scope.
3. Ajouter des tests de validation métier sur les limites de RPE, répétitions, durées et plages de programme.
4. Définir `SECRET_KEY` dans la configuration de chaque environnement non local.
5. Ajouter une stratégie de sauvegarde simple du fichier SQLite avant les futures migrations de production.

## Passe suivante — validations et statistiques

### Date

28 juin 2026

### Objectif

Renforcer et verrouiller par des tests les validations métier du MVP, puis ajouter les premières statistiques backend prévues dans le README. Tous les calculs sont effectués à la volée à partir des séances de l'utilisateur connecté, sans nouvelle table et sans modification du frontend.

### Fichiers modifiés

- `backend/app/main.py` : branchement du router de statistiques sous `/api`.
- `backend/app/schemas/exercise.py` : rejet des noms vides ou composés uniquement d'espaces et normalisation de `external_id`.
- `backend/app/schemas/stats.py` : contrats du dashboard, des records, des tops par volume et de la progression d'un exercice.
- `backend/app/services/stats_service.py` : calculs de volume, e1RM, synthèse hebdomadaire et historique par exercice avec filtrage `user_id`.
- `backend/app/routers/stats.py` : nouvelles routes privées de statistiques.
- `backend/docs/IMPLEMENTATION.md` : ajout des routes de statistiques et mise à jour des limites restantes.
- `backend/tests/test_api.py` : ajout des routes de statistiques au contrôle global des Bearer tokens.
- `backend/tests/test_validations.py` : tests des limites métier et de l'unicité de `external_id`.
- `backend/tests/test_stats.py` : tests des formules, du dashboard, de la progression, d'OpenAPI et de l'isolation utilisateur.
- `backend/CODEX_LOG.md` : ajout de la présente section.

### Routes ajoutées

```text
GET /api/stats/dashboard
GET /api/stats/exercises/{exercise_id}
```

Les deux routes utilisent `get_current_user` via `CurrentUser`, apparaissent dans `/docs` et retournent `401` avec `WWW-Authenticate: Bearer` en l'absence de token.

Le dashboard retourne la dernière séance, le nombre de séances de la semaine courante, le volume hebdomadaire, jusqu'à cinq records simples et jusqu'à cinq exercices classés par volume total. La progression d'un exercice retourne le nombre de séances, les maxima de charge et répétitions, le meilleur e1RM, le plus grand volume de séance et un historique par séance.

### Validations ajoutées

Validations déjà présentes dans les schémas et désormais couvertes explicitement par les tests :

- `WorkoutSet` : `weight >= 0`, `reps >= 0`, `0 <= rpe <= 10`, `rest_seconds >= 0` et `order_index >= 0`.
- `WorkoutSession` : `duration_minutes >= 0`, `1 <= perceived_difficulty <= 10` et `performed_at` requis à la création.
- `Program` : `1 <= days_per_week <= 7`.
- `ProgramExercise` : `sets_count > 0`, répétitions positives ou nulles, `max_reps >= min_reps`, charge et repos positifs ou nuls, `0 <= target_rpe <= 10` et `order_index >= 0`.

Durcissements ajoutés pendant cette passe :

- `Exercise.name` est nettoyé et une chaîne vide ou uniquement composée d'espaces renvoie `422`.
- `Exercise.external_id` est nettoyé; une chaîne vide devient `null` et une valeur dupliquée renvoie `409 Conflict` via la contrainte unique existante.

### Calculs de statistiques

```text
volume = weight * reps
e1RM = weight * (1 + reps / 30)
```

Les résultats numériques sont arrondis à deux décimales. Un poids ou un nombre de répétitions absent produit un volume nul. L'e1RM vaut zéro si le poids ou les répétitions sont absents ou nuls. Les séances, séries et agrégats sont toujours filtrés sur `WorkoutSession.user_id`.

### Tests

Commande exécutée :

```bash
cd backend
pytest -q
```

Résultat final :

```text
54 passed in 2.04s
```

Les nouveaux tests couvrent les valeurs invalides avec réponse `422`, le conflit d'identifiant externe, les cas limites des formules, le dashboard vide et alimenté, la progression avec et sans données, l'exercice inexistant en `404`, l'isolation entre deux utilisateurs et la publication des routes dans OpenAPI.

État des migrations :

```text
alembic current    20260628_0001 (head)
alembic check      No new upgrade operations detected
```

Aucune migration n'a été ajoutée car cette passe ne change pas le schéma SQLite.

### Points d'attention

- Les records et agrégats sont calculés à la volée; cette approche est adaptée au volume du MVP mais devra être mesurée avant une montée en charge.
- Les statistiques restent volontairement simples : le volume hebdomadaire couvre la semaine civile courante et le top des exercices utilise le volume total historique.
- `max_volume` correspond au meilleur volume cumulé pour cet exercice dans une séance.
- Aucun cache, aucune table d'agrégats et aucune précomputation n'ont été ajoutés.
- Le dashboard frontend n'est pas encore implémenté; seules les routes backend sont disponibles.

## Passe suivante — préparation frontend

### Date

28 juin 2026

### Objectif

Préparer l'API FastAPI pour sa consommation par le frontend React/Vite sans changer le scope métier : vérifier les contrats de réponse, ajouter une configuration CORS locale explicite, exposer une configuration publique minimale et documenter les routes avec des exemples typables côté TypeScript.

### Fichiers modifiés

- `backend/app/core/config.py` : ajout de la version API et de `BACKEND_CORS_ORIGINS`, avec rejet explicite du wildcard.
- `backend/app/main.py` : activation de `CORSMiddleware` et ajout de `GET /api/config`.
- `backend/app/schemas/config.py` : contrat public avec les clés JSON `appName` et `apiVersion`.
- `backend/tests/test_frontend_api.py` : tests de config publique, CORS, erreurs et réponses imbriquées.
- `backend/docs/API.md` : documentation d'intégration frontend pour toutes les routes.
- `backend/docs/IMPLEMENTATION.md` : ajout de `/api/config`, de la variable CORS et du lien vers le contrat API.
- `backend/CODEX_LOG.md` : ajout de la présente section.

### Routes ajoutées ou documentées

Nouvelle route publique :

```text
GET /api/config
```

Réponse stable :

```json
{
  "appName": "CobalTrack",
  "apiVersion": "0.1.0"
}
```

Toutes les routes publiques, privées, CRUD et statistiques sont désormais documentées dans `backend/docs/API.md` avec leur méthode, authentification, body, réponse simplifiée et erreurs principales.

### CORS

`CORSMiddleware` autorise par défaut uniquement :

```text
http://localhost:5173
http://127.0.0.1:5173
```

La configuration se fait avec une liste séparée par des virgules :

```bash
export BACKEND_CORS_ORIGINS='https://app.example.com,https://preview.example.com'
```

Le wildcard `*` est refusé à la validation de la configuration. Les méthodes autorisées sont `GET`, `POST`, `PUT`, `DELETE` et `OPTIONS`; les headers frontend nécessaires sont `Authorization` et `Content-Type`. Les tests confirment qu'une origine Vite locale reçoit les headers CORS et qu'une origine inconnue est refusée.

### Réponses API

L'audit n'a nécessité aucune rupture de schema :

- `GET /api/exercises` retourne une liste stable d'exercices avec muscles secondaires.
- La liste et le détail des workouts partagent `WorkoutRead` et incluent exercices et séries imbriqués.
- La liste et le détail des programmes partagent `ProgramRead` et incluent jours et exercices imbriqués.
- Les réponses de statistiques correspondent aux contrats de `backend/app/schemas/stats.py`.
- Les mises à jour imbriquées sont documentées : un champ omis conserve la collection, une liste fournie la remplace et une liste vide la supprime.

Les erreurs fréquentes restent simples : `401` pour l'authentification, `404` pour une ressource absente ou non détenue, `409` pour les conflits d'email ou d'identifiant externe et `422` pour les validations Pydantic.

### Tests

Commande exécutée :

```bash
cd backend
pytest -q
```

Résultat final :

```text
60 passed in 2.14s
```

Les nouveaux tests couvrent `/api/config` sans authentification, les origines CORS autorisées et refusées, le rejet du wildcard, la stabilité des relations imbriquées pour exercices, workouts et programmes, ainsi que les réponses d'erreur courantes.

État des migrations :

```text
alembic current    20260628_0001 (head)
alembic check      No new upgrade operations detected
```

Aucune migration n'a été créée car le schéma SQLite n'a pas changé.

### Points d'attention

- Les origines de déploiement devront être déclarées explicitement dans `BACKEND_CORS_ORIGINS`.
- Le frontend doit stocker le JWT, envoyer `Authorization: Bearer <token>` et supprimer le token lors du logout stateless.
- Les listes de workouts et programmes retournent actuellement les objets imbriqués complets; ce contrat est pratique pour le MVP mais pourra nécessiter pagination ou réponses allégées si les volumes augmentent.
- Aucun dossier frontend n'a été modifié pendant cette passe.

## Passe suivante — préparation usage local et serveur

### Date

28 juin 2026

### Objectif

Ajouter le script de sauvegarde SQLite, les variables d'environnement documentées et le `.env.example`.

### Fichiers créés

- `backend/.env.example` : `SECRET_KEY`, `DATABASE_URL`, `BACKEND_CORS_ORIGINS` avec note LAN.
- `backend/app/scripts/backup_sqlite.py` : copie horodatée de la base SQLite locale.
- `backend/tests/test_backup_sqlite.py` : trois tests pour le script de backup.

### Script de sauvegarde

```bash
cd backend
python -m app.scripts.backup_sqlite
# → Backup created: /chemin/backend/backups/cobaltrack_20260628_120000.db
```

La fonction `backup(db_path, backup_dir)` est testable indépendamment des settings. Elle ajoute un compteur si un fichier du même timestamp existe déjà.

### Vérifications

```bash
pytest -q
```

```text
63 passed in 2.03s
```

```bash
alembic check
```

```text
No new upgrade operations detected.
```

### Points d'attention

- `backup_sqlite.py` utilise `shutil.copy2` : pour une base en écriture intensive, préférer `sqlite3.connect(src).backup(dest)` pour une copie cohérente.
- Le dossier `backend/backups/` n'est pas versionné par défaut.

## Passe suivante — scripts racine et documentation serveur

### Date

28 juin 2026

### Objectif

Aucune modification backend dans cette passe. Les scripts racine (`backup:db`, `test:backend` en `python -m pytest`) et la documentation `docs/` ont été finalisés côté racine.

Voir `CODEX_LOG.md` racine.

## Passe suivante — pagination backend des exercices

### Date

28 juin 2026

### Objectif

Ajouter des routes paginées et filtrées pour le référentiel d'exercices, sans casser la route `GET /api/exercises` existante.

### Backend — routes ajoutées

- `GET /api/exercises/search` : recherche paginée avec `q`, `muscle_group`, `equipment`, `limit` (max 100), `offset`. Réponse `ExerciseListResponse` (`items`, `total`, `limit`, `offset`).
- `GET /api/exercises/filters` : valeurs distinctes de groupes musculaires et d'équipements pour alimenter les dropdowns.

Les nouvelles routes sont placées avant `/{exercise_id}` dans le router pour éviter l'erreur 422 de conversion int.

Le filtre `muscle_group` utilise `COALESCE(muscle_group, target, body_part)` pour être cohérent avec la logique frontend.

### Fichiers modifiés

- `backend/app/schemas/exercise.py` : ajout `ExerciseListResponse`, `ExerciseFiltersResponse`.
- `backend/app/services/exercise_service.py` : ajout `search_exercises()`, `get_exercise_filters()`.
- `backend/app/routers/exercises.py` : ajout routes `/search` et `/filters`.
- `backend/tests/test_api.py` : ajout des nouvelles routes dans le test 401.
- `backend/tests/test_exercise_search.py` : 20 nouveaux tests.
- `backend/docs/API.md` : documentation des nouvelles routes.

### Vérifications

```
pytest -q  →  83 passed
alembic check  →  No new upgrade operations detected
```

### Points d'attention

- `GET /api/exercises` reste inchangé pour compatibilité avec WorkoutsPage, ProgramsPage, StatsPage.
- `limit > 100` retourne 422.

## Passe suivante — pagination séances et programmes

### Date

28 juin 2026

### Objectif

Ajouter des routes de recherche paginée pour les séances et programmes.

### Routes ajoutées

- `GET /api/workouts/search` : `q`, `date_from`, `date_to`, `limit` (max 100, défaut 20), `offset`. Tri `performed_at DESC, id DESC`. Réponse `WorkoutListResponse`.
- `GET /api/programs/search` : `q` (nom ou objectif), `is_active`, `limit`, `offset`. Tri `is_active DESC, id DESC`. Réponse `ProgramListResponse`.

### Fichiers modifiés

- `app/schemas/workout.py` : `WorkoutListResponse`.
- `app/schemas/program.py` : `ProgramListResponse`.
- `app/services/workout_service.py` : `search_workouts()`.
- `app/services/program_service.py` : `search_programs()`.
- `app/routers/workouts.py` : route `/search` placée avant `/{workout_id}`.
- `app/routers/programs.py` : route `/search` placée avant `/{program_id}`.
- `tests/test_api.py` : nouvelles routes dans le test 401.
- `tests/test_workout_program_search.py` (nouveau) : 22 tests.

### Vérifications

```
pytest -q  →  105 passed
alembic check  →  No new upgrade operations detected
```

## Passe suivante — traductions multilingues des exercices

### Date

28 juin 2026

### Changements

- ajout de `exercises.translations` (`TEXT`, nullable) via la migration `20260628_0002` ;
- ajout du champ aux modèles SQLAlchemy et schémas `ExerciseCreate`, `ExerciseUpdate`, `ExerciseRead` ;
- import des dictionnaires localisés sans jamais stringifier un dictionnaire dans un champ visible ;
- conservation de l'anglais dans les champs natifs lorsqu'il existe, sinon première langue non vide ;
- support localisé optionnel de `secondary_muscles` sous forme de tableaux dans le JSON ;
- commande `python -m app.scripts.import_exercises --repair-translations`, avec `--repair-instructions` conservé comme alias ;
- réparation des anciens champs visibles contenant du JSON sérialisé et fusion dans `translations`.

### Format

`translations` stocke un JSON texte de forme `{"fr":{"name":"…"},"en":{"name":"…"}}`. Aucun service de traduction automatique ni aucune API externe ne sont utilisés. Les filtres restent basés sur les champs natifs anglais.

### Vérifications

```text
pytest -q         → 109 passed
alembic check     → No new upgrade operations detected
npm test:backend  → 109 passed
```

## Passe suivante — recherche normalisée et multilingue

### Date

28 juin 2026

### Changements

- `GET /api/exercises/search` cherche dans les champs textuels natifs et les traductions JSON ;
- normalisation par `casefold`, suppression des accents et des caractères non alphanumériques ;
- `pull-up`, `pull up`, `pull_up` et `Pull Up` deviennent équivalents ;
- filtres SQL groupe/équipement conservés avant le filtrage Python ;
- `total`, `offset` et `limit` calculés après la correspondance normalisée.
- classement des résultats : nom exact, nom partiel, puis autres champs textuels.

### Vérification

```text
pytest tests/test_exercise_search.py -q  → 29 passed avant ajout du classement
npm run test:backend                     → 120 passed avant ajout du classement
py_compile                               → OK après ajout du classement
recherche DB locale `traction`, limit=1 → `pull-up` en premier résultat
```
