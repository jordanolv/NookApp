# Gestion des mises à jour des dépendances — Nookapp

> Livrable RNCP **C4.1.1** — _Gérer les mises à jour des dépendances et des bibliothèques tiers, en surveillant régulièrement les nouvelles versions, en évaluant les impacts des mises à jour, et en les intégrant de manière sécurisée pour maintenir l'application à jour et sécurisée._
>
> Critères d'évaluation : le processus précise **la fréquence des mises à jour, le périmètre logiciel concerné, le type (automatique ou manuel)**.

---

## 1. Enjeu

Nookapp s'appuie sur ~150 dépendances npm directes (transitives non comptées) réparties entre 2 apps (`api`, `web`), 3 packages internes (`protocol`, `plugin-sdk`, `db`), un répertoire de plugins, plus les actions GitHub et — à partir de la phase 2 — les images Docker de base. Sans processus :

- **Failles de sécurité non patchées** (cf. CVE Express, Vite, NestJS) qui ouvrent les portes OWASP Top 10 que `apps/api` est censé fermer (cf. **C2.2.3**).
- **Dette technique** qui rend chaque upgrade exponentiellement plus risquée (saut de plusieurs majors).
- **Incompatibilités** avec les nouveaux outils (Node 24, pnpm 11, etc.).

---

## 2. Outils retenus

| Outil                                | Rôle                                                           | Pourquoi celui-là                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Dependabot** (natif GitHub)        | Surveille les versions des dépendances et ouvre des PR de bump | Gratuit, intégré, supporte npm + GitHub Actions + Docker, granularité par ecosystem, groupement de PR configurable |
| **`pnpm audit`** (manuel + CI futur) | Liste les vulnérabilités connues du lockfile                   | Couvre les transitives, alimente la décision d'urgence d'un bump                                                   |
| **GitHub Security Advisories**       | Alertes sécurité poussées par GitHub                           | Notifications mail / dans le repo pour les CVE des dépendances utilisées                                           |
| **`changesets`** (manuel, ponctuel)  | Coordonner les bumps des packages internes (`@nookapp/*`)      | Évite les desynchros lock entre workspaces lors d'un changement de protocole                                       |

---

## 3. Configuration Dependabot

Fichier source : [.github/dependabot.yml](../../.github/dependabot.yml)

### Couverture (= **périmètre logiciel concerné**)

| Écosystème                   | Périmètre                                                                                                     | Fréquence                                   | Cible PR | Type                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `npm`                        | Racine du monorepo + tous les workspaces (apps, packages, plugins) — Dependabot suit le `pnpm-workspace.yaml` | **Hebdomadaire** (lundi 08:00 Europe/Paris) | `dev`    | Automatique (Dependabot ouvre la PR), merge **manuel** après review |
| `github-actions`             | Tous les `.github/workflows/*.yml`                                                                            | **Mensuelle** (lundi 08:00 Europe/Paris)    | `dev`    | Automatique → review                                                |
| `docker` (à activer phase 2) | `apps/api/Dockerfile`, `apps/web/Dockerfile`                                                                  | **Mensuelle**                               | `dev`    | Automatique → review                                                |

### Stratégie de groupement (= **réduit le bruit, garde la traçabilité**)

Dependabot peut soit ouvrir **une PR par bump** soit **regrouper** plusieurs bumps dans une seule PR. Notre choix :

| Groupe                    | Contenu                                | Raison                                                                   |
| ------------------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `production-minor-patch`  | Toutes les deps de prod en minor/patch | Sûres dans 99 % des cas, mergeable en une seule revue après que CI passe |
| `development-minor-patch` | Toutes les devDeps en minor/patch      | Idem, encore plus faible risque                                          |
| **(non groupé)**          | Bumps **majeurs** (semver-major)       | Reviewés un par un car potentiellement breaking                          |
| `actions` (workflows)     | Toutes les actions GitHub              | PR mensuelle unique                                                      |

