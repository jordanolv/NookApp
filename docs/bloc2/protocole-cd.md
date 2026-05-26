# Protocole de déploiement continu — Nookapp

> Livrable RNCP **C2.1.1** — _Mettre en œuvre des environnements de déploiement et de test en y intégrant les outils de suivi de performance et de qualité afin de permettre le bon déroulement de la phase de développement du logiciel._
>
> Critères : protocole CD explicité, environnement détaillé, composants identifiés (registry, serveur d'application, gestion sources), séquences de déploiement définies, critères qualité/performance.

---

## 1. Objectif

Garantir que **toute modification validée sur `main` ou `dev` est mise en production sans intervention manuelle**, dans un délai inférieur à 10 minutes, avec rollback automatique en cas d'échec du healthcheck. Deux environnements cibles :

| Branche | Environnement | URL                    | Stack name        |
| ------- | ------------- | ---------------------- | ----------------- |
| `main`  | Production    | https://nookapp.eu     | `nookapp-prod`    |
| `dev`   | Staging       | https://dev.nookapp.eu | `nookapp-staging` |

---

## 2. Architecture cible

```
GitHub (push main / push dev)
        │
        ▼
[ CI workflow ] ──► doit passer (protocole-ci.md)
        │
        ▼
[ CD workflow ] (.github/workflows/cd.yml)
        │
        ├── build-and-push
        │     • Docker Buildx multi-platform
        │     • Push GHCR : ghcr.io/jordanolv/nookapp-{api,web}:<branch>-<sha>
        │     • Cache layers via GitHub Actions cache
        │
        └── deploy
              • SSH vers VPS (clé ed25519 via GitHub Secret)
              • cd /opt/<stack> && docker compose pull && up -d
              • Healthcheck https://<domain>/api/v1/health
              • Si KO : exit 1 (alerte GitHub, rollback manuel via tag précédent)
                                │
                                ▼
                ┌───────── VPS Hetzner CPX21 ──────────┐
                │                                       │
                │  [ Caddy ] (stack proxy partagée)    │
                │   • 80, 443/tcp, 443/udp             │
                │   • Routing par domaine              │
                │     nookapp.eu     → nookapp-prod-*   │
                │     dev.nookapp.eu → nookapp-staging-*│
                │                                       │
                │  ┌──────────────┐  ┌──────────────┐  │
                │  │ nookapp-prod │  │   -staging   │  │
                │  │              │  │              │  │
                │  │ web api      │  │ web api      │  │
                │  │ postgres     │  │ postgres     │  │
                │  │ livekit      │  │ livekit      │  │
                │  └──────────────┘  └──────────────┘  │
                │     volumes:           volumes:       │
                │  postgres-data       postgres-data   │
                │  api-uploads         api-uploads     │
                └───────────────────────────────────────┘
```

---

## 3. Composants techniques

| Composant                     | Choix                                  | Rôle                                                               |
| ----------------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| **Gestion sources**           | Git + GitHub                           | Historique + déclenchement workflow                                |
| **Registry images**           | GHCR (ghcr.io)                         | Stockage des images Docker, lié au repo, privé par défaut, gratuit |
| **Builder**                   | Docker Buildx + GHA cache              | Build multi-stage reproductible, cache des layers entre runs       |
| **Orchestrateur**             | Docker Compose v2                      | Stacks isolés par projet (`-p` flag), zéro orchestrateur lourd     |
| **Reverse proxy / HTTPS**     | Caddy 2                                | Auto-HTTPS via Let's Encrypt, routing déclaratif par domaine       |
| **Serveur d'application API** | Node 22 (alpine)                       | Runtime NestJS + Hocuspocus dans un même process                   |
| **Serveur d'application Web** | Node 22 (alpine)                       | Runtime Nuxt 3 (Nitro)                                             |
| **Base de données**           | Postgres 18 alpine                     | Une instance par stack (isolation prod/staging)                    |
| **Voix/vidéo**                | LiveKit OSS                            | Une instance par stack                                             |
| **Stockage assets uploads**   | Volume Docker `api-uploads`            | Persistant entre redeploys                                         |
| **Logs**                      | `docker compose logs` + Loki (phase 5) | À court terme : logs containers natifs                             |

---

## 4. Pipeline CD — séquences

### Déclencheurs

```yaml
on:
  push:
    branches: [main, dev] # déploiement auto
  workflow_dispatch: # déclenchement manuel (UI Actions)
```

### Séquence 1 — `build-and-push`

| #   | Étape                      | Commande                                               | Durée typique              |
| --- | -------------------------- | ------------------------------------------------------ | -------------------------- |
| 1   | Checkout du code           | `actions/checkout@v4`                                  | ~5 s                       |
| 2   | Setup Buildx               | `docker/setup-buildx-action@v3`                        | ~3 s                       |
| 3   | Login GHCR                 | `docker/login-action@v3` avec `GITHUB_TOKEN`           | ~2 s                       |
| 4   | Build + push image **api** | `docker/build-push-action@v6` (multi-stage, cache GHA) | ~5 min cold, ~1 min cached |
| 5   | Build + push image **web** | idem                                                   | ~3 min cold, ~30 s cached  |

**Tags appliqués** à chaque image :

- `ghcr.io/jordanolv/nookapp-{api,web}:<branch>` — pointeur mouvant (utilisé pour `:latest` du branch)
- `ghcr.io/jordanolv/nookapp-{api,web}:<branch>-<sha>` — immuable, sert au rollback

### Séquence 2 — `deploy`

| #   | Étape                  | Détail                                                                                                    |
| --- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | Résolution de la cible | Si ref = `main` → stack `nookapp-prod`, domaine `nookapp.eu`. Sinon → `nookapp-staging`, `dev.nookapp.eu` |
| 2   | Setup SSH              | Écriture de la clé privée (`secrets.VPS_SSH_KEY`) + `ssh-keyscan` du host                                 |
| 3   | Déploiement            | SSH vers VPS, `docker compose -p <stack> pull && up -d --remove-orphans`                                  |
| 4   | Healthcheck            | `curl https://<domain>/api/v1/health` jusqu'à 6 fois (10 s d'intervalle, ~1 min max)                      |
| 5   | Échec ?                | `exit 1` → notification GitHub, l'équipe rollback manuellement avec le tag immuable précédent             |

