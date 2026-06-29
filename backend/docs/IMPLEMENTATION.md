# Backend CobalTrack — première implémentation

## Contenu

Le backend se trouve entièrement dans `backend/` :

- `app/core/` : configuration, connexion SQLite et sécurité JWT ;
- `app/models/` : les 11 tables du schéma MVP du README ;
- `app/schemas/` : contrats Pydantic d'entrée et de sortie ;
- `app/services/` : authentification et logique CRUD ;
- `app/routers/` : routes FastAPI ;
- `app/scripts/import_exercises.py` : import JSON idempotent ;
- `alembic/` : configuration et migration initiale ;
- `tests/` : healthcheck, auth, permissions, ressources imbriquées et import.

Le README racine reste la source de vérité fonctionnelle et n'a pas été modifié.

## Routes disponibles

Toutes les routes, sauf le healthcheck, nécessitent un token Bearer.

```text
GET    /api/health
GET    /api/config

POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/me
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

GET    /api/stats/dashboard
GET    /api/stats/exercises/{exercise_id}
```

Les workouts, programmes et statistiques sont filtrés sur l'utilisateur connecté. Les exercices restent globaux et leurs mutations sont réservées aux administrateurs. Leurs personnalisations sont stockées séparément dans `UserExercise` et filtrées sur l'utilisateur. Les statistiques calculent à la volée le volume et l'e1RM selon `Exercise.tracking_type` : charge externe, poids du corps assisté ou lesté et répétitions seules sont distingués ; cardio et temps ne produisent ni volume musculaire ni e1RM.

Le contrat destiné au frontend est documenté dans `docs/API.md`.

## Installation et lancement

Depuis la racine du dépôt :

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

L'API est alors disponible sur `http://127.0.0.1:8000`, la documentation OpenAPI sur `/docs`, et le healthcheck sur `/api/health`.

En environnement partagé, définir au minimum un secret JWT aléatoire :

```bash
export SECRET_KEY='replace-with-a-long-random-secret'
export BACKEND_CORS_ORIGINS='http://localhost:5173,http://127.0.0.1:5173'
```

La base par défaut est `backend/cobaltrack.db`. Elle peut être remplacée avec `DATABASE_URL`.

## Migrations

```bash
cd backend
alembic upgrade head
alembic current
```

Pour créer une migration après une évolution des modèles :

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

La migration initiale ne s'exécute que via Alembic : le démarrage de l'API ne recrée ni ne détruit automatiquement les tables.

## Import du dataset

Exécuter d'abord les migrations, puis :

```bash
cd backend
python -m app.scripts.import_exercises /chemin/vers/exercises.json
```

Une source peut être imposée :

```bash
python -m app.scripts.import_exercises /chemin/vers/exercises.json --source exercise-db
```

Le script accepte un tableau JSON direct ou un objet contenant `exercises`, `data` ou `results`. Il reconnaît les variantes courantes en camelCase et snake_case, ignore les entrées sans nom, utilise `external_id`/`externalId`/`id` pour les mises à jour, déduplique les muscles secondaires et ne crée aucun utilisateur.

## Tests

```bash
cd backend
pytest -q
```

## Suivi spécifique des performances

La migration `20260629_0005` ajoute des colonnes nullable aux séries et exercices planifiés pour
l'assistance, le lest, le poids du corps, la durée, la distance, les calories et la résistance.
`weight` et `target_weight` sont conservés sans conversion pour la compatibilité historique.
Les formulaires frontend choisissent les champs visibles à partir de `Exercise.tracking_type`.

La migration `20260629_0006` ajoute `users.current_bodyweight_kg`, nullable et validé entre 0 et
400 kg par l'API. La valeur du profil sert uniquement de défaut lors de l'écriture d'une série
`BODYWEIGHT_REPS`, `ASSISTED_BODYWEIGHT_REPS` ou `ADDED_BODYWEIGHT_REPS`. Elle est copiée dans
`workout_sets.bodyweight` afin de figer l'historique ; modifier ensuite le profil ne réécrit aucune
ancienne séance. Une valeur `bodyweight` explicitement envoyée reste prioritaire.

## Points restant à faire

- Une déconnexion serveur avec révocation demanderait une liste de tokens révoqués. Le MVP utilise un JWT stateless : `/api/auth/logout` confirme la déconnexion et le client supprime le token.
- Les contrats de stats existants restent orientés force (`max_weight`, `best_e1rm`) et n'exposent pas encore de records dédiés de distance, durée, calories, assistance ou lest.
- Les statistiques avancées par groupe musculaire et la détection de stagnation restent à implémenter; le dashboard MVP et la progression par exercice sont disponibles.
