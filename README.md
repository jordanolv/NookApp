# NookApp

Multi-tenant Discord/Gather-like virtual office. Each user creates their own "Nook" (server), invites members, designs the map, runs plugins. Built as a school exam project — see [`CLAUDE.md`](./CLAUDE.md) for full context.

## Stack

- **Backend**: Node 22 + NestJS + Drizzle ORM + Postgres 18 + Better Auth + Socket.IO + Y.js/Hocuspocus + LiveKit OSS
- **Frontend**: Nuxt 3 + Tailwind + Reka UI + Pinia + Phaser 3
- **Shared**: Zod (`packages/protocol`), Drizzle schema (`packages/db`), plugin contract (`packages/plugin-sdk`)
- **Infra**: pnpm workspaces, Docker Compose, Caddy reverse proxy

## Prerequisites

- Node `>= 22`
- pnpm `>= 10`
- Docker (Postgres, Mailpit, LiveKit run as containers)

## Quickstart

```bash
# 1. Install workspace deps
pnpm install

# 2. Configure env
cp .env.example .env
# edit .env if needed — defaults work with the docker-compose stack

# 3. Boot Postgres + Mailpit + LiveKit
docker compose up -d

# 4. Apply DB migrations
pnpm db:generate     # only when schema changes
pnpm db:migrate

# 5. Run api (port 3000) + web (port 3001) in parallel
pnpm dev
```

Then:

- API: http://localhost:3000/api/v1/health
- Swagger: http://localhost:3000/api/docs
- Web: http://localhost:3001
- Mailpit UI: http://localhost:8025
- LiveKit signaling: ws://localhost:7880

### Optional Caddy reverse proxy

If you want pretty hostnames locally, install Caddy and add to `/etc/hosts`:

```
127.0.0.1 nookapp.localhost api.nookapp.localhost mail.nookapp.localhost
```

Then `caddy run --config Caddyfile` from the repo root.

## Repo layout

```
apps/
  api/           NestJS backend
  web/           Nuxt 3 frontend
packages/
  protocol/      Zod schemas + TS types shared client↔server
  db/            Drizzle schema + migrations
  plugin-sdk/    plugin contract (interfaces only)
plugins/         per-Nook plugins (loaded by registry)
```

## Scripts (root)

| Script                              | Description                                      |
| ----------------------------------- | ------------------------------------------------ |
| `pnpm dev`                          | Start `api` and `web` in parallel                |
| `pnpm build`                        | Build all workspaces                             |
| `pnpm typecheck`                    | Typecheck all workspaces                         |
| `pnpm lint` / `pnpm lint:fix`       | ESLint over `.ts/.tsx/.vue`                      |
| `pnpm format` / `pnpm format:check` | Prettier                                         |
| `pnpm test`                         | Run all package tests                            |
| `pnpm db:generate`                  | Drizzle: generate SQL migration from schema diff |
| `pnpm db:migrate`                   | Apply pending migrations to `DATABASE_URL`       |
| `pnpm db:studio`                    | Drizzle Studio UI                                |

## Git workflow

One branch per ticket. PRs target `dev`; `dev` merges into `main` on release. Commit format: Conventional Commits, subject only (≤72 chars). See `CLAUDE.md` § _Git workflow_ for the full rules.

## License

Source code: TBD. LimeZu assets under `apps/web/public/assets/` follow the LimeZu licenses (see `assets-source/`, gitignored).