Le **redémarrage des containers est progressif** : Docker Compose v2 fait un `docker stop` du container ancien puis `docker run` du nouveau, par service. Pour un service à 1 réplique (cas actuel), il y a une fenêtre de 2-5 s d'indisponibilité par service redéployé.

### Migrations base de données

Les migrations Drizzle tournent **automatiquement** au démarrage du container `api`, via [`apps/api/docker-entrypoint.sh`](../../apps/api/docker-entrypoint.sh) :

```sh
node ./node_modules/@nookapp/db/dist/migrate.js
exec node dist/main.js
```

Si la migration échoue, le container fail-fast et Docker le restart en boucle — visible immédiatement dans `docker compose logs api`. Aucune migration silencieusement appliquée à moitié.

---

## 5. Pré-requis sur le VPS (one-time setup)

### Installation

```bash
# Sur le VPS, en root
apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 git
systemctl enable --now docker
```

### Utilisateur deploy

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
# Coller la clé publique correspondant au secret VPS_SSH_KEY
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### Arborescence

```bash
mkdir -p /opt/nookapp-prod /opt/nookapp-staging /opt/nookapp-proxy
chown -R deploy:deploy /opt/nookapp-*
```

Dans chaque dossier :

```bash
# /opt/nookapp-prod
git clone <repo> .  # ou rsync depuis local pour les fichiers compose+Caddyfile uniquement
cp .env.production.example .env
nano .env   # remplir secrets (POSTGRES_PASSWORD, JWT_SECRET, RESEND_API_KEY, ...)
#   STACK_NAME=nookapp-prod
#   DOMAIN=nookapp.eu
```

```bash
# /opt/nookapp-staging
# idem mais STACK_NAME=nookapp-staging, DOMAIN=dev.nookapp.eu
# LIVEKIT_TCP_PORT=17881  (évite conflit avec prod sur 7881/tcp)
# LIVEKIT_UDP_PORT=17882
```

### Premier démarrage

```bash
# Proxy partagé (une seule fois)
cd /opt/nookapp-proxy
docker compose -f docker-compose.proxy.yml up -d

# Prod
cd /opt/nookapp-prod
docker compose -p nookapp-prod -f docker-compose.app.yml --env-file .env up -d

# Staging
cd /opt/nookapp-staging
docker compose -p nookapp-staging -f docker-compose.app.yml --env-file .env up -d
```

### DNS

| Record           | Type | Cible     |
| ---------------- | ---- | --------- |
| `nookapp.eu`     | A    | IP du VPS |
| `dev.nookapp.eu` | A    | IP du VPS |

Caddy provisionne les certificats Let's Encrypt automatiquement au premier hit HTTPS.

---

## 6. GitHub Secrets requis

À configurer dans Settings → Secrets and variables → Actions :

