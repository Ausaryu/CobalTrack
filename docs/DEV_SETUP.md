# CobalTrack — Mise en place de l'environnement de développement

## Prérequis

| Outil | Version minimale |
|---|---|
| Python | 3.10 |
| Node.js | 20.19 ou 22.12 |
| npm | Inclus avec Node.js |
| Git | Toute version récente |

---

## 1. Cloner le dépôt

```bash
git clone https://github.com/Ausaryu/CobalTrack.git
cd CobalTrack
```

---

## 2. Installation du backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
```

### Variables d'environnement backend

```bash
cp .env.example .env
```

Éditer `.env` si nécessaire. Valeurs par défaut suffisantes pour le développement local :

```env
SECRET_KEY=replace-with-a-long-random-secret
DATABASE_URL=sqlite:///./cobaltrack.db
BACKEND_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Migrations Alembic

```bash
alembic upgrade head
```

Vérification :

```bash
alembic current        # doit afficher le hash de la migration initiale
alembic check          # doit afficher : No new upgrade operations detected
```

---

## 3. Installation du frontend

```bash
cd ../frontend
npm install
```

### Variables d'environnement frontend

```bash
cp .env.example .env
```

Valeur par défaut :

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 4. Lancement

### Backend seul

```bash
# Depuis la racine du repo
npm run dev:backend

# Ou directement depuis backend/
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0
```

### Frontend seul

```bash
# Depuis la racine du repo
npm run dev:frontend

# Ou directement depuis frontend/
cd frontend
npm run dev -- --host 0.0.0.0
```

### Lancement complet (backend + frontend simultanés)

```bash
# Depuis la racine du repo
npm install        # installe concurrently si pas encore fait
npm run dev
```

Les deux processus s'affichent avec des couleurs distinctes dans le terminal.

---

## 5. URLs utiles

| URL | Description |
|---|---|
| `http://localhost:5173` | Frontend React |
| `http://localhost:8000` | Backend FastAPI |
| `http://localhost:8000/docs` | Documentation Swagger UI |
| `http://localhost:8000/redoc` | Documentation ReDoc |
| `http://localhost:8000/api/health` | Health check de l'API |

---

## 6. Tests backend

```bash
# Depuis la racine du repo
npm run test:backend

# Ou directement
cd backend
python -m pytest -q
```

---

## 7. Build frontend

```bash
# Depuis la racine du repo
npm run build

# Ou directement
cd frontend
npm run build
```

Le résultat est dans `frontend/dist/`.

---

## 8. Accès depuis une autre machine du réseau local (LAN)

Pour tester depuis un téléphone ou un autre PC sur le même réseau :

1. Trouver l'IP locale de la machine serveur :
   ```bash
   ip addr show | grep "inet " | grep -v 127.0.0.1
   # Exemple : 192.168.1.42
   ```

2. Dans `backend/.env`, modifier :
   ```env
   BACKEND_CORS_ORIGINS=http://192.168.1.42:5173,http://localhost:5173
   ```

3. Dans `frontend/.env`, modifier :
   ```env
   VITE_API_BASE_URL=http://192.168.1.42:8000
   ```

4. Relancer les deux serveurs.

5. Accéder depuis l'autre machine à `http://192.168.1.42:5173`.

> Le frontend et le backend écoutent sur `0.0.0.0` avec `npm run dev`, donc ils sont déjà accessibles sur le réseau.

---

## 9. Import du référentiel d'exercices

Pour importer un dataset JSON (format exercices) :

```bash
cd backend
source .venv/bin/activate
python -m app.scripts.import_exercises <chemin/vers/dataset.json>
```

L'import est idempotent : relancer ne crée pas de doublons si `external_id` est présent.

---

## 10. Sauvegarde de la base de données

```bash
# Depuis la racine du repo
npm run backup:db

# Ou directement depuis backend/
cd backend
python -m app.scripts.backup_sqlite
```

Crée une copie horodatée dans `backend/backups/`.

---

## 11. Commandes racine résumées

| Commande | Action |
|---|---|
| `npm run dev` | Lance backend + frontend simultanément |
| `npm run dev:backend` | Lance uniquement le backend |
| `npm run dev:frontend` | Lance uniquement le frontend |
| `npm run build` | Build de production du frontend |
| `npm run test:backend` | Lance les tests Python |
| `npm run backup:db` | Sauvegarde horodatée de la DB SQLite |
