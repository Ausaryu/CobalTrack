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

## Passe suivante — formulaires MVP

### Date

28 juin 2026

### Objectif

Rendre le frontend MVP utilisable au quotidien en ajoutant la création, la consultation détaillée, la modification et la suppression des ressources principales, tout en conservant le client API, l'authentification et les routes existantes.

### Fichiers modifiés

- `frontend/src/shared/api/types.ts` : types de création et mise à jour pour exercices, personnalisations, séances, séries, programmes et jours.
- `frontend/src/shared/components/` : boutons, champs, cases à cocher, cartes, états vides, en-têtes et dialogue de confirmation réutilisables.
- `frontend/src/features/exercises/ExercisesPage.tsx` : recherche, filtre, CRUD global et accès à la personnalisation.
- `frontend/src/features/exercises/ExerciseForm.tsx` : formulaire du référentiel global.
- `frontend/src/features/exercises/ExercisePersonalization.tsx` : favori, masqué, nom et notes personnelles chargés à la demande.
- `frontend/src/features/workouts/WorkoutsPage.tsx` : liste, création, édition, détail et suppression des séances.
- `frontend/src/features/workouts/WorkoutForm.tsx` : éditeur imbriqué exercices/séries.
- `frontend/src/features/workouts/WorkoutDetail.tsx` : détail des performances enregistrées.
- `frontend/src/features/programs/ProgramsPage.tsx` : liste, création, édition, détail et suppression des programmes.
- `frontend/src/features/programs/ProgramForm.tsx` : éditeur imbriqué jours/exercices planifiés.
- `frontend/src/features/programs/ProgramDetail.tsx` : détail des jours et objectifs.
- `frontend/src/features/stats/StatsPage.tsx` : sélection d'exercice, métriques et historique.
- `frontend/src/features/dashboard/DashboardPage.tsx` : records récents, top volumes et accès rapides.
- `frontend/src/styles.css` : styles responsive des formulaires, tableaux, dialogues et panneaux imbriqués.
- `frontend/README.md` : fonctionnalités et endpoints actualisés.
- `frontend/CODEX_LOG.md` : ajout de la présente section.

Aucun fichier backend n'a été modifié pendant cette passe.

### Fonctionnalités ajoutées

- CRUD exercices globaux avec recherche par nom et filtre musculaire.
- Avertissement explicite avant modification ou suppression du référentiel global.
- Personnalisation utilisateur : favori, masqué, nom personnalisé, notes et réinitialisation.
- CRUD séances avec détail inline, sélection d'exercices et séries dynamiques.
- Champs de série : poids, répétitions, RPE, repos, échauffement et échec.
- CRUD programmes avec jours dynamiques et exercices planifiés.
- Champs de programmation : séries, plage de répétitions, charge, RPE, repos et notes.
- Statistiques détaillées par exercice avec métriques et historique tabulaire.
- Dashboard enrichi avec records, meilleurs volumes et liens rapides.
- États de chargement, erreur, absence de données et confirmations de suppression.

### Endpoints consommés

```text
GET    /api/config
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/exercises
POST   /api/exercises
PUT    /api/exercises/{exercise_id}
DELETE /api/exercises/{exercise_id}
GET    /api/exercises/{exercise_id}/personalization
PUT    /api/exercises/{exercise_id}/personalization
DELETE /api/exercises/{exercise_id}/personalization

GET    /api/workouts
POST   /api/workouts
PUT    /api/workouts/{workout_id}
DELETE /api/workouts/{workout_id}

GET    /api/programs
POST   /api/programs
PUT    /api/programs/{program_id}
DELETE /api/programs/{program_id}

GET    /api/stats/dashboard
GET    /api/stats/exercises/{exercise_id}
```

Les listes de séances et programmes contenant déjà leurs relations imbriquées, les panneaux de détail réutilisent ces réponses sans appel supplémentaire. Les personnalisations sont au contraire récupérées uniquement quand leur panneau est ouvert afin d'éviter un appel par exercice.

### Vérifications

Commande exécutée :

```bash
cd frontend
npm run build
```

Résultat :

