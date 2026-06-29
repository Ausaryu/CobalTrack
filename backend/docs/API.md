# CobalTrack Backend API

## Base URL

Développement local :

```text
http://127.0.0.1:8000
```

Toutes les routes métier utilisent le préfixe `/api`. La documentation interactive est disponible sur `/docs` et le contrat OpenAPI sur `/openapi.json`.

## Authentification

`register` et `login` retournent un JWT. Le frontend doit l'envoyer sur chaque route privée :

```http
Authorization: Bearer <access_token>
```

Le login reçoit un body JSON, pas un formulaire OAuth2. Le token expire après 24 heures par défaut. Le logout est stateless : le frontend doit supprimer le token local.

Réponse d'authentification :

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "user",
    "is_active": true,
    "is_admin": true,
    "created_at": "2026-06-28T12:00:00Z",
    "updated_at": "2026-06-28T12:00:00Z"
  }
}
```

## CORS

Par défaut, l'API accepte uniquement les origines Vite locales :

```text
http://localhost:5173
http://127.0.0.1:5173
```

La variable `BACKEND_CORS_ORIGINS` permet une liste séparée par des virgules :

```bash
export BACKEND_CORS_ORIGINS='https://app.example.com,https://preview.example.com'
```

Le wildcard `*` est refusé. Les méthodes `GET`, `POST`, `PUT`, `DELETE` et `OPTIONS`, ainsi que les headers `Authorization` et `Content-Type`, sont autorisés.

## Erreurs

Les erreurs FastAPI utilisent toujours une clé `detail` :

```json
{"detail": "Exercise not found"}
```

Pour une validation `422`, `detail` est une liste structurée par Pydantic. Codes courants :

| Code | Signification |
|---|---|
| `401` | Bearer token absent, invalide ou expiré |
| `403` | Action réservée aux administrateurs |
| `404` | Ressource inexistante ou non détenue par l'utilisateur |
| `409` | Nom d'utilisateur ou `external_id` déjà utilisé, ou exercice encore référencé |
| `422` | Body ou paramètres invalides |

## Routes publiques

### Healthcheck

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/health` | Non | Aucun | `{"status":"ok"}` | — |

### Configuration publique

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/config` | Non | Aucun | `{"appName":"CobalTrack","apiVersion":"0.1.0"}` | — |

### Création de compte

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Non | `RegisterRequest` | Token + utilisateur, `201` | `409`, `422` |

```json
{
  "username": "user",
  "password": "minimum-8-characters"
}
```

### Connexion

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `POST` | `/api/auth/login` | Non | Pseudo et mot de passe JSON | Token + utilisateur | `401`, `422` |

```json
{
  "username": "user",
  "password": "minimum-8-characters"
}
```

## Routes privées

### Utilisateur connecté

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/auth/me` | Bearer | Aucun | Utilisateur connecté | `401` |
| `PUT` | `/api/auth/me` | Bearer | `{"current_bodyweight_kg":74.5}` | Utilisateur mis à jour | `401`, `422` |
| `POST` | `/api/auth/logout` | Bearer | Aucun | `{"message":"Logged out"}` | `401` |

`current_bodyweight_kg` est nullable et doit être compris entre 0 et 400 kg lorsqu'il est
renseigné. Il est renvoyé dans `UserRead` lors de l'inscription, de la connexion et des appels à
`/api/auth/me`.

### Exercices

Les exercices sont globaux. Ils ne contiennent jamais de `user_id`. Les personnalisations sont stockées séparément par utilisateur. La création, la modification et la suppression d'un exercice global nécessitent `is_admin=true`.

