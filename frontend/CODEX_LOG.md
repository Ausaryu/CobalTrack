# CobalTrack Frontend — Codex Log

## Date

28 juin 2026

## Objectif de la passe

Initialiser le frontend React/Vite/TypeScript de CobalTrack pour consommer l'API existante, avec authentification JWT fonctionnelle, restauration de session, routes protégées, layout responsive et premières pages de lecture.

## Fichiers créés ou modifiés

- `frontend/package.json` et `frontend/package-lock.json` : dépendances et scripts Vite.
- `frontend/tsconfig*.json` et `frontend/vite.config.ts` : configuration TypeScript/Vite stricte.
- `frontend/.env.example` : URL locale de l'API.
- `frontend/src/shared/api/client.ts` : client HTTP centralisé et gestion des erreurs.
- `frontend/src/shared/api/types.ts` : types alignés sur `backend/docs/API.md`.
- `frontend/src/features/auth/` : login, register, session, logout et guards.
- `frontend/src/app/router.tsx` : routes publiques et privées.
- `frontend/src/shared/components/AppLayout.tsx` : navigation et layout applicatif.
- `frontend/src/features/dashboard/DashboardPage.tsx` : résumé hebdomadaire et configuration API.
- `frontend/src/features/exercises/ExercisesPage.tsx` : liste des exercices globaux.
- `frontend/src/features/workouts/WorkoutsPage.tsx` : liste des séances utilisateur.
- `frontend/src/features/programs/ProgramsPage.tsx` : liste des programmes utilisateur.
- `frontend/src/features/stats/StatsPage.tsx` : placeholder des statistiques détaillées.
- `frontend/src/features/profile/ProfilePage.tsx` : profil utilisateur.
- `frontend/src/styles.css` : styles web-first et navigation mobile.
- `frontend/README.md` : installation, configuration et fonctionnement.
- `.gitignore` : ajout de `node_modules/`.

Aucun fichier backend n'a été modifié pendant cette passe.

## Routes frontend créées

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

Les chemins inconnus sont redirigés vers `/dashboard`, qui renvoie ensuite vers `/login` si aucune session valide n'est disponible.

## Intégration API

`VITE_API_BASE_URL` configure l'origine du backend et vaut par défaut `http://127.0.0.1:8000`. Le fichier `frontend/.env.example` documente cette valeur.

Le client expose les helpers génériques `get`, `post`, `put` et `del`. Il :

- préfixe chaque appel avec l'URL configurée;
- demande et décode les réponses JSON;
- transforme les erreurs FastAPI en `ApiError` lisibles;
- ajoute automatiquement le Bearer token s'il existe;
- signale globalement les `401` afin d'invalider une session expirée.

Endpoints actuellement consommés :

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

## Authentification

- Login JSON avec redirection vers `/dashboard` après succès.
- Register avec validation HTML minimale et redirection après succès.
- JWT stocké dans `localStorage` sous `cobaltrack.authToken` pour le MVP.
- Session restaurée au démarrage par `GET /api/auth/me`.
- `ProtectedRoute` redirige les visiteurs anonymes vers `/login`.
- `GuestRoute` redirige les utilisateurs connectés vers `/dashboard`.
- Logout stateless : appel API tenté, puis suppression locale garantie même si le backend est indisponible.
- Toute réponse privée `401` supprime le token et déclenche la redirection d'authentification.

## Vérifications

Commandes exécutées :

```bash
cd frontend
npm install
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Résultats :

```text
npm install     76 packages ajoutés, 0 vulnérabilité
npm run build   TypeScript OK, Vite production build OK
                 107 modules transformés
npm run preview entrée SPA servie, accès direct à /dashboard en HTTP 200
```

Le bundle produit comprend l'HTML, le CSS responsive et le JavaScript applicatif dans `frontend/dist/`.

## Points d'attention

- Les écrans métier sont volontairement en lecture seule pour cette première passe.
- La page `/stats` n'affiche pas encore la progression détaillée par exercice.
- Le JWT dans `localStorage` correspond au choix MVP et devra être réévalué avant une exposition publique.
- Les listes complètes ne sont pas paginées; le backend et le frontend devront évoluer ensemble si le volume augmente.
- Aucun framework de tests frontend ni lint supplémentaire n'a été introduit.
- Le déploiement d'une SPA nécessite de rediriger les routes inconnues vers `index.html` côté serveur web.
