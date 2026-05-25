# Protocole d'intégration continue — Nookapp

> Livrable RNCP **C2.1.2** — _Configurer le système d'intégration continue dans le cycle de développement du logiciel en fusionnant les codes sources et en testant régulièrement les blocs de code afin d'assurer un développement efficient qui réduit les risques de régression._

---

## 1. Objectif

Garantir qu'aucune modification de code n'est intégrée à la branche `dev` (intégration) ni à `main` (production) sans avoir passé un ensemble de vérifications automatiques. L'intégration continue (CI) sert à :

1. **Détecter les régressions au plus tôt** (avant merge, pas en prod).
2. **Maintenir un niveau de qualité homogène** sur l'ensemble du code (style, types, comportement).
3. **Donner un signal clair au reviewer** (« tous les jobs verts » = base saine pour relire le diff).
4. **Préparer les artefacts** consommés ensuite par la chaîne de déploiement continu (cf. [protocole-cd.md](./protocole-cd.md)).

---

## 2. Stratégie de branches

```
feature/* ─► PR ─► dev ─► PR ─► main ─► tag v* ─► release
                  ▲                ▲
                  │                │
                CI requise        CI requise
                  +              + CD déclenché
              squash merge        (build images, deploy VPS)
```

- **Une branche par ticket**, nommée `<type>/<short-summary>` (cf. CLAUDE.md § Git workflow).
- **`dev`** = branche d'intégration. Toute PR feature y est ouverte. Squash merge.
- **`main`** = branche de production. Reçoit uniquement des merges depuis `dev` lors d'une release.
- **Aucun push direct** sur `dev` ou `main` (configuré via branch protection rules — voir § 6).

---

## 3. Pipeline CI — Workflow GitHub Actions

### Fichier source

[.github/workflows/ci.yml](../../.github/workflows/ci.yml)

### Déclencheurs

```yaml
on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev, main]
```

- **`pull_request`** : le pipeline tourne sur chaque commit poussé sur une branche associée à une PR ouverte vers `dev` ou `main`.
- **`push` sur `dev`/`main`** : re-vérification après merge (filet de sécurité).
- **`concurrency`** : les runs précédents de la même branche sont annulés quand un nouveau commit arrive — évite de gaspiller des minutes runner.

### Séquencement

Cinq jobs **parallèles** orchestrés par un job de synthèse :

```
        ┌─────────┐  ┌──────────┐  ┌──────┐  ┌──────────┐
        │  lint   │  │ typecheck│  │ test │  │  build   │
        └────┬────┘  └────┬─────┘  └──┬───┘  └────┬─────┘
             │            │           │           │
             └────────────┴───────────┴───────────┘
                             │
                             ▼
                       ┌───────────┐
                       │ci-success │ ◄── status check bloquant
                       └───────────┘
```

Le parallélisme est volontaire : tous les jobs sont indépendants, donc le temps total = max(durée des jobs) au lieu de leur somme. Sur la stack actuelle, c'est ≈ **3 min** au lieu de ~10 min en séquentiel.

### Détail des jobs