Les champs natifs (`name`, `category`, `body_part`, `target`, `muscle_group`, `equipment`, `instructions`) restent en anglais lorsqu'une valeur anglaise existe. Le champ nullable `translations` contient un document JSON sérialisé en texte, organisé par langue puis par champ. La recherche interroge les champs natifs et les traductions ; les filtres restent basés sur les champs natifs.

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/exercises` | Bearer | Aucun | Liste complète de `ExerciseRead` (compatibilité) | `401` |
| `GET` | `/api/exercises/search` | Bearer | Query params | `ExerciseListResponse` paginé | `401`, `422` |
| `GET` | `/api/exercises/filters` | Bearer | Aucun | `ExerciseFiltersResponse` | `401` |
| `POST` | `/api/exercises` | Admin | `ExerciseCreate` | Exercice créé, `201` | `401`, `403`, `409`, `422` |
| `GET` | `/api/exercises/{exercise_id}` | Bearer | Aucun | `ExerciseRead` | `401`, `404` |
| `PUT` | `/api/exercises/{exercise_id}` | Admin | Champs à modifier | `ExerciseRead` | `401`, `403`, `404`, `409`, `422` |
| `DELETE` | `/api/exercises/{exercise_id}` | Admin | Aucun | Aucun contenu, `204` | `401`, `403`, `404`, `409` |

### Recherche paginée — `GET /api/exercises/search`

Query params optionnels :

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `q` | string | — | Recherche normalisée dans les champs natifs et traduits ; ignore casse, accents, espaces et ponctuation |
| `muscle_group` | string | — | Filtre par groupe musculaire (COALESCE muscle_group, target, body_part) |
| `equipment` | string | — | Filtre par équipement |
| `favorite_only` | bool | false | Limite les résultats paginés aux favoris de l'utilisateur connecté |
| `limit` | int 1–100 | 50 | Nombre de résultats |
| `offset` | int ≥ 0 | 0 | Décalage pour la pagination |

Réponse `ExerciseListResponse` :

```json
{
  "items": [ /* ExerciseRead[] */ ],
  "total": 1324,
  "limit": 50,
  "offset": 0
}
```

### Filtres disponibles — `GET /api/exercises/filters`

Réponse `ExerciseFiltersResponse` :

```json
{
  "muscle_groups": ["back", "chest", "legs"],
  "equipment": ["barbell", "dumbbell", "machine"]
}
```

Les valeurs proviennent de `COALESCE(muscle_group, target, body_part)` pour les groupes, et directement du champ `equipment`.

### Compatibilité — `GET /api/exercises`

Cette route retourne toujours la liste complète (sans pagination). Elle reste disponible pour les consommateurs qui en dépendent (WorkoutsPage, ProgramsPage, StatsPage). La page Exercices et le sélecteur d'exercices utilisent désormais `/search`.

Body de création complet, avec tous les champs sauf `name` optionnels :

```json
{
  "external_id": "bench-press",
  "name": "Bench press",
  "category": "strength",
  "body_part": "chest",
  "target": "pectorals",
  "muscle_group": "chest",
  "equipment": "barbell",
  "tracking_type": "WEIGHT_REPS",
  "instructions": "Keep the shoulder blades retracted.",
  "translations": "{\"en\":{\"name\":\"Bench press\"},\"fr\":{\"name\":\"Développé couché\"}}",
  "image_path": null,
  "gif_path": null,
  "source": "exercise-db",
  "secondary_muscles": ["triceps", "front delts"]
}
```

Réponse simplifiée :

```json
{
  "id": 1,
  "external_id": "bench-press",
  "name": "Bench press",
  "category": "strength",
  "body_part": "chest",
  "target": "pectorals",
  "muscle_group": "chest",
  "equipment": "barbell",
  "tracking_type": "WEIGHT_REPS",
  "instructions": "Keep the shoulder blades retracted.",
  "translations": "{\"en\":{\"name\":\"Bench press\"},\"fr\":{\"name\":\"Développé couché\"}}",
  "image_path": null,
  "gif_path": null,
  "source": "exercise-db",
  "created_at": "2026-06-28T12:00:00Z",
  "updated_at": "2026-06-28T12:00:00Z",
  "secondary_muscles": [
    {"id": 1, "muscle_name": "triceps"}
  ]
}
```

### Personnalisation d'un exercice

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/exercises/{exercise_id}/personalization` | Bearer | Aucun | Personnalisation ou `null` | `401`, `404` |
| `PUT` | `/api/exercises/{exercise_id}/personalization` | Bearer | `UserExerciseUpdate` | Personnalisation créée ou mise à jour | `401`, `404`, `422` |
| `DELETE` | `/api/exercises/{exercise_id}/personalization` | Bearer | Aucun | Aucun contenu, `204` | `401`, `404` |

```json
{
  "custom_name": "Bench",
  "custom_notes": "Pause d'une seconde en bas",
  "is_hidden": false,
  "is_favorite": true
}
```

La réponse ajoute `id`, `user_id`, `exercise_id`, `created_at` et `updated_at`.

### Séances