```text
TypeScript strict       OK
Vite production build  OK
122 modules transformés
Bundle JS gzip          113.33 kB
Bundle CSS gzip           4.49 kB
```

Aucune commande de lint n'est configurée dans `package.json`. `git diff --check` ne remonte aucune erreur de format de diff.

### Points d'attention

- Les modifications et suppressions d'exercices agissent sur le référentiel global, conformément au backend MVP actuel.
- Le backend refuse la suppression d'un exercice déjà utilisé par une séance ou un programme; le message est affiché dans le dialogue.
- Les personnalisations ne sont pas incluses dans `GET /api/exercises`; elles sont chargées à la demande et leur statut n'est pas visible sur toute la liste.
- Les éditeurs de séances et programmes sont imbriqués mais restent volontairement simples : pas de glisser-déposer ni de duplication rapide.
- Les détails sont des panneaux inline, sans routes `/workouts/{id}` ou `/programs/{id}` côté frontend.
- La pagination, les tests automatisés frontend et les optimisations pour de très grands référentiels restent à ajouter.

## Passe suivante — ergonomie MVP

### Date

28 juin 2026

### Objectif

Améliorer l'utilisation quotidienne du frontend avec un grand référentiel d'exercices, réduire les saisies répétitives et rendre les accès fréquents plus directs, sans modifier le backend ni ajouter de dépendance UI.

### Fichiers modifiés

- `frontend/src/features/exercises/ExercisesPage.tsx` : pagination locale, nouveaux filtres, compteurs et préférences connues.
- `frontend/src/features/exercises/ExercisePersonalization.tsx` : remontée de la personnalisation chargée vers la liste.
- `frontend/src/shared/components/ExercisePicker.tsx` : sélecteur local recherchable et filtrable.
- `frontend/src/features/workouts/WorkoutForm.tsx` : sélecteur amélioré, duplication de séance et de séries.
- `frontend/src/features/workouts/WorkoutsPage.tsx` : action Dupliquer et ouverture d'un détail depuis le dashboard.
- `frontend/src/features/workouts/WorkoutDetail.tsx` : action de duplication.
- `frontend/src/features/programs/ProgramForm.tsx` : sélecteur amélioré et duplication de programme.
- `frontend/src/features/programs/ProgramsPage.tsx` : action Dupliquer et ouverture d'un détail depuis le dashboard.
- `frontend/src/features/programs/ProgramDetail.tsx` : action de duplication.
- `frontend/src/features/dashboard/DashboardPage.tsx` : liens contextuels vers la dernière séance et le programme actif.
- `frontend/src/shared/api/client.ts` : messages français pour les erreurs métier et validations courantes.
- `frontend/src/styles.css` : pagination, sélecteur, actions et corrections responsive.
- `frontend/README.md` : documentation des nouveaux parcours ergonomiques.
- `frontend/CODEX_LOG.md` : ajout de la présente section.

Aucun fichier backend et aucune dépendance npm n'ont été modifiés.

### Améliorations ajoutées

- Pagination locale des exercices avec tailles 25, 50 et 100.
- Compteurs total, résultat filtré et page courante.
- Filtres nom, groupe musculaire et équipement combinables.
- Filtres favoris/masqués limités aux personnalisations déjà chargées, sans requêtes automatiques par exercice.
- Sélection d'exercices recherchable avec filtre musculaire, équipement et limite d'affichage à 50 résultats.
- Duplication d'une séance par préremplissage d'une nouvelle ressource et date ramenée à aujourd'hui.
- Duplication d'un programme avec copie inactive par défaut.
- Duplication d'une série précise et de la dernière série saisie.
- Accès rapides dashboard vers nouvelle séance, dernière séance, exercices, programme actif et stats.
- Messages lisibles pour conflits `409`, validations `422` et ressources absentes.
- Actions, formulaires imbriqués, pagination, sélecteurs et tableaux adaptés aux petites largeurs.

### Endpoints backend consommés

Aucun endpoint supplémentaire n'a été nécessaire. Les duplications utilisent les routes existantes :

```text
POST /api/workouts
POST /api/programs
```

Le référentiel est toujours chargé une seule fois avec `GET /api/exercises`. Les personnalisations restent chargées à la demande avec `GET /api/exercises/{exercise_id}/personalization`.