Effet : **typiquement 2–3 PR par lundi** au lieu de 15–20.

### Ignores explicites

```yaml
ignore:
  - dependency-name: '@types/node'
    update-types: [version-update:semver-major]
```

`@types/node` est gardé en major 22 tant que `engines.node` du projet est 22 — éviter qu'une PR Dependabot saute en `@types/node@24` alors que le runtime reste en 22.

---

## 4. Processus de traitement d'une PR Dependabot

```
Dependabot ouvre PR ──► CI tourne (lint+typecheck+test+build)
                              │
                ┌─────────────┴─────────────┐
                │                           │
            CI verte                    CI rouge
                │                           │
                ▼                           ▼
       Lecture changelog          Reproduire localement
       de la dépendance                    │
                │                  ┌───────┴───────┐
                ▼                  │               │
      [Décision review]      Bug introduit    Bump trop ambitieux
        │           │       par le bump        (ex: drop Node 22)
        │           │              │               │
   Merger PR    Demander         ▼               ▼
   (squash)    rebase /      Issue upstream  Fermer PR + ignore
                 fixes        + freeze bump    dans dependabot.yml
```

### Critères de décision

| Type de bump                                  | Action par défaut                                                                                                      | Délai max  |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Patch** (`x.y.Z`) sur dep en prod, CI verte | Merger sans review approfondie                                                                                         | 48 h       |
| **Patch** sur devDep, CI verte                | Merger sans review approfondie                                                                                         | 1 semaine  |
| **Minor** (`x.Y.z`) sur dep en prod, CI verte | Lire le changelog, merger                                                                                              | 1 semaine  |
| **Minor** sur devDep, CI verte                | Lire le changelog en diagonale, merger                                                                                 | 2 semaines |
| **Major** (`X.y.z`) — quelconque              | Lire migration guide complet, tester manuellement les flows impactés, ouvrir une branche dédiée si refactor nécessaire | 1 mois     |
| **CI rouge** (toute version)                  | Investiguer avant de merger                                                                                            | Indéfini   |
| **CVE critique** (alerte GitHub Security)     | Bypass du calendrier hebdo, traiter immédiatement                                                                      | 24 h       |

---

## 5. Mise à jour manuelle ponctuelle

Cas couverts par Dependabot : **bumps standard de dépendances déjà déclarées**. Cas qui restent **manuels** :

| Cas                                                          | Comment                                                                                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Ajout d'une nouvelle dépendance                              | `pnpm add <pkg> --filter <workspace>`                                                                                                           |
| Migration majeure cross-deps (ex: Vue 3 → 4, NestJS 10 → 11) | Branche dédiée `chore/upgrade-<thing>`, suivi du migration guide officiel, exécution du codemod si fourni, revue de chaque test cassé           |
| Bump de Node ou pnpm (engines)                               | Branche dédiée, mise à jour `package.json` + Dockerfiles + `setup-node` action + CLAUDE.md + tests sur la version exacte (matrix si nécessaire) |
| Désinstallation d'une dépendance devenue inutile             | `pnpm remove <pkg>` + `pnpm dedupe`                                                                                                             |
| Patch local d'une dep buggée (en attente d'un fix upstream)  | `pnpm patch <pkg>` + commit du patch dans `patches/`                                                                                            |

---

## 6. Audit de sécurité — couche complémentaire

Indépendamment de Dependabot, deux mécanismes attrapent ce qui passe entre les mailles :

### `pnpm audit`

Commande locale + (futur) job CI :

```bash
pnpm audit --prod --audit-level=high
```

- `--prod` : ignore les devDeps (vulnérabilités tooling moins critiques que prod).
- `--audit-level=high` : ne fail que sur `high` ou `critical` (les `low`/`moderate` polluent sans action immédiate).

**À automatiser** (phase 1.5, future itération) : job CI hebdomadaire qui fail si une CVE `high+` apparaît, créant une issue auto.

### GitHub Security Advisories

