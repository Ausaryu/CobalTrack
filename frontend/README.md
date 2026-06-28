# CobalTrack Frontend

Interface web React de CobalTrack pour gérer les exercices, séances, programmes et statistiques exposés par l'API FastAPI.

## Stack

- React 19
- Vite 7
- TypeScript
- React Router
- TanStack Query
- CSS responsive sans framework UI

## Prérequis

- Node.js 20.19+ ou 22.12+
- npm
- Backend CobalTrack disponible sur `http://127.0.0.1:8000`

Depuis `backend/`, le serveur peut être lancé avec :

```bash
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

## Configuration

Copier la configuration locale :

```bash
cd frontend
cp .env.example .env
```

Variable disponible :

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Ne pas ajouter `/api` à cette URL : le client ajoute les chemins complets des endpoints. L'origine Vite locale doit aussi être autorisée par `BACKEND_CORS_ORIGINS` côté backend; `http://localhost:5173` et `http://127.0.0.1:5173` le sont par défaut.

## Installation

```bash
cd frontend
npm install
```

## Développement

```bash
npm run dev
```

Vite affiche l'URL locale, généralement `http://localhost:5173`.

## Build de production

```bash
npm run build
```

Le résultat est généré dans `frontend/dist/`. Pour le vérifier localement :

```bash
npm run preview
```

## Routes frontend

Routes publiques :

```text
/login
/register
```

Routes protégées :

```text
/dashboard
/workouts
/exercises
/exercises/:exerciseId
/programs
/stats
/profile
```

Un utilisateur sans session est redirigé vers `/login`. Un utilisateur connecté qui visite `/login` ou `/register` est redirigé vers `/dashboard`.

La page `/exercises` propose la création et la modification dans des fenêtres modales. Chaque exercice dispose d'une page dédiée `/exercises/:exerciseId`. Les écrans `/workouts` et `/programs` conservent leurs panneaux inline. La page `/stats` affiche la progression détaillée de l'exercice sélectionné.

### Détail et édition des exercices

- le titre de chaque carte ouvre `/exercises/:exerciseId` ;
- la page détail affiche le média, les caractéristiques, les muscles secondaires et les instructions ;
- les actions Modifier et Personnalisation s'ouvrent dans une modal responsive ;
- Nouvel exercice et Modifier depuis la liste utilisent également une modal, sans déplacer la recherche ni la pagination ;
- la suppression reste protégée par une confirmation et redirige vers `/exercises` depuis la page détail.

### Langue des exercices

La page détail propose Français, English, Italiano et Türkçe. La préférence est conservée dans `localStorage` sous `cobaltrack.exerciseLanguage` et vaut `fr` par défaut. Les champs traduits utilisent successivement la langue préférée, l'anglais, la valeur native puis la première traduction disponible. Un JSON absent ou invalide ne bloque jamais l'affichage.

Le formulaire de création/modification contient un onglet **Traductions** permettant de renseigner manuellement ces quatre langues. Les traductions existantes sont fusionnées dans le document JSON sans supprimer les champs inconnus.

Les champs natifs fournis par l'API restent en anglais lorsqu'une traduction anglaise existe. La liste utilise le nom traduit et `/api/exercises/search` cherche aussi dans les traductions en ignorant casse, accents et séparateurs. Les filtres groupe musculaire et équipement restent basés sur les champs natifs anglais.

## Ergonomie MVP

La page Exercices utilise `GET /api/exercises/search` pour déléguer la recherche et la pagination au serveur. Les tailles disponibles sont 25, 50 et 100 éléments par page. La recherche par nom, le filtre groupe musculaire et le filtre équipement sont envoyés comme query params au backend — aucun chargement de liste complète n'est nécessaire.

Les options des filtres groupe/équipement proviennent de `GET /api/exercises/filters` (valeurs distinctes calculées une seule fois, mises en cache 5 minutes).

Les filtres favoris et masqués s'appliquent localement sur la page courante uniquement. Ce choix évite un appel API par exercice lorsque le référentiel dépasse 1000 entrées.

Le sélecteur d'exercices (`ExercisePicker`) utilisé dans les formulaires de séance et programme est auto-suffisant. Il appelle directement `/api/exercises/search` avec debounce de 300 ms, et `/api/exercises/filters` pour les groupes. Il affiche jusqu'à 50 résultats et charge le nom de l'exercice sélectionné par ID (`/api/exercises/{id}`, mis en cache indéfiniment).

`GET /api/exercises` (liste complète) est conservé pour la rétrocompatibilité mais n'est plus utilisé côté frontend.

Actions rapides disponibles :