| Job          | Étapes                                                                       | Objectif                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lint`       | `pnpm install` → `pnpm lint`                                                 | ESLint (règles `@eslint/js` + plugins TS/Vue) sur tous les fichiers TS/Vue. Le check Prettier (`pnpm format:check`) sera réactivé après une PR de cleanup du backlog existant |
| `typecheck`  | `pnpm install` → build packages → `pnpm typecheck` (`tsc --noEmit` récursif) | Vérifie qu'aucune erreur de type ne traverse les frontières client/serveur ou via les packages partagés (`@nookapp/protocol`, `@nookapp/db`)                                  |
| `test`       | `pnpm install` → build packages → `pnpm test`                                | Jest sur tous les workspaces (unit tests services NestJS + tests composables web)                                                                                             |
| `build`      | `pnpm install` → `pnpm build` (build packages + apps)                        | Confirme que `apps/api` (NestJS → `dist/`) et `apps/web` (Nuxt → `.output/`) compilent en mode production                                                                     |
| `ci-success` | dépend des 4 jobs ci-dessus, échoue si l'un d'eux a échoué                   | Donne un **status check unique et stable** à protéger dans les branch protection rules                                                                                        |

### Outils et environnement

| Élément         | Choix                                      | Justification                                                                                                                     |
| --------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Runner          | `ubuntu-latest`                            | Hébergé GitHub, gratuit pour repos publics, généreux pour repos privés (2000 min/mois)                                            |
| Node            | **22 (LTS active)**                        | Aligné sur `engines.node` du `package.json` racine et image Docker prod                                                           |
| Package manager | **pnpm 10**                                | Aligné sur `packageManager` field du `package.json` — installation reproductible via `--frozen-lockfile` (équivalent CI/lock npm) |
| Cache           | `actions/setup-node@v4` avec `cache: pnpm` | Cache automatique du store pnpm entre runs — installation ~5x plus rapide qu'à froid                                              |
| Checkout        | `actions/checkout@v4`                      | Action officielle GitHub, version la plus récente (suivi via Dependabot — cf. [dependances.md](../bloc4/dependances.md))          |

### Critères qualité bloquants

Pour qu'une PR soit mergeable, **les 4 jobs doivent être verts** :

| Critère                          | Seuil                     | Job         |
| -------------------------------- | ------------------------- | ----------- |
| Erreurs ESLint                   | 0                         | `lint`      |
| Warnings ESLint                  | 0 (max-warnings: 0 en CI) | `lint`      |
| Fichiers non formatés (Prettier) | 0                         | `lint`      |
| Erreurs TypeScript               | 0                         | `typecheck` |
| Tests en échec                   | 0                         | `test`      |
| Échec de build api ou web        | 0                         | `build`     |

---

## 4. Hooks locaux — première ligne de défense

Avant même la CI, le développeur passe par **deux hooks Husky** qui rejouent l'essentiel en local :

| Hook         | Outil                                            | Action                                                                                                                |
| ------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `pre-commit` | `lint-staged`                                    | Sur les fichiers stagés uniquement : `eslint --fix` + `prettier --write` (auto-correction, pas de blocage si fixable) |
| `commit-msg` | `commitlint` + `@commitlint/config-conventional` | Refuse les messages de commit non conformes au format Conventional Commits (cf. CLAUDE.md § Commits)                  |

Ces hooks **ne remplacent pas la CI** (un dev peut les bypass avec `--no-verify`) mais ils réduisent la latence de feedback de ~3 min (CI) à ~5 s (local).

---

## 5. Conventional Commits → automation aval

Les messages de commit suivent le format `<type>(<scope>)?: <summary>` (cf. CLAUDE.md). Ce n'est pas qu'esthétique : ils alimentent **`release-please`** (phase 4 du [plan de déploiement](../DEPLOY-PLAN.md)) qui :

- Bump automatiquement la version dans `package.json` selon les types (`feat:` = minor, `fix:` = patch, `BREAKING CHANGE` = major).
- Met à jour `CHANGELOG.md` à partir des messages.
- Crée le tag git `vX.Y.Z` qui déclenche le job de release du pipeline CD.

→ Le **respect du format en CI** (job lint, indirectement) garantit que la chaîne de versioning fonctionne sans intervention manuelle (livrable **C4.3.2**).

---

## 6. Branch protection rules (configuration GitHub)

Côté GitHub (Settings → Branches → branch protection rules), pour `dev` et `main` :

- ☑ **Require a pull request before merging**
  - ☑ Require approvals: 1 (peut être 0 sur un projet d'école, mais conservé pour discipline)
  - ☑ Dismiss stale pull request approvals when new commits are pushed
- ☑ **Require status checks to pass before merging**
  - ☑ Require branches to be up to date before merging
  - Status check requis : **`CI success`** (le job `ci-success`)
- ☑ **Require conversation resolution before merging**
- ☑ **Require linear history** (force le squash ou rebase merge)
- ☐ Allow force pushes : désactivé
- ☐ Allow deletions : désactivé

Cette configuration est **manuelle dans l'interface GitHub** (pas dans un fichier versionné) et documentée ici pour traçabilité.

---

## 7. Critères de performance du pipeline

| Métrique                                      | Cible                     | Action si dépassé                                                        |
| --------------------------------------------- | ------------------------- | ------------------------------------------------------------------------ |
| Durée totale d'un run CI                      | < 5 min                   | Profiler le job le plus lent, paralléliser davantage, augmenter le cache |
| Taux de runs verts sur `main`                 | > 95 %                    | Investiguer la cause des rouges (tests flaky, bugs réels)                |
| Temps de feedback PR ouverte → premier statut | < 1 min                   | Vérifier la queue de runners, dégrader si saturée                        |
| Coût mensuel en minutes runner                | < 2000 min/mois (gratuit) | Si dépassé, optimiser ou passer en self-hosted                           |

---

## 8. Évolutions prévues

- **Phase 2** ([DEPLOY-PLAN.md](../DEPLOY-PLAN.md)) — ajout d'un job `docker-build` qui vérifie que les Dockerfiles api/web buildent (sans push).
- **Phase 5** — ajout d'un job `e2e` avec services Postgres + Redis containers, exécuté seulement sur les PR labellisées `e2e` pour ne pas alourdir chaque run.
- **Plus tard** — couverture de code (`jest --coverage` + upload Codecov), audit sécurité (`pnpm audit` + Snyk scan).

---

## 9. Schéma de synthèse

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Développeur                                                            │
│  ──────────                                                             │
│  git commit ──► [Husky pre-commit] ──► [Husky commit-msg]               │
│                  • eslint --fix         • commitlint                    │
│                  • prettier --write     • format Conventional           │
│                                                                         │
│  git push ────► branche feature/*                                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  GitHub Actions — CI workflow (sur PR vers dev/main)                    │
│  ──────────────────────────────────────────────────                     │
│                                                                         │
│   ┌────────┐ ┌──────────┐ ┌──────┐ ┌────────┐                          │
│   │  lint  │ │typecheck │ │ test │ │ build  │   parallèle              │
│   └───┬────┘ └────┬─────┘ └──┬───┘ └───┬────┘                          │
│       └───────────┴──────────┴─────────┘                                │
│                       │                                                 │
│                       ▼                                                 │
│                 [ci-success]  ─────► status check protégé              │
│                       │                                                 │
└───────────────────────┼─────────────────────────────────────────────────┘
                        │ tous verts ?
                        ▼
                  Merge autorisé
                        │
                        ▼
                  PR squash-mergée
                        │
                        ▼  (si merge dans main)
                Déclenche CD pipeline ──► docs/bloc2/protocole-cd.md
```

---

**Références** :

- [.github/workflows/ci.yml](../../.github/workflows/ci.yml) — implémentation
- [DEPLOY-PLAN.md](../DEPLOY-PLAN.md) — plan global
- [dependances.md](../bloc4/dependances.md) — C4.1.1, mises à jour des dépendances
- [CLAUDE.md](../../CLAUDE.md) § Git workflow — conventions de branches et commits