GitHub scanne automatiquement le `pnpm-lock.yaml` et envoie une alerte dès qu'une CVE matche une de nos dépendances (directe ou transitive).

- Notifications activées sur le repo.
- Une CVE `critical` ⇒ traitement immédiat (cf. table § 4), pas besoin d'attendre la PR Dependabot.

---

## 7. Mise à jour des dépendances système (VPS)

Le VPS Hetzner qui héberge la prod a aussi un cycle de mises à jour, **hors périmètre Dependabot** :

| Composant                                              | Fréquence                         | Commande / méthode                                              |
| ------------------------------------------------------ | --------------------------------- | --------------------------------------------------------------- |
| OS (Ubuntu LTS)                                        | Hebdo automatique (security only) | `unattended-upgrades` activé, reboot manuel mensuel             |
| Docker Engine                                          | Mensuel                           | `apt upgrade docker-ce docker-ce-cli containerd.io`             |
| Docker images du compose (`postgres`, `livekit`, etc.) | Mensuel                           | Bumps via Dependabot (phase 2) + `docker compose pull && up -d` |
| Caddy (auto-cert + reverse proxy)                      | À chaque bump image               | Same pull/up cycle                                              |

Ces mises à jour seront documentées dans [`manuel-mise-a-jour.md`](../bloc2/manuel-mise-a-jour.md) (phase 6).

---

## 8. Traçabilité

Toute mise à jour de dépendance passe par :

1. Une **PR git** (Dependabot ou humaine) — historique complet dans GitHub.
2. Un **commit Conventional** typé `chore(deps): ...` ou `ci(actions): ...` — détectable dans `git log`.
3. **`pnpm-lock.yaml` versionné** — chaque version exacte est traçable.
4. À chaque release, un bloc dédié dans le **CHANGELOG.md** (généré par `release-please`, phase 4) : _"Dependencies bumped: X, Y, Z"_.

---

## 9. Métriques de suivi

| Indicateur                                                          | Cible      | Mesure                                                          |
| ------------------------------------------------------------------- | ---------- | --------------------------------------------------------------- |
| Délai moyen entre release upstream et merge chez nous (patch/minor) | < 14 jours | Compté à la main mensuellement, échantillon de 10 PR Dependabot |
| Nombre de CVE `high+` ouvertes sur `main`                           | 0          | GitHub Security tab                                             |
| Nombre de PR Dependabot en attente                                  | < 5        | Filtre `is:open label:dependencies`                             |
| Dépendances en major retard (vs latest)                             | < 5        | `pnpm outdated --long` mensuel                                  |

---

## 10. Schéma de synthèse

```
                  Surveillance permanente
                  ┌──────────────────────────┐
                  │ • Dependabot (calendrier)│
                  │ • GitHub Security (push) │
                  │ • pnpm audit (pull)      │
                  └────────────┬─────────────┘
                               │
                  ┌────────────┴──────────────┐
                  │ Nouveau bump à intégrer ? │
                  └────────────┬──────────────┘
                               │
       ┌───────────────────────┼───────────────────────┐
       │                       │                       │
       ▼                       ▼                       ▼
  Patch / minor           Majeure              CVE critique
  groupé (Dependabot)     dédiée               (bypass calendrier)
       │                       │                       │
       ▼                       ▼                       ▼
   CI passe ?         Migration guide lu      Fix immédiat
       │                       │                       │
       ▼                       ▼                       ▼
   Merge dev          Branche dédiée          Hotfix → main
       │              + tests manuels                  │
       │                       │                       │
       └───────────────────────┴───────────────────────┘
                               │
                               ▼
                       Release suivante
                       (CHANGELOG auto)
```

---

**Références** :

- [.github/dependabot.yml](../../.github/dependabot.yml) — config technique
- [protocole-ci.md](../bloc2/protocole-ci.md) — pipeline qui valide chaque bump
- [DEPLOY-PLAN.md](../DEPLOY-PLAN.md) — plan global
