# CobalTrack Frontend

Interface web React de CobalTrack pour consulter les exercices, séances, programmes et statistiques exposés par l'API FastAPI.

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
/programs
/stats
/profile
```

Un utilisateur sans session est redirigé vers `/login`. Un utilisateur connecté qui visite `/login` ou `/register` est redirigé vers `/dashboard`.

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
GET  /api/exercises
GET  /api/workouts
GET  /api/programs
```

Le contrat complet est décrit dans [`../backend/docs/API.md`](../backend/docs/API.md).

## Structure

```text
src/
  app/               router et client TanStack Query
  features/          auth et pages par domaine
  shared/api/        client HTTP et types TypeScript
  shared/components/ layout et états communs
  shared/config/     variables Vite
  shared/utils/      formatage d'affichage
```

## Limites actuelles

- Les pages affichent des listes en lecture seule; les formulaires CRUD métier viendront ensuite.
- La page Stats est un placeholder; le résumé hebdomadaire est disponible sur le dashboard.
- Le stockage dans `localStorage` est adapté au MVP, mais ne remplace pas une stratégie de sécurité web complète pour un déploiement public.
- Il n'y a pas encore de pagination, recherche ou filtres sur les listes.
- Aucune stack de tests frontend n'est configurée dans cette première passe.
