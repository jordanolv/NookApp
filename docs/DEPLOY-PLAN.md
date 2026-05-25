# Plan de déploiement Nookapp — RNCP39583 (Blocs 2 & 4)

> Document de pilotage de la mise en production. Sert aussi de support aux livrables RNCP : **C2.1.1, C2.1.2, C2.2.4, C4.1.1, C4.1.2, C4.2.2, C4.3.2**.
> Les fichiers/configs produits par chaque phase sont listés explicitement. Chaque phase = une ou plusieurs PR vers `dev`.

---

## 1. Objectifs

**Fonctionnel** — rendre Nookapp déployable en une commande sur un VPS Hetzner, avec rollback possible, supervision active, et mises à jour de dépendances automatisées.

**Certification** — produire des artefacts (workflows, configs, dashboards, documentation) qui couvrent les compétences ci-dessous, présentables au jury :

| Compétence | Intitulé                                         | Livrable RNCP attendu                                    | Artefact Nookapp                                                                   |
| ---------- | ------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| C2.1.1     | Environnements de déploiement et de test         | Protocole de déploiement continu + critères qualité/perf | `.github/workflows/cd.yml` + `docs/bloc2/protocole-cd.md`                          |
| C2.1.2     | Système d'intégration continue                   | Protocole d'intégration continue                         | `.github/workflows/ci.yml` (étoffé) + `docs/bloc2/protocole-ci.md`                 |
| C2.2.4     | Déploiement progressif + historique des versions | Historique versions + version fonctionnelle              | GitHub Releases + `CHANGELOG.md`                                                   |
| C4.1.1     | Gestion des mises à jour des dépendances         | Fréquence, périmètre, type                               | `.github/dependabot.yml` + `docs/bloc4/dependances.md`                             |
| C4.1.2     | Système de supervision et d'alerte               | Sondes, seuils, signalements                             | `docker-compose.monitoring.yml` + dashboards Grafana + `docs/bloc4/supervision.md` |
| C4.2.2     | Déploiement de correctifs via CI/CD              | Traitement d'une anomalie via pipeline                   | `docs/bloc4/traitement-anomalie.md` (cas réel)                                     |
| C4.3.2     | Journal des versions                             | Changelog documenté                                      | `CHANGELOG.md` géré par `release-please`                                           |

---

## 2. Architecture cible

```
                                ┌──────────────────────────┐
                                │   GitHub (source + CI)   │
                                │                          │
                                │  push main ─► GHA build  │
                                │              │           │
                                │              ▼           │
                                │   ghcr.io/jordan/nook    │
                                │   - api:<sha>            │
                                │   - web:<sha>            │
                                └──────────┬───────────────┘
                                           │ SSH deploy
                                           ▼
            ┌─────────────────────────── VPS Hetzner CPX21 ──────────────────────────┐
            │                                                                        │
            │   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐   │
            │   │   caddy    │  │    web     │  │    api     │  │   postgres   │   │
            │   │  (proxy +  │─►│  (nuxt)    │  │  (nest)    │─►│              │   │
            │   │   HTTPS)   │  │            │  │            │  └──────────────┘   │
            │   └────────────┘  └────────────┘  └────┬───────┘                     │
            │                                        │                              │
            │                          ┌─────────────┼─────────────┐                │
            │                          ▼             ▼             ▼                │
            │                   ┌──────────┐  ┌──────────┐  ┌──────────┐           │
            │                   │ livekit  │  │ mailpit  │  │hocuspocus│           │
            │                   └──────────┘  └──────────┘  └──────────┘           │
            │                                                                        │
            │   ┌────────────────────── Monitoring stack ─────────────────────────┐ │
            │   │  prometheus ◄── scrape ── /metrics (api, node-exp, pg-exp)      │ │
            │   │       │                                                          │ │
            │   │       ▼                                                          │ │
            │   │   grafana ──► alerts ──► Discord webhook                         │ │
            │   │       ▲                                                          │ │
            │   │       │                                                          │ │
            │   │     loki ◄── promtail ── docker logs                             │ │
            │   └──────────────────────────────────────────────────────────────────┘ │
            └────────────────────────────────────────────────────────────────────────┘
```

**Choix structurants** :