| Secret         | Valeur                                                            | Utilisé par          |
| -------------- | ----------------------------------------------------------------- | -------------------- |
| `VPS_HOST`     | IP ou hostname du VPS (ex: `203.0.113.42`)                        | `cd.yml` step deploy |
| `VPS_USER`     | `deploy`                                                          | idem                 |
| `VPS_SSH_PORT` | `22` (ou autre si tu as changé) — **optionnel**, default 22       | idem                 |
| `VPS_SSH_KEY`  | Contenu complet de la clé privée ed25519 (incluant header/footer) | idem                 |

Le secret `GITHUB_TOKEN` est fourni automatiquement par GitHub Actions — il sert pour le push GHCR (scope `packages:write` déclaré dans le workflow).

**Note** : pas de secret applicatif (JWT, Postgres password, etc.) dans GitHub. Ils vivent uniquement dans `/opt/<stack>/.env` sur le VPS, à remplir à la main au premier setup. Avantage : aucun secret applicatif n'est jamais transité par GitHub.

---

## 7. Critères qualité et performance

| Indicateur                                 | Cible                                | Action si dépassé                                             |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------------------------- |
| Durée totale CD (build + deploy)           | < 10 min                             | Optimiser le cache Buildx, séparer api/web en jobs parallèles |
| Disponibilité service après deploy         | > 99 % (downtime < 5 s par redeploy) | Migrer vers `--scale=2` puis rolling update                   |
| Healthcheck réussi à la première tentative | > 90 % des deploys                   | Investiguer (migrations lentes ? container boot ? réseau)     |
| Délai entre merge main et prod live        | < 15 min                             | Inclut le temps de review humaine, à mesurer                  |
| Taux de deploys nécessitant un rollback    | < 5 % par mois                       | Si dépassé, renforcer les tests e2e en CI                     |
| Taille image api (compressée)              | < 250 MB                             | Distroless runtime, plus de pruning des deps                  |
| Taille image web (compressée)              | < 100 MB                             | Idem                                                          |

---

## 8. Rollback

Aucun rollback automatique (la complexité ne se justifie pas à ce stade). Procédure manuelle, ~2 min :

```bash
# Sur le VPS
cd /opt/nookapp-prod
# Identifier le tag précédent (ghcr UI ou via docker images)
export IMAGE_TAG=main-abc12345
docker compose -p nookapp-prod -f docker-compose.app.yml --env-file .env up -d
```

Le tag immuable `<branch>-<sha>` permet ce rollback sans rebuild.

---

## 9. Évolutions prévues

- **Phase 4** — `release-please` qui crée des tags `vX.Y.Z` à partir des Conventional Commits → tags GHCR sémantiques (`:v1.2.3`) en plus de `<branch>-<sha>`.
- **Phase 5** — Stack monitoring (Prometheus + Loki + Grafana) qui scrape `/metrics` (à exposer sur l'api) et envoie alertes Discord si healthcheck KO post-deploy.
- **Plus tard** — `--scale=2` + load-balancing Caddy pour zero-downtime deploys ; jobs e2e en CI utilisant Playwright sur l'image buildée avant déploiement.

---

## 10. Schéma de synthèse

```
git push main / dev
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions — CD workflow                               │
│                                                             │
│   ┌──────────────────┐                                     │
│   │ build-and-push   │                                     │
│   │  • docker build  │                                     │
│   │  • push GHCR     │  ─► ghcr.io/.../nookapp-{api,web}    │
│   │    branch + sha  │       :main-<sha> | :dev-<sha>      │
│   └────────┬─────────┘                                     │
│            │                                               │
│            ▼                                               │
│   ┌──────────────────┐                                     │
│   │ deploy           │                                     │
│   │  • SSH VPS       │                                     │
│   │  • compose pull  │                                     │
│   │  • compose up -d │                                     │
│   │  • migrations    │  ─► auto via docker-entrypoint.sh   │
│   │  • healthcheck   │                                     │
│   └────────┬─────────┘                                     │
└────────────┼───────────────────────────────────────────────┘
             │
             ▼
       Production live
       https://nookapp.eu  (main)
       https://dev.nookapp.eu  (dev)
```

---

**Références** :

- [.github/workflows/cd.yml](../../.github/workflows/cd.yml) — implémentation
- [docker-compose.app.yml](../../docker-compose.app.yml) — stack applicative
- [docker-compose.proxy.yml](../../docker-compose.proxy.yml) — stack proxy partagée
- [Caddyfile.prod](../../Caddyfile.prod) — routing par domaine
- [protocole-ci.md](./protocole-ci.md) — pipeline CI en amont
- [dependances.md](../bloc4/dependances.md) — mises à jour dépendances