Le dashboard consomme aussi `GET /api/programs` pour proposer un lien vers le programme actif.

### Vérifications

Commande exécutée :

```bash
cd frontend
npm run build
```

Résultat final :

```text
TypeScript strict       OK
Vite production build  OK
123 modules transformés
Bundle JS gzip          115.34 kB
Bundle CSS gzip           4.96 kB
```

`git diff --check` ne remonte aucune erreur. Aucune commande de lint n'est configurée dans `package.json`.

### Points d'attention

- La pagination est locale; le backend renvoie encore l'intégralité des exercices.
- Les filtres favoris et masqués ne peuvent connaître que les personnalisations ouvertes pendant la session ou déjà présentes dans le cache TanStack Query.
- Le sélecteur recherche localement dans les données chargées et limite le rendu à 50 résultats; il n'offre pas encore de navigation clavier complète de type combobox ARIA.
- La duplication crée une nouvelle ressource uniquement après validation explicite du formulaire.
- Les listes de séances et programmes ne sont pas encore paginées ni filtrables.
- Les tableaux restent horizontalement défilables sur mobile; aucune vue graphique avancée n'a été ajoutée.

## Passe suivante — visuels et lisibilité sportive

### Date

28 juin 2026

### Objectif

Améliorer l'expérience visuelle et la lisibilité des données sportives sans changer le périmètre métier ni ajouter de dépendance lourde. Afficher les médias d'exercices, enrichir les cartes, exposer les calculs de volume et d'e1RM, ajouter un graphique SVG de progression et rendre le dashboard plus sportif.

### Fichiers modifiés

- `backend/app/main.py` : montage du dossier `backend/media/` comme fichiers statiques sur `/media`.
- `backend/media/` : dossier créé pour recevoir les images et GIF locaux des exercices.
- `frontend/src/shared/utils/training.ts` : nouveau fichier centralisant `calculateSetVolume`, `calculateE1RM`, `formatWeight`, `formatVolume` et `resolveMediaUrl`.
- `frontend/src/features/exercises/ExercisesPage.tsx` : cartes enrichies avec vignette média, initiale de secours, tags groupe/équipement, badges favori/masqué.
- `frontend/src/features/workouts/WorkoutDetail.tsx` : volume total séance, stats par exercice (volume, charge max, e1RM), meilleure série surlignée, colonnes Volume et e1RM dans le tableau.
- `frontend/src/features/stats/StatsPage.tsx` : graphique SVG de progression e1RM, indicateurs de tendance (+ / -) dans le tableau d'historique.
- `frontend/src/features/dashboard/DashboardPage.tsx` : barres de volume proportionnelles, records enrichis avec e1RM mis en couleur.
- `frontend/src/styles.css` : nouveaux styles pour médias exercices, tags, badges, stats de séance, graphique SVG, barres de volume, indicateurs de tendance, records.
- `frontend/README.md` : documentation des médias, du calcul sportif et des améliorations visuelles.
- `frontend/CODEX_LOG.md` : ajout de la présente section.

### Améliorations ajoutées

- Affichage médias exercices : GIF préféré à l'image fixe, fallback initiale en lettre stylisée, chargement différé (`loading="lazy"`), masquage automatique si le média est inaccessible.
- Cartes exercices enrichies : tags groupe musculaire (bleu) et équipement (vert), badges favori (or) et masqué (gris) pour les personnalisations connues.
- Détail séance enrichi : volume total, puis par exercice ; e1RM Epley et charge max par exercice ; meilleure série surlignée en bleu ; colonnes Volume et e1RM dans le tableau de séries ; séries d'échauffement marquées « E ».
- Stats exercice enrichies : graphique SVG maison sans dépendance (aire + ligne + points), affichage des bornes min/max, indicateur de tendance coloré dans l'historique.
- Dashboard enrichi : barres CSS proportionnelles dans le top volumes, records avec charge et e1RM visuellement séparés.
- Helpers centralisés dans `training.ts` évitent toute duplication de formule.

### Backend

