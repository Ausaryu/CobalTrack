# CobalTrack — Déploiement sur serveur personnel

Ce guide décrit le déploiement de CobalTrack sur un serveur Linux personnel (VPS, Raspberry Pi, machine locale dédiée). Il ne couvre pas Docker ni les hébergeurs cloud managés.

---

## 1. Prérequis serveur

- Accès SSH avec droits sudo
- Python 3.10+ et pip
- Node.js 20+ et npm
- Nginx ou Caddy (pour le reverse proxy)
- Optionnel : `certbot` pour HTTPS automatique

---

## 2. Build du frontend

Sur la machine de développement (ou sur le serveur) :

```bash
cd frontend
npm install
npm run build
```

Le contenu statique est généré dans `frontend/dist/`. Copier ce dossier sur le serveur si le build est fait en local :

```bash
rsync -avz frontend/dist/ user@serveur:/var/www/cobaltrack/
```

---

## 3. Lancement du backend en production

### Variables d'environnement

Créer `/etc/cobaltrack/backend.env` ou un fichier `.env` dans le dossier `backend/` :

```env
SECRET_KEY=une-cle-tres-longue-et-aleatoire
DATABASE_URL=sqlite:////var/data/cobaltrack/cobaltrack.db
BACKEND_CORS_ORIGINS=https://cobaltrack.example.com
```

Générer une clé secrète robuste :

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### Appliquer les migrations

```bash
cd /opt/cobaltrack/backend
source .venv/bin/activate
alembic upgrade head
```

### Lancer uvicorn sans rechargement automatique

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
```

> En production, le backend n'écoute que sur `127.0.0.1` ; c'est Nginx qui expose le port 80/443 vers l'extérieur.

### Service systemd (recommandé)

Créer `/etc/systemd/system/cobaltrack-backend.service` :

```ini
[Unit]
Description=CobalTrack Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/cobaltrack/backend
EnvironmentFile=/etc/cobaltrack/backend.env
ExecStart=/opt/cobaltrack/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable cobaltrack-backend
systemctl start cobaltrack-backend
```

---

## 4. Servir le frontend statique

Les fichiers de `frontend/dist/` sont servis par Nginx comme une SPA.

Le point clé est le **SPA fallback** : toute route inconnue doit renvoyer `index.html` pour que React Router gère la navigation côté client.

---

## 5. Configuration Nginx

```nginx
server {
    listen 80;
    server_name cobaltrack.example.com;

    # Redirection vers HTTPS (décommenter une fois le certificat obtenu)
    # return 301 https://$host$request_uri;

    # Frontend statique
    root /var/www/cobaltrack;
    index index.html;

    # SPA fallback : routes inconnues → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy vers le backend FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Médias exercices servis directement par FastAPI via /media
    location /media/ {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

Après modification :

```bash
nginx -t && systemctl reload nginx
```

---

## 6. Configuration Caddy (alternative)

```caddy
cobaltrack.example.com {
    # Frontend SPA
    root * /var/www/cobaltrack
    try_files {path} /index.html
    file_server

    # Backend API
    handle /api/* {
        reverse_proxy localhost:8000
    }

    # Médias
    handle /media/* {
        reverse_proxy localhost:8000
    }
}
```

Caddy gère HTTPS automatiquement via Let's Encrypt.

---

## 7. HTTPS

**Ne pas exposer l'application en HTTP sur internet.** Le JWT est transmis dans les headers et doit être protégé par TLS.

Avec Nginx + certbot :

```bash
certbot --nginx -d cobaltrack.example.com
```

Avec Caddy : HTTPS est activé automatiquement si le domaine est public.

---

## 8. Sauvegarde de la base de données

La base SQLite est un fichier unique. Le script de backup intégré crée une copie horodatée :

```bash
# Depuis la racine du repo (en dev ou CI)
npm run backup:db

# Depuis le dossier backend/ (en production)
cd /opt/cobaltrack/backend
python -m app.scripts.backup_sqlite
```

Les backups sont stockés dans `backend/backups/`. Pour automatiser :

```bash
# Crontab : sauvegarde quotidienne à 3h00
0 3 * * * cd /opt/cobaltrack/backend && .venv/bin/python -m app.scripts.backup_sqlite >> /var/log/cobaltrack-backup.log 2>&1
```

Pour copier les backups hors du serveur :

```bash
rsync -avz user@serveur:/opt/cobaltrack/backend/backups/ ./backups-distants/
```

---

## 9. Dossier médias

Le dossier `backend/media/` contient les images et GIF des exercices locaux. Il doit être préservé lors des mises à jour du code :

```bash
# Ne pas effacer lors d'un git pull
ls /opt/cobaltrack/backend/media/
```

Si les médias sont volumineux, envisager un lien symbolique vers un stockage séparé.

---

## 10. Mise à jour de l'application

```bash
cd /opt/cobaltrack

# 1. Récupérer les nouvelles versions
git pull

# 2. Migrer la base de données si nécessaire
cd backend && source .venv/bin/activate
alembic upgrade head

# 3. Rebuilder le frontend
cd ../frontend && npm install && npm run build

# 4. Copier le nouveau build
rsync -a dist/ /var/www/cobaltrack/

# 5. Redémarrer le backend
systemctl restart cobaltrack-backend
```

---

## 11. Variables d'environnement importantes

| Variable | Usage | Valeur production |
|---|---|---|
| `SECRET_KEY` | Signature JWT | Chaîne aléatoire longue, ne jamais exposer |
| `DATABASE_URL` | Chemin de la DB | Chemin absolu sur le serveur |
| `BACKEND_CORS_ORIGINS` | Domaines autorisés | URL HTTPS du domaine public |

---

## 12. Limites de SQLite en production

SQLite convient parfaitement pour un usage personnel (1–5 utilisateurs simultanés). Si l'usage grandit, migrer vers PostgreSQL en changeant uniquement `DATABASE_URL` et en réappliquant les migrations.