- **Une seule machine** (CPX21 — 3 vCPU, 4 Go RAM) — fits ≤ 15 users/Nook × dizaines de Nooks.
- **Images Docker buildées en CI**, taggées par SHA + `latest`, stockées sur **GHCR** (gratuit, privé, lié au repo).
- **Déploiement = `docker compose pull && up -d`** déclenché via SSH depuis GitHub Actions.
- **Caddy reverse proxy** (auto-HTTPS via Let's Encrypt).
- **Monitoring stack séparé** (`docker-compose.monitoring.yml`) — peut tomber sans impacter la prod.
- **Pas de Kubernetes, pas d'orchestrateur** — overkill pour la cible, et le jury préfère un setup compris à un setup à la mode.

---

## 3. Plan d'exécution (phasé)

> Chaque phase = 1 PR vers `dev` (typiquement). Validation locale avant push. Pas de saut de phase.

### Phase 0 — Préparation (cette PR)

- [x] Plan écrit (ce fichier)
- [ ] Validation utilisateur du plan

### Phase 1 — CI étoffée + Dependabot — `chore/ci-hardening`

**Pourquoi en premier** : on a déjà un `ci.yml` minimal qui marche. On l'étoffe avant tout le reste pour qu'aucune phase suivante ne casse silencieusement.

**Contenu** :

- Refactor `ci.yml` : jobs séparés (`lint`, `typecheck`, `test`, `build`) qui tournent en parallèle (au lieu d'un seul job séquentiel) → feedback plus rapide.
- Ajouter **Postgres service container** au job `test` (pour les e2e qui en ont besoin).
- Ajouter **status checks bloquants** sur `dev` et `main` (configuration GitHub à documenter, pas de fichier).
- Créer `.github/dependabot.yml` :
  - npm hebdo (groupé : root, `apps/api`, `apps/web`, `packages/*`)
  - GitHub Actions mensuel
  - Docker mensuel (quand les Dockerfiles existeront)
- Créer `docs/bloc2/protocole-ci.md` : décrit le pipeline, les outils, les critères qualité (≥ 80% lint OK, 0 erreur TS, 0 test rouge).
- Créer `docs/bloc4/dependances.md` : couvre **C4.1.1** (fréquence, périmètre, auto vs manuel, processus de validation des bumps).

**Livrable RNCP** : C2.1.2 (intégration continue) + C4.1.1 (mises à jour dépendances).

### Phase 2 — Dockerfiles + docker-compose.prod.yml — `feat/docker-prod`

**Pourquoi maintenant** : il faut des images Docker reproductibles avant de pouvoir scripter le déploiement.

**Contenu** :

- `apps/api/Dockerfile` — multi-stage (builder pnpm → runtime distroless ou node:22-alpine).
- `apps/web/Dockerfile` — multi-stage (builder Nuxt → runtime node-server).
- `.dockerignore` à la racine (exclut `node_modules`, `dist`, `.git`, `.env`, `assets-source`, `poc-archive`).
- `docker-compose.prod.yml` — services : `caddy`, `web`, `api`, `postgres`, `livekit`, `hocuspocus`. Pas de Mailpit (utilise Resend en prod). Tous les services en `restart: unless-stopped`.
- `Caddyfile` — reverse proxy avec HTTPS auto, route `/` vers web, `/api/*` vers api, `/ws/*` vers api (Socket.IO), `/livekit/*` vers livekit, `/yjs/*` vers hocuspocus.
- `livekit.yaml` — déjà mentionné dans CLAUDE.md, à créer concrètement (port UDP 7882).
- `.env.production.example` — toutes les vars requises, valeurs placeholder.
- Tester le build local : `docker compose -f docker-compose.prod.yml build`.

**Livrable RNCP** : prépare le terrain pour C2.1.1.

### Phase 3 — CD GitHub Actions — `feat/github-actions-cd`

**Contenu** :

- `.github/workflows/cd.yml` déclenché sur push `main` :
  1. Job `build-images` : build api+web, tag `ghcr.io/<owner>/nookapp-{api,web}:${{ github.sha }}` + `:latest`, push GHCR.
  2. Job `deploy` (besoin secret `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`) :
     - SSH sur VPS
     - `cd /opt/nookapp && docker compose pull && docker compose up -d --remove-orphans`
     - Wait 10s, then `curl -f https://nookapp.app/api/v1/health || rollback`
     - Si fail : `docker compose up -d --no-deps <service>:previous-tag` (tag précédent gardé)
- Job `release` (sur tag `v*`) : créer GitHub Release auto.
- Documenter `docs/bloc2/protocole-cd.md` : étapes, secrets, healthcheck, stratégie rollback (= **C2.1.1**).

**Pré-requis manuel** (à faire par l'utilisateur, documenté) :

- Provisionner VPS Hetzner.
- Installer Docker + Docker Compose plugin.
- Créer user `deploy` avec accès `docker`.
- Générer keypair SSH, ajouter clé publique sur VPS, clé privée en GitHub secret.
- DNS : `A nookapp.app -> <VPS IP>`.

**Livrable RNCP** : C2.1.1 (protocole CD) + C2.2.4 (déploiement progressif).

### Phase 4 — release-please + CHANGELOG — `chore/release-please`

**Contenu** :

- `.github/workflows/release-please.yml` — sur push `main`, ouvre/maintient une PR "release vX.Y.Z" qui :
  - Bump version dans `package.json`
  - Génère/met à jour `CHANGELOG.md` à partir des conventional commits
  - Quand mergée : crée le tag `v*` (qui déclenche le job release de cd.yml).
- Config `.release-please-manifest.json` + `release-please-config.json` (monorepo : versionne juste `nookapp` racine, pas chaque app).
- `CHANGELOG.md` initial.
- `docs/bloc4/journal-versions.md` — explique le processus, montre un exemple de release (= **C4.3.2**).

**Livrable RNCP** : C4.3.2 (journal des versions).

### Phase 5 — Monitoring stack — `feat/monitoring-stack`

**Contenu** :

- `docker-compose.monitoring.yml` — Prometheus, Loki, Promtail, Grafana, node-exporter, postgres-exporter, cadvisor. Réseau séparé `monitoring`, mais reachable depuis le réseau principal pour scraper.
- `monitoring/prometheus.yml` — targets : api, node-exporter, postgres-exporter, cadvisor.
- `monitoring/promtail.yml` — scrape Docker container logs → Loki.
- `monitoring/grafana/provisioning/` — datasources (Prometheus + Loki) + dashboards as code :
  - `dashboards/system.json` — CPU/RAM/disk VPS
  - `dashboards/postgres.json` — connexions, slow queries, taille DB
  - `dashboards/api.json` — req/s, latence p50/p95/p99, taux d'erreur, présence des websockets
  - `dashboards/realtime.json` — clients Socket.IO connectés, messages/sec, événements LiveKit
- Instrumenter NestJS :
  - `pnpm add @willsoto/nestjs-prometheus prom-client` dans `apps/api`
  - Endpoint `/metrics` exposé (interne, pas via Caddy public)
  - Custom metrics : compteur connexions Socket.IO, durée messages, etc.
- Alertes Grafana → Discord webhook : CPU > 80% 5min, RAM > 90% 5min, API down 1min, taux d'erreur > 5%, disk < 10%.
- `docs/bloc4/supervision.md` — couvre **C4.1.2** : périmètre, sondes, seuils, modalités d'alerte.

**Livrable RNCP** : C4.1.2 (supervision et alertes).

### Phase 6 — Documentation manuels — `docs/manuels-exploitation`

**Pourquoi à la fin** : on documente ce qui a effectivement été construit, pas un fantasme.

**Contenu** (couvre **C2.4.1** du Bloc 2) :

- `docs/bloc2/manuel-deploiement.md` — comment déployer (étapes, pré-requis VPS, premier deploy vs déploiements suivants, secrets à configurer).
- `docs/bloc2/manuel-utilisation.md` — admin Nook (créer Nook, inviter, gérer salons, etc.) + utilisateur final.
- `docs/bloc2/manuel-mise-a-jour.md` — comment livrer une nouvelle version (workflow conventional commit → PR → merge dev → merge main → release-please bump).

### Phase 7 — Premier déploiement réel + cas d'anomalie — `chore/first-prod-deploy`

**Pourquoi à la fin** : tout doit être en place avant de lancer.

**Contenu** :

- Provisionner VPS, suivre `manuel-deploiement.md` (test du manuel par la même occasion).
- Premier deploy, vérifier health checks, monitoring opérationnel.
- Provoquer ou attendre une anomalie réelle → documenter le cycle dans `docs/bloc4/traitement-anomalie.md` :
  - Fiche de consignation (= **C4.2.1**)
  - Correctif via pipeline CI/CD (= **C4.2.2**)
- Récap final dans `docs/bloc4/README.md` qui linke tous les sous-docs Bloc 4.

---

## 4. Ordre de mise en œuvre

```
Phase 1 (CI + Dependabot)
   │
   ▼
Phase 2 (Dockerfiles + compose prod)
   │
   ▼
Phase 3 (CD GHA + SSH deploy)
   │
   ├──► Phase 4 (release-please) ──┐
   │                                │
   └──► Phase 5 (monitoring) ──────┤
                                    │
                                    ▼
                              Phase 6 (manuels)
                                    │
                                    ▼
                              Phase 7 (deploy réel + cas anomalie)
```

Phase 4 et 5 sont indépendantes — possible de les faire en parallèle ou dans n'importe quel ordre après Phase 3.

---

## 5. Risques et points de vigilance

| Risque                           | Mitigation                                                                |
| -------------------------------- | ------------------------------------------------------------------------- |
| Secrets GitHub leaked dans logs  | Aucun `echo $SECRET`, utiliser `::add-mask::` si besoin de debug          |
| Premier deploy casse la prod     | Phase 7 sur VPS de test d'abord (ou snapshot Hetzner avant)               |
| GHCR rate limit                  | Authent. avec `GITHUB_TOKEN` (5000 req/h vs 60 anonyme)                   |
| Grafana mot de passe par défaut  | Provisioning admin user via env var, désactiver signup                    |
| `/metrics` exposé publiquement   | Bloquer dans Caddy, ne laisser passer que depuis le réseau Docker interne |
| Migration DB qui casse au deploy | Job `migrate` séparé avant `up -d`, rollback si échoue                    |
| Logs Loki saturent le disque     | Retention 14 jours configurée dans `loki-config.yaml`                     |

---

## 6. Variables d'environnement de prod (ajout au `.env.example`)

```bash
# CD / GHCR
GHCR_USERNAME=jordan
GHCR_TOKEN=ghp_...

# VPS
VPS_HOST=nookapp.app
VPS_USER=deploy
VPS_SSH_KEY=...   # GitHub secret, jamais dans .env

# Monitoring
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=...
DISCORD_ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Postgres exporter
POSTGRES_EXPORTER_DSN=postgresql://...

# Resend (déjà dans .env.example mais à confirmer)
MAIL_DRIVER=resend
RESEND_API_KEY=...
```

---

## 7. Mapping détaillé livrables RNCP

| Document                            | Compétences couvertes | Critères d'évaluation visés                              |
| ----------------------------------- | --------------------- | -------------------------------------------------------- |
| `docs/bloc2/protocole-ci.md`        | C2.1.2                | Protocole CI explicité, séquences d'intégration définies |
| `docs/bloc2/protocole-cd.md`        | C2.1.1                | Protocole CD explicité, outils détaillés, critères perf  |
| `docs/bloc2/manuel-deploiement.md`  | C2.4.1                | Manuel clair, technos justifiées                         |
| `docs/bloc2/manuel-utilisation.md`  | C2.4.1                | Manuel utilisateur clair                                 |
| `docs/bloc2/manuel-mise-a-jour.md`  | C2.4.1                | Processus d'évolution documenté                          |
| `docs/bloc4/dependances.md`         | C4.1.1                | Fréquence, périmètre, type (auto/manuel)                 |
| `docs/bloc4/supervision.md`         | C4.1.2                | Système, sondes, finalité, critères qualité              |
| `docs/bloc4/traitement-anomalie.md` | C4.2.1 + C4.2.2       | Fiche consignation + correctif via CI/CD                 |
| `docs/bloc4/journal-versions.md`    | C4.3.2                | Changelog documenté                                      |
| `CHANGELOG.md`                      | C2.2.4 + C4.3.2       | Historique des versions                                  |
| GitHub Releases                     | C2.2.4                | Évolutions tracées                                       |

---

**Validation requise avant Phase 1** : utilisateur lit ce plan, valide ou demande des ajustements.