- `Dupliquer` sur une séance : copie les exercices et séries, préfixe le nom et utilise la date du jour;
- `Dupliquer` sur un programme : copie les jours, préfixe le nom et désactive la copie par défaut;
- `Ajouter identique` sur une série ou `Dupliquer la série précédente` pour réduire la ressaisie;
- accès dashboard vers une nouvelle séance, la dernière séance, le programme actif, les exercices et les statistiques.

## Médias d'exercices

Les champs `image_path` et `gif_path` d'un exercice peuvent contenir :

- une URL complète (`https://…`) : utilisée directement ;
- un chemin relatif (`exercises/bench-press.gif`) : résolu en `<VITE_API_BASE_URL>/media/<chemin>`.

Le backend sert le dossier `backend/media/` sur `/media`. Pour ajouter des images locales, déposez-les dans ce dossier et enregistrez le chemin relatif lors de la création ou modification de l'exercice. Si aucun média n'est disponible ou si son chargement échoue, un fallback neutre est affiché.

## Affichage des données sportives

Chaque carte d'exercice affiche désormais :

- une vignette GIF ou image cadrée avec `object-fit: contain`, sinon un fallback discret ;
- les tags groupe musculaire et équipement ;
- les badges favori / masqué pour les personnalisations déjà chargées.

Le détail d'une séance calcule et affiche :

- le volume total de la séance (`poids × répétitions`, hors séries d'échauffement) ;
- le volume, la charge maximale et le meilleur e1RM par exercice ;
- la meilleure série mise en évidence dans le tableau.

La page Statistiques affiche :

- cinq métriques résumées (séances, charge max, e1RM, reps max, volume max) ;
- un graphique SVG de la progression e1RM dans le temps ;
- un tableau avec indicateurs de tendance (+ / -) par séance.

Le Dashboard affiche :

- les barres de volume proportionnel pour chaque exercice du top ;
- les records enrichis avec e1RM mis en valeur.

Les calculs sportifs (`calculateSetVolume`, `calculateE1RM`, `formatWeight`, `formatVolume`, `resolveMediaUrl`) sont centralisés dans `src/shared/utils/training.ts`.

## Authentification

Le JWT est stocké dans `localStorage` sous la clé `cobaltrack.authToken` pour ce MVP. Le client API ajoute automatiquement :

```http
Authorization: Bearer <token>
```

Au chargement, la session est restaurée avec `GET /api/auth/me`. Une réponse `401` supprime la session locale. Le logout appelle `POST /api/auth/logout`, puis supprime toujours le token côté navigateur puisque les JWT sont stateless.

## Endpoints consommés

```text
GET  /api/config
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
GET  /api/stats/dashboard

GET  /api/exercises/search          ← ExercisesPage, ExercisePicker
GET  /api/exercises/filters         ← ExercisesPage, ExercisePicker
GET  /api/exercises/{exercise_id}   ← ExerciseDetailPage, ExercisePicker, useExerciseNames
POST /api/exercises
PUT  /api/exercises/{exercise_id}
DELETE /api/exercises/{exercise_id}
GET  /api/exercises/{exercise_id}/personalization
PUT  /api/exercises/{exercise_id}/personalization
DELETE /api/exercises/{exercise_id}/personalization

GET  /api/workouts
POST /api/workouts
PUT  /api/workouts/{workout_id}
DELETE /api/workouts/{workout_id}

GET  /api/programs
POST /api/programs
PUT  /api/programs/{program_id}
DELETE /api/programs/{program_id}

GET  /api/stats/exercises/{exercise_id}

# Legacy (plus utilisé directement par le frontend, disponible en backend)
GET  /api/exercises
```

Le contrat complet est décrit dans [`../backend/docs/API.md`](../backend/docs/API.md).

## Structure

```text
src/
  app/               router et client TanStack Query
  features/          auth et pages par domaine
  shared/api/        client HTTP, types TypeScript, helpers exercices
  shared/components/ layout, états communs, ExercisePicker
  shared/config/     variables Vite
  shared/hooks/      useExerciseNames (lookup par IDs avec useQueries)
  shared/utils/      formatage, traductions d'exercices et calculs sportifs
```

## Limites actuelles

- Les séances et programmes utilisent encore des panneaux inline sans URL de détail dédiée.
- Les personnalisations d'exercice sont chargées à la demande, car la liste globale ne les embarque pas.
- Le statut masqué/favori n'est donc pas affiché directement sur chaque carte sans ouvrir sa personnalisation.
- Le stockage dans `localStorage` est adapté au MVP, mais ne remplace pas une stratégie de sécurité web complète pour un déploiement public.
- Les listes de séances et programmes n'ont pas encore de recherche, filtres ou pagination.
- La pagination des exercices reste locale : l'intégralité du référentiel est donc téléchargée en une requête.
- Aucune stack de tests frontend n'est encore configurée.