Le backend a été modifié uniquement pour exposer un dossier de médias statiques. Aucune migration, aucun endpoint API supplémentaire. Le dossier `backend/media/` peut rester vide ; les images sont servies uniquement si l'`image_path` ou le `gif_path` d'un exercice pointe vers un chemin relatif.

Les chemins qui commencent par `http://` ou `https://` sont utilisés directement et ne passent pas par ce dossier.

### Vérifications

```bash
cd frontend && npm run build
```

```text
TypeScript strict       OK
Vite production build  OK
124 modules transformés
Bundle JS gzip          116.89 kB
Bundle CSS gzip           5.56 kB
```

```bash
cd backend && pytest -q
```

```text
60 passed in 1.96s
```

```bash
alembic check
```

```text
No new upgrade operations detected.
```

### Points d'attention

- Le filtre favori/masqué sur les cartes n'affiche les badges que pour les personnalisations déjà chargées en session (comportement inchangé depuis la passe précédente).
- Le graphique SVG utilise `preserveAspectRatio="none"` et s'adapte à la largeur disponible ; un historique avec une seule séance n'affiche pas de graphique.
- Les médias locaux nécessitent que le backend soit lancé pour être servis ; les URLs externes fonctionnent indépendamment.
- L'e1RM est calculé avec la formule d'Epley (`w × (1 + r/30)`) ; il n'est pas affiché si poids ou répétitions sont nuls ou absents.
- Les listes de séances et programmes restent sans pagination côté frontend.

## Passe suivante — préparation usage local et serveur

### Date

28 juin 2026

### Objectif

Finitions frontend pour l'usage local : message d'erreur réseau explicite quand le backend est inaccessible. Documentation des variables d'environnement.

### Fichiers modifiés

- `frontend/src/shared/api/client.ts` : `fetch` enveloppé dans un `try/catch` ; message français quand le serveur est inaccessible.
- `frontend/.env.example` : note LAN ajoutée.
- `frontend/CODEX_LOG.md` : ajout de la présente section.

### Améliorations

- Quand `fetch` lève une `TypeError` (backend éteint, réseau coupé), le message affiché est désormais : *"Impossible de joindre le serveur. Vérifiez que le backend est démarré et accessible."* au lieu de `"Failed to fetch"`.

### Vérifications

```bash
npm run build
```

```text
TypeScript strict       OK
Vite production build  OK
124 modules transformés
```

### Points d'attention

- Les listes de séances et programmes restent sans pagination ni filtres côté frontend.
- Aucun test automatisé frontend n'est encore configuré.

## Passe suivante — scripts racine et documentation serveur

### Date

28 juin 2026

### Objectif

Aucune modification frontend dans cette passe. Voir `CODEX_LOG.md` racine pour les changements `package.json`, `docs/` et `README.md`.

## Passe suivante — pagination backend des exercices

### Date

28 juin 2026

### Objectif

Adapter le frontend pour consommer les nouvelles routes paginées du backend, sans casser les formulaires, détails et statistiques existants.

### Fichiers modifiés

- `frontend/src/shared/api/types.ts` : ajout `ExerciseListResponse`, `ExerciseFiltersResponse`.
- `frontend/src/shared/components/ExercisePicker.tsx` : auto-suffisant — plus de prop `exercises[]`. Utilise `/api/exercises/search` avec debounce 300 ms et `/api/exercises/filters` pour les groupes. Charge l'exercice sélectionné par ID via `/api/exercises/{id}`.
- `frontend/src/features/exercises/ExercisesPage.tsx` : recherche et pagination entièrement côté serveur. Filtre groupe/équipement depuis `/filters`. Les filtres favoris/masqués restent locaux sur la page courante.
- `frontend/src/features/workouts/WorkoutForm.tsx` : suppression du prop `exercises: Exercise[]`.
- `frontend/src/features/workouts/WorkoutsPage.tsx` : suppression du passage de `exercises` à `WorkoutForm`.
- `frontend/src/features/programs/ProgramForm.tsx` : idem WorkoutForm.
- `frontend/src/features/programs/ProgramsPage.tsx` : idem WorkoutsPage.

### Frontend — changements de comportement