Les listes et détails utilisent le même contrat et incluent les exercices et séries imbriqués.

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/workouts` | Bearer | Aucun | Liste de `WorkoutRead` de l'utilisateur | `401` |
| `POST` | `/api/workouts` | Bearer | `WorkoutCreate` | Séance créée, `201` | `401`, `422` |
| `GET` | `/api/workouts/{workout_id}` | Bearer | Aucun | `WorkoutRead` imbriqué | `401`, `404` |
| `PUT` | `/api/workouts/{workout_id}` | Bearer | Champs à modifier | `WorkoutRead` imbriqué | `401`, `404`, `422` |
| `DELETE` | `/api/workouts/{workout_id}` | Bearer | Aucun | Aucun contenu, `204` | `401`, `404` |

Body de création :

```json
{
  "name": "Push day",
  "performed_at": "2026-06-28",
  "duration_minutes": 60,
  "notes": null,
  "perceived_difficulty": 8,
  "exercises": [
    {
      "exercise_id": 1,
      "order_index": 0,
      "notes": null,
      "sets": [
        {
          "order_index": 0,
          "weight": 80,
          "assistance_weight": null,
          "added_weight": null,
          "bodyweight": null,
          "reps": 8,
          "duration_seconds": null,
          "distance_meters": null,
          "calories": null,
          "resistance_level": null,
          "rpe": 8,
          "rest_seconds": 120,
          "is_warmup": false,
          "is_failure": false,
          "notes": null
        }
      ]
    }
  ]
}
```

La réponse ajoute les identifiants, `user_id`, `created_at`, `updated_at`, `workout_session_id` sur chaque exercice et `workout_exercise_id` sur chaque série. Un exercice inconnu dans le body produit `422`.

Pour `BODYWEIGHT_REPS`, `ASSISTED_BODYWEIGHT_REPS` et `ADDED_BODYWEIGHT_REPS`, si le champ
`bodyweight` d'une série est omis, l'API copie `current_bodyweight_kg` de l'utilisateur connecté
dans la série. Une valeur explicite, y compris `null`, est conservée. Ce snapshot n'est jamais
recalculé lorsque le profil change ; un profil sans poids n'empêche pas la création de la séance.
L'assistance et le lest restent stockés séparément dans `assistance_weight` et `added_weight`.

### Programmes

Les listes et détails utilisent le même contrat et incluent les jours et exercices imbriqués.

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/programs` | Bearer | Aucun | Liste de `ProgramRead` de l'utilisateur | `401` |
| `POST` | `/api/programs` | Bearer | `ProgramCreate` | Programme créé, `201` | `401`, `422` |
| `GET` | `/api/programs/{program_id}` | Bearer | Aucun | `ProgramRead` imbriqué | `401`, `404` |
| `PUT` | `/api/programs/{program_id}` | Bearer | Champs à modifier | `ProgramRead` imbriqué | `401`, `404`, `422` |
| `DELETE` | `/api/programs/{program_id}` | Bearer | Aucun | Aucun contenu, `204` | `401`, `404` |

Body de création :

```json
{
  "name": "Upper / Lower",
  "goal": "Strength",
  "days_per_week": 4,
  "is_active": true,
  "days": [
    {
      "name": "Upper 1",
      "order_index": 0,
      "exercises": [
        {
          "exercise_id": 1,
          "order_index": 0,
          "sets_count": 4,
          "min_reps": 6,
          "max_reps": 8,
          "target_weight": 80,
          "target_assistance_weight": null,
          "target_added_weight": null,
          "target_bodyweight": null,
          "target_duration_seconds": null,
          "target_distance_meters": null,
          "target_calories": null,
          "target_resistance_level": null,
          "target_rpe": 8,
          "rest_seconds": 120,
          "notes": null
        }
      ]
    }
  ]
}
```

Les champs de série et de cible dépendent de `Exercise.tracking_type`. Les anciens champs
`weight` et `target_weight` restent utilisés pour `WEIGHT_REPS`. Les autres types utilisent les
champs assistance, lest, poids du corps, durée, distance, calories ou résistance correspondants.
Tous ces champs additionnels sont nullable afin de préserver les anciennes séances et programmes.

La réponse ajoute les identifiants, `user_id`, `created_at`, `updated_at`, `program_id` sur les jours et `program_day_id` sur les exercices. Un exercice inconnu dans le body produit `422`.

### Statistiques

Toutes les statistiques sont calculées uniquement depuis les séances de l'utilisateur connecté.

| Méthode | URL | Auth | Body | Réponse | Erreurs principales |
|---|---|---|---|---|---|
| `GET` | `/api/stats/dashboard` | Bearer | Aucun | `DashboardSummary` | `401` |
| `GET` | `/api/stats/exercises/{exercise_id}` | Bearer | Aucun | `ExerciseProgress` | `401`, `404` |

Réponse dashboard vide :

```json
{
  "last_workout": null,
  "workouts_this_week": 0,
  "weekly_volume": 0.0,
  "recent_records": [],
  "top_exercises_by_volume": []
}
```

`last_workout` contient `id`, `name`, `performed_at` et `duration_minutes`. Chaque record contient `exercise_id`, `exercise_name`, `performed_at`, `max_weight`, `max_reps` et `best_e1rm`. Chaque top contient `exercise_id`, `exercise_name` et `total_volume`.

Réponse de progression :

```json
{
  "exercise_id": 1,
  "exercise_name": "Bench press",
  "total_sessions": 2,
  "max_weight": 100.0,
  "max_reps": 10,
  "max_volume": 2400.0,
  "best_e1rm": 116.67,
  "history": [
    {
      "performed_at": "2026-06-28",
      "max_weight": 100.0,
      "total_volume": 2400.0,
      "best_e1rm": 116.67
    }
  ]
}
```

Si l'exercice global existe sans donnée pour l'utilisateur, les compteurs valent zéro et `history` est vide. Si l'exercice n'existe pas, la route retourne `404`.

## Contrats de mise à jour

Les routes `PUT` acceptent uniquement les champs à modifier. Pour les champs imbriqués `exercises` ou `days`, fournir la liste remplace la collection existante; omettre le champ conserve la collection. Fournir une liste vide la supprime.