- ExercisesPage n'appelle plus `GET /api/exercises` (liste complète). Elle appelle `/search` pour chaque changement de filtre/page.
- ExercisePicker ne reçoit plus `exercises[]`. Il fait ses propres appels `/search` (ouverts à la demande, debounce 300 ms).
- WorkoutsPage et ProgramsPage chargent toujours `GET /api/exercises` pour afficher les noms dans WorkoutDetail et ProgramDetail.
- StatsPage est inchangée.

### Vérifications

```
npm run build  →  OK (124 modules, TypeScript strict)
npm run test:backend  →  83 passed
alembic check  →  No new upgrade operations detected
```

### Points d'attention

- Les filtres favoris/masqués s'appliquent sur la page courante uniquement (comportement inchangé).
- L'ExercisePicker fait un appel par exercice sélectionné (GET `/exercises/{id}`) en mode édition ; résultats mis en cache par TanStack Query.
- WorkoutsPage et ProgramsPage chargent encore la liste complète pour les vues détail — acceptable pour le MVP.

## Passe suivante — suppression derniers chargements complets exercices

### Date

28 juin 2026

### Objectif

Éliminer tous les appels frontend à `GET /api/exercises` (liste complète), corriger les docs obsolètes et centraliser les appels API exercices.

### Fichiers créés

- `frontend/src/shared/api/exercises.ts` : fonctions `searchExercises()`, `getExerciseFilters()`, `getExerciseById()`, `listExercisesLegacy()`.
- `frontend/src/shared/hooks/useExerciseNames.ts` : hook `useExerciseNames(ids)` basé sur `useQueries` — charge les noms d'exercices par ID en parallèle, avec cache `staleTime: Infinity`.

### Fichiers modifiés

- `frontend/src/shared/components/ExercisePicker.tsx` : utilise `getExerciseById`, `searchExercises`, `getExerciseFilters` depuis le helper centralisé.
- `frontend/src/features/exercises/ExercisesPage.tsx` : idem, utilise `searchExercises` et `getExerciseFilters`.
- `frontend/src/features/workouts/WorkoutDetail.tsx` : prop `exercises: Exercise[]` supprimée — les noms sont chargés via `useExerciseNames`.
- `frontend/src/features/workouts/WorkoutsPage.tsx` : `exercisesQuery` supprimée, plus de chargement de liste complète.
- `frontend/src/features/programs/ProgramDetail.tsx` : idem WorkoutDetail.
- `frontend/src/features/programs/ProgramsPage.tsx` : `exercisesQuery` supprimée.
- `frontend/src/features/stats/StatsPage.tsx` : `exercisesQuery` supprimée, `SelectField` remplacé par `ExercisePicker`.
- `frontend/README.md` : section Ergonomie et Endpoints corrigées.

### Frontend

- `GET /api/exercises` n'est plus appelé nulle part dans le frontend.
- Les noms d'exercices dans WorkoutDetail/ProgramDetail sont chargés à la demande par ID via `useQueries`, avec cache persistant.
- StatsPage sélectionne un exercice via ExercisePicker (qui appelle `/search`) plutôt qu'un `<select>` alimenté par la liste complète.
- Toutes les URLs exercices sont centralisées dans `shared/api/exercises.ts`.
- Pages Séances et Programmes se chargent plus vite (plus d'attente du `GET /api/exercises` au montage).

### Backend

Non modifié. `GET /api/exercises` reste disponible et documenté comme route de compatibilité.

### Vérifications

```
npm run build          →  OK (126 modules, TypeScript strict)
npm run test:backend   →  83 passed
alembic check          →  No new upgrade operations detected
```

### Points d'attention

- Les noms d'exercices apparaissent comme `Exercice #id` pendant le bref chargement initial des détails (resolus par TanStack Query en cache après la première ouverture).
- `listExercisesLegacy()` est disponible dans `shared/api/exercises.ts` pour usage futur si un composant devait revenir à la liste complète.
- Les filtres favoris/masqués restent locaux sur la page courante.

## Passe suivante — pagination séances et programmes

### Date

28 juin 2026

### Objectif

Adapter WorkoutsPage et ProgramsPage pour consommer les routes de recherche paginée, supprimer les listes complètes côté frontend.

### Fichiers créés

- `shared/api/workouts.ts` : `searchWorkouts()`, `listWorkoutsLegacy()`, `createWorkout()`, `updateWorkout()`, `deleteWorkout()`.
- `shared/api/programs.ts` : `searchPrograms()`, `listProgramsLegacy()`, `createProgram()`, `updateProgram()`, `deleteProgram()`.

### Fichiers modifiés

- `shared/api/types.ts` : `WorkoutListResponse`, `ProgramListResponse`.
- `features/workouts/WorkoutsPage.tsx` : utilise `/workouts/search` + filtre nom/date + pagination ; détail chargé par ID via `["workout", id]`.
- `features/programs/ProgramsPage.tsx` : utilise `/programs/search` + filtre nom/statut + pagination ; détail chargé par ID via `["program", id]`.
- `features/dashboard/DashboardPage.tsx` : remplace `GET /api/programs` par `searchPrograms({ is_active: true, limit: 1 })`.

### Vérifications

```
npm run build  →  OK (128 modules, TypeScript strict)
npm run test:backend  →  105 passed
alembic check  →  No new upgrade operations detected
```

### Points d'attention

- `listWorkoutsLegacy()` et `listProgramsLegacy()` sont disponibles mais non utilisés.
- Le détail d'une séance/programme affiché via `?detail=id` dans l'URL fonctionne même si la ressource est sur une autre page.

## Passe suivante — détail exercice et formulaires modaux

### Date

28 juin 2026

### Objectif

Ajouter une page de détail dédiée aux exercices et déplacer les formulaires de création, modification et personnalisation dans des fenêtres modales, sans modifier le backend ni la pagination de la liste.

### Fichiers créés ou modifiés

- `frontend/src/features/exercises/ExerciseDetailPage.tsx` : détail complet, modification, personnalisation et suppression d'un exercice.
- `frontend/src/shared/components/Modal.tsx` : modal générique responsive, fermeture par Escape et verrouillage du scroll.
- `frontend/src/features/exercises/ExercisesPage.tsx` : formulaires modaux et navigation depuis le titre des cards.
- `frontend/src/app/router.tsx` : route protégée `/exercises/:exerciseId`.
- `frontend/src/styles.css` : styles de modal et de page détail desktop/mobile.
- `frontend/README.md` : documentation du nouveau parcours.

### Comportement

- `GET /api/exercises/{exercise_id}` charge la page détail.
- Nouvel exercice et Modifier ouvrent `ExerciseForm` dans une modal.
- Personnalisation ouvre `ExercisePersonalization` dans une modal depuis la liste et le détail.
- La suppression depuis le détail conserve `ConfirmDialog`, puis redirige vers `/exercises` après succès.
- La recherche et la pagination de la liste restent montées et inchangées.

### Vérification

```text
npm run build  →  TypeScript strict et build Vite OK
```

Aucun fichier backend, aucune route API et aucune dépendance npm n'ont été modifiés.

## Passe suivante — préférence de langue des exercices

### Date

28 juin 2026

### Changements

- `Exercise.translations` ajouté au contrat TypeScript ;
- helper `shared/utils/exerciseTranslations.ts` robuste aux JSON absents, invalides ou anciens champs JSON sérialisés ;
- préférence `fr`, `en`, `it` ou `tr` stockée sous `cobaltrack.exerciseLanguage` (`fr` par défaut) ;
- sélecteur de langue sur `/exercises/:exerciseId` avec mise à jour immédiate du nom, des caractéristiques et des instructions ;
- nom traduit également affiché sur les cards de la liste.
- onglet `Traductions` dans le formulaire exercice pour modifier manuellement les champs localisés en français, anglais, italien et turc, avec préservation des données JSON existantes.

Le fallback est : langue préférée, anglais, valeur native, première traduction disponible. Les filtres restent basés sur les champs natifs anglais ; la recherche backend couvre désormais les traductions avec normalisation de la casse, des accents et des séparateurs. Aucune dépendance npm n'a été ajoutée.

### Vérification

```text
npm run build  → TypeScript strict et build Vite OK (131 modules)
```
