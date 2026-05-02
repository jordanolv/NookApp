# NookApp

> Multi-tenant Discord/Gather-like virtual office platform. Each user can create their own "Nook" (server), invite members, design the map, run plugins. Built as a school exam project — code quality, architecture, and documentation are evaluated alongside features.

## What this is

A 2D pixel-art virtual world where small groups (≤ 15 active users per Nook) can hang out, chat, voice-call, share screens, play mini-games. Everything is multi-tenant: any signed-up user can create their own Nook and become its admin. Plugins extend the platform — chat commands, mini-games, music bots, world objects.

The project is the "real product" successor to a POC at `poc-archive/` (in this repo). Most POC code is throwaway, but the asset choices, character system, voice quality tuning, and a few patterns carry forward — see [Lessons from the POC](#lessons-from-the-poc).

**Target scale**: 15 simultaneous users per Nook, dozens of Nooks, single-VPS deployment (~10€/mo Hetzner). Architecture allows scaling vertically before any rewrite.

## Bootstrap (already done — context for the first session)

The repo skeleton was prepared before this conversation started. **You don't need to copy assets**, just verify and proceed:

- `apps/web/public/assets/` — runtime LimeZu assets (already in place, copied from the POC). Nuxt will serve them at `/assets/...` once `apps/web/` is scaffolded over this `public/` folder.
- `assets-source/` — original LimeZu archives (`Modern_Office_Revamped_v1.2/` + `moderninteriors-win/`) with license texts + uncropped sheets. **Gitignored** — only the runtime copy under `apps/web/public/assets/` ships.
- `.gitignore` — already in place at the repo root with the right defaults.
- `CLAUDE.md` — this file.

Before writing any sprite-coordinate code, **read the LimeZu sheet memory**:
```
~/.claude/projects/-Users-jordan-olv-Jordan-Dev-poc-gather/memory/limezu_cg_layout.md
```
It documents the *exact* frame layout that took several broken attempts to figure out in the POC. Don't trust visual inspection alone — wrong rows look convincingly like walks but are sit / attack / weapon-draw animations.

When implementing a feature the POC already covered, **skim the POC source** at `~/Jordan/Dev/poc-gather/game.js` for the verbatim patterns:
- World-to-screen projection via `cam.worldView` (search `syncCamBubble`, `syncPlayerNameTag`)
- LiveKit Room construction with audio/video tuning (search `audioPreset`, `screenShareEncoding`)
- Voice room hysteresis (search `_lkLeaveTimeout`)
- Identity = `socket.id` mapping (search `_ensureLiveKitToken`)
- Build editor flow (search `initEditor`, `_onEditorPointerDown`)

Re-implement these as Vue components / composables — don't port `game.js` line-for-line.

Start **Sprint 1** deliverables in order. If anything looks off (missing files, license question, etc.), confirm with the user before proceeding.

## Stack & rationale

| Layer | Choice | Why |
|---|---|---|
| **Runtime** | Node 22+ | Stable LTS, native ESM, broad ecosystem |
| **Backend framework** | **NestJS** | Modular, decorator-driven, DI, guards/pipes/interceptors — exam-friendly architecture. OpenAPI auto-generation via `@nestjs/swagger`. |
| **ORM** | **Drizzle** | Type-safe, modern, schema-as-code, lightweight migrations via `drizzle-kit`. Better DX than TypeORM/Prisma for a TS-first project. |
| **Database** | **Postgres 16** | Concurrent multi-tenant writes, `JSONB` for plugin configs, robust indexing. SQLite considered but rejected for multi-tenant concurrency. |
| **Auth** | **Better Auth** | Modern, TS-first, built-in email+password, OAuth providers (Discord), email verification, sessions in DB. Native Drizzle adapter. Cleaner than Passport.js for this stack. |
| **Email** | **Resend** (prod) + **Mailpit** container (dev) | Resend free tier covers 3k/mo. Mailpit captures emails locally so dev never sends real mail. |
| **Frontend framework** | **Nuxt 3** | File-based routing, hybrid SSR/SPA per route (SSR for landing/marketing, SPA for the app), Pinia integration, modules ecosystem. |
| **UI components** | **Tailwind + Reka UI** | Reka = headless primitives (shadcn-vue's foundation). Composable + accessible. |
| **State** | **Pinia** | Vue-native, simple, devtools-friendly. |
| **Game engine** | **Phaser 3** | Pixel-art friendly, mature, good for top-down 2D. Mounted in a `<ClientOnly>` Nuxt component. |
| **Realtime (events)** | **Socket.IO** via NestJS `@nestjs/websockets` + `@nestjs/platform-socket.io` | Rooms, fallbacks, broad client compat. Auth via JWT in handshake. |
| **Realtime (collab)** | **Y.js + Hocuspocus** | Y.js for CRDT, Hocuspocus as the sync server (Apache 2.0, NestJS-mountable). Used for collaborative map editing. |
| **Voice/video** | **LiveKit OSS** (self-hosted) | Already proven in POC. Per-channel rooms, scoped tokens. Fixed UDP port via `livekit.yaml` for clean Docker port mapping. |
| **Validation** | **Zod** | Schema validation in shared `protocol` package; both client and server import the same Zod schemas. |
| **Hosting** | **Hetzner CPX21** (VPS, ~10€/mo, 3 vCPU, 4 GB) | Single-machine fits target scale. Caddy reverse proxy auto-HTTPS. Docker Compose for orchestration. |
| **CI/CD** | **GitHub Actions** | Lint + typecheck + test on PR; deploy on `main` via SSH + `docker compose pull && up -d`. |
| **Monorepo** | **pnpm workspaces** | Lightweight, no Turborepo needed for 2 apps + 3 packages. |

## Repository layout

```
nookapp/
├── apps/
│   ├── api/                       # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/              # Better Auth integration, guards
│   │   │   ├── users/             # /me, profile, avatar
│   │   │   ├── servers/           # CRUD on Nooks (a "server" = a Nook)
│   │   │   ├── channels/          # text/voice/game channels per server
│   │   │   ├── members/           # memberships, roles, permissions
│   │   │   ├── messages/          # text messages persistence
│   │   │   ├── voice/             # LiveKit token endpoint, LK webhooks
│   │   │   ├── maps/              # map state CRUD + Y.js Hocuspocus mount
│   │   │   ├── plugins/           # registry, install, enable, config
│   │   │   ├── realtime/          # Socket.IO gateway, room namespacing
│   │   │   ├── mailer/            # Resend / Mailpit abstraction
│   │   │   └── common/            # base entities, decorators, filters
│   │   ├── test/                  # Jest unit + e2e
│   │   └── nest-cli.json
│   └── web/                       # Nuxt 3 frontend
│       ├── pages/
│       │   ├── index.vue          # landing (SSR)
│       │   ├── auth/              # login, register, verify-email (SSR)
│       │   └── app/               # the actual app (SPA)
│       │       └── [serverId]/    # per-Nook scoped pages
│       ├── components/
│       │   ├── ui/                # Reka UI wrappers
│       │   ├── chat/              # chat panel, channels list
│       │   ├── voice/             # voice panel, cam bubbles
│       │   ├── world/             # Phaser canvas, name tags, badges
│       │   └── editor/            # map editor palette + tools
│       ├── composables/           # useAuth, useSocket, useLiveKit, useYDoc
│       ├── stores/                # Pinia: auth, currentServer, map, voice
│       ├── plugins-runtime/       # plugin loader (resolves manifests, mounts UI)
│       └── nuxt.config.ts
├── packages/
│   ├── protocol/                  # Zod schemas + TS types shared client↔server
│   │   ├── socket-events.ts       # event names + payloads (typed both sides)
│   │   ├── dto.ts                 # REST request/response shapes
│   │   └── permissions.ts         # role/permission constants
│   ├── plugin-sdk/                # plugin contract (interfaces + base classes)
│   │   ├── manifest.ts            # plugin.json schema
│   │   └── api.ts                 # SDK surface (interfaces only)
│   └── db/                        # Drizzle schema + migrations + seed
│       ├── schema/                # one file per domain
│       ├── migrations/            # generated by drizzle-kit
│       └── seed.ts
├── plugins/
│   ├── hello-world/               # minimal example used in tests
│   ├── slot-machine/              # demo, ported from POC
│   └── card-collector/            # user's "exclusive" plugin
├── docker-compose.yml             # postgres + livekit + mailpit + api + web + caddy
├── docker-compose.prod.yml        # overrides for prod (resend, real domain)
├── livekit.yaml                   # LiveKit OSS config (UDP port 7882)
├── Caddyfile                      # reverse proxy + auto-HTTPS
├── docs/
│   ├── ARCHITECTURE.md            # high-level diagrams
│   ├── ER-diagram.png             # generated from Drizzle schema
│   ├── PLUGIN-SDK.md              # how to write a plugin
│   └── DEPLOY.md                  # VPS setup steps
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
└── CLAUDE.md                      # this file
```

## Architecture

### Multi-tenancy

Shared database, shared schema with `serverId` foreign keys on every tenant-owned table. A `ServerScopeGuard` runs on every protected route, resolves the target `serverId` from the path or body, verifies the requesting user has membership, and injects `req.server` + `req.member` into the request context. All queries through repositories go through a `findScoped(serverId, ...)` helper to make accidental cross-tenant queries impossible by construction.

LiveKit rooms are named `${serverId}:${channelId}` — naturally scoped. Socket.IO uses **namespaces per server** (`/server/:serverId`) and rooms inside the namespace per channel.

### Auth flow

Better Auth handles everything:
- **Email + password** signup → email verification link → can log in once verified
- **Discord OAuth** signup → no verification step (Discord email already verified)
- Sessions stored in DB (table `session`), rotating tokens
- Frontend: `useAuth()` composable, route middleware protects `/app/**`
- Backend: a NestJS `AuthGuard` reads the session cookie / bearer token and resolves the user

### Real-time architecture

Two independent realtime layers, intentionally separated:

1. **Socket.IO** for events that don't need CRDT semantics: presence (player joined/left), positions (broadcast at 15 Hz, volatile), chat messages, plugin events, voice state. Auth via JWT in handshake. Namespaced per server.
2. **Y.js via Hocuspocus** for collaborative state: the **map editor** is the main user. Every map document is a Y.Doc identified by `${serverId}:map`. Multiple admins can edit simultaneously; conflicts resolve via CRDT. Hocuspocus persists the doc to Postgres on each update (debounced).

Voice/video lives entirely in **LiveKit** — separate signaling channel, separate media path. The platform issues short-lived JWTs that grant a user access to a specific room (one room per voice channel).

### Plugin system

A plugin is a folder in `plugins/` with this shape:

```
plugins/card-collector/
├── plugin.json                   # manifest (id, version, permissions)
├── server.ts                     # NestJS module, server-side logic
├── client/
│   ├── index.ts                  # entry, registers UI panels/commands
│   └── components/
└── assets/                       # sprites, sounds, images
```

**Manifest** (`plugin.json`):

```json
{
  "id": "card-collector",
  "version": "1.0.0",
  "displayName": "Card Collector",
  "description": "Collectible card game à la Discord card bots",
  "author": "Jordan",
  "permissions": [
    "commands.register",
    "events.player",
    "world.placeObject",
    "storage.kv",
    "ui.menuTab"
  ],
  "entry": {
    "server": "./server.ts",
    "client": "./client/index.ts"
  }
}
```

**Server-side SDK** (typed contract in `packages/plugin-sdk/api.ts`):

```ts
interface PluginContext {
  pluginId: string;
  serverId: string;             // bound to the Nook the plugin is enabled in

  commands: {
    register(name: string, handler: CommandHandler, opts: CommandOptions): void;
  };

  events: {
    on(event: "player:joined" | "player:left" | "message:sent" | ...,  cb): void;
  };

  world: {
    placeObject(spec: WorldObjectSpec): WorldObjectHandle;  // adds an interactable
    removeObject(handle: WorldObjectHandle): void;
  };

  voice: {
    play(channelId: string, audioUrl: string): Promise<void>;  // soundboard / TTS
    setRoomName?(channelId: string, name: string): void;
  };

  storage: {
    get<T>(key: string): Promise<T | null>;   // namespaced "pluginId:serverId:key"
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };

  ui: {
    menuTab(spec: { icon: string; label: string; component: string }): void;
    modal(spec: { component: string; props?: any }): void;
  };

  permissions: {
    has(permission: string): boolean;
  };
}
```

**Client-side SDK** has a similar surface for UI hooks and command palette integration. Plugins ship Vue components which are loaded dynamically by the runtime when their parent server is active.

**Permissions** declared in `plugin.json` are checked by `PluginPermissionGuard` on every SDK call. A plugin without `world.placeObject` permission gets a runtime error if it tries.

**Per-server enable**: a `server_plugins` table holds `(serverId, pluginId, enabled, config: jsonb)`. A plugin only runs (server-side) for servers where it's enabled. Plugins live in `plugins/` (in-repo for v1 — no public registry yet). To make a plugin "exclusive" to specific servers, add a `visibility: "public" | "private"` field with a `whitelistServerIds` list — defer to v2.

### Map editor

In-game editor accessible to admins of a Nook. Three-phase workflow:

1. **🟫 Sols (floors)** — palette of tile assets, paint cell-by-cell on a 32×32 grid.
2. **🧱 Pièces (rooms)** — drag a rectangle → auto-generates 4 walls + a configurable doorway. Creating a room **automatically creates a chat channel** for it; deleting the room offers to delete the channel.
3. **🪑 Décor (objects)** — drag-and-drop from palette, snap-to-grid optional, rotation, depth (Y-sort).

Map state stored as a Y.Doc per server: `tiles`, `rooms`, `objects` are CRDT maps. Hocuspocus syncs in real time between admins editing simultaneously. Persistence: every N changes (debounced 1s), the Y.Doc is serialized to Postgres `JSONB`.

Format on disk: `{ version, tiles: [...], rooms: [...], objects: [...] }`. Tiled `.tmx` import/export is a stretch goal.

## Domain model (Drizzle schema sketch)

```ts
// packages/db/schema/users.ts
user            { id, email, name, avatarUrl, emailVerified, createdAt }
account         { userId, providerId, providerAccountId, ... }   // Better Auth
session         { id, userId, expiresAt, token, ... }            // Better Auth
verification    { id, identifier, value, expiresAt }             // Better Auth

// packages/db/schema/servers.ts
server          { id, slug, name, ownerId, iconUrl, createdAt }
member          { id, serverId, userId, role, joinedAt }
                // role: "owner" | "admin" | "member"
serverPlugin    { serverId, pluginId, enabled, config }          // composite PK

// packages/db/schema/channels.ts
channel         { id, serverId, type, name, position, parentId? }
                // type: "text" | "voice" | "game"

// packages/db/schema/messages.ts
message         { id, channelId, authorId, content, createdAt, editedAt? }

// packages/db/schema/maps.ts
map             { serverId (PK), data: jsonb, version, updatedAt }
                // data = serialized Y.Doc

// packages/db/schema/plugins.ts
pluginInstall   { id, pluginId, version, installedAt }           // platform-wide registry
```

Indexes on every `serverId` FK. JSONB on `serverPlugin.config` and `map.data`.

## Gameplay rendering (lock these in, redesign UI freely)

The POC nailed the *in-world* feel — camera, character scale, animation timing. **Reproduce these exact values**; everything else (panels, menus, colors, typography) is open for redesign with the new Tailwind/Reka setup.

### Camera

- Zoom: **1.5×**
- Follow: `cameras.main.startFollow(player, true, 0.15, 0.15)` — smooth lerp, not snap
- `setRoundPixels(true)` — keeps pixel art crisp under sub-pixel motion
- World bounds set to actual map size so the camera clamps at edges
- `setBackgroundColor("#cdd0d4")` on the canvas for the unrendered margin

### Character sprite

- LimeZu Character Generator layered system: 5 sprites at the same position, same frame index — `body, eyes, outfit, hair, accessory` (back→front)
- Each layer: **scale 2×**, **origin `(0.5, 0.85)`** so `player.y` sits near the feet (head is at `player.y - 50` world units)
- Body sprite drives animation, the 4 overlays mirror its frame each `POST_UPDATE` tick — don't use Phaser's `animationupdate` event alone, it misses the first frame after `play()` and the idle frame after `stop()`. Pull `body.frame.name` directly each tick.
- Physics body sized small relative to the sprite: `setSize(10, 6)` + `setOffset(3, 24)` — collision is at the feet, not the whole sprite

### Walk animation

Movement speed: **170 units/s** (`vx * 170, vy * 170`), normalized for diagonals.

LimeZu CG sheets are 896×656 with 16×32 frames (56 cols × 20 rows). The frame layout that took several broken attempts to figure out — **keep this exactly**:

- **Idle (row 0, frames 0–3)**: right (0), up (1), left (2), down (3)
- **Walk (row 2, frames 112–135)**: 6 frames per direction in the same order:
  - walk-right: 112–117
  - walk-up: 118–123
  - walk-left: 124–129
  - walk-down: 130–135

Each direction has its own walk anim (no flipX hack) — every direction frame is hand-drawn. `frameRate: 8`, `repeat: -1`. Other rows on the sheet are sit / sleep / attack / weapon-draw — visually similar but **not** walks. Don't trust visual inspection alone, the memo `~/.claude/projects/-Users-jordan-olv-Jordan-Dev-poc-gather/memory/limezu_cg_layout.md` has the verified mapping.

When stopping, `anims.stop()` + `setFrame(IDLE_FRAME[lastDir])` (frames 0/1/2/3 from row 0).

### Direction mapping in input

```
const dir = Math.abs(vx) > Math.abs(vy)
  ? (vx > 0 ? "right" : "left")
  : (vy > 0 ? "down"  : "up");
```

Diagonal movement picks the dominant axis for animation. No flipX, no mirroring.

### Decor & Y-sort

- Decor sprites: **scale 2×, origin `(0.5, 1)`** (anchored at the floor)
- Depth = `y` for Y-sort — sprites with a larger `y` (further down screen) render on top of those with smaller `y`, so the player passes correctly behind/in-front of furniture
- Characters: same depth = `y` rule applies, including overlays which use `y + 0.01 * layerIndex` to keep stack order stable when bodies cross

### World floor (cosmetic baseline)

- Beige `#f3ead4` base fill
- Grid lines `#e6dcc2` every 32 px, 1px wide, alpha 0.6
- Outer wall ring: dark color, 16 px thick, rendered last with `setDepth(15)` so it always frames the world

These are dev defaults — the build editor will overpaint them with user content. The point is *not* a blank canvas at boot but a visible, walkable space.

### Pixel-perfect rendering

The canvas has `image-rendering: pixelated` (or `crisp-edges`) so sprite scaling stays sharp. **Side effect: any text rendered to the canvas (Phaser `add.text`) will look pixelated**. All text overlays — name tags, status badges, prompts, labels — must be DOM elements positioned by projecting world coords each tick. The projection formula:

```ts
const wv = camera.worldView;
const screenX = canvasRect.left + ((worldX - wv.x) / wv.width)  * canvasRect.width;
const screenY = canvasRect.top  + ((worldY - wv.y) / wv.height) * canvasRect.height;
```

`camera.worldView` is the only correct source — `camera.scrollX/Y` is broken under follow + zoom.

### Position sync (DOM overlays)

DOM elements following world objects (cam bubble, name tag, status badges, NPC interaction prompt, screen share ring) MUST be repositioned in the scene's `POST_UPDATE` event handler, not in `update()`. The reason: physics integrates after `update()` runs, so reading `player.x/y` in `update()` gives last-frame values and the DOM lags one frame behind the sprite — visually it shows as a jitter on every move.

Single `POST_UPDATE` listener registered in `create()` dispatches all `syncXxx()` methods.

## Conventions

- **TypeScript strict everywhere**, including `tsconfig.base.json` shared across workspaces
- **No `any`** unless explicitly justified by a comment
- **Zod-first contracts**: define a Zod schema in `packages/protocol`, derive the TS type via `z.infer<>`. Validate at the boundary (controller, gateway, fetch wrapper)
- **DTOs in NestJS** = Zod schemas + `nestjs-zod` for auto-OpenAPI
- **Errors**: NestJS exception filters return `{ code, message, details? }` JSON. Zod validation errors auto-formatted
- **Naming**:
  - REST routes: `/api/v1/servers/:serverId/channels`
  - Socket events: `domain:action` (e.g. `player:moved`, `message:sent`)
  - DB tables: `snake_case`, columns too
  - TS files: `kebab-case`
- **Comments** explain *why*, never *what*. Keep them sparse
- **No emojis in code/comments**. Plenty in UI strings — that's the Discord/Gather aesthetic
- **One module per domain** in NestJS. Plugin modules are isolated with their own DI container scope
- **Tests**: every service has a `*.spec.ts` (unit, mocked deps); every controller has a `*.e2e-spec.ts` (real DB, test container)

## Git workflow

**One branch per ticket, PR to `main`. Never commit directly to `main & dev`.** Including for Sprint 1 scaffolding — split the work into logical tickets and ship each as its own PR.

### Branch naming

`<type>/<short-kebab-case-summary>`, where `<type>` matches the commit prefix (see below):

- `feat/auth-discord-oauth`
- `feat/map-editor-room-tool`
- `fix/voice-room-hysteresis`
- `chore/setup-pnpm-workspace`
- `docs/architecture-diagram`
- `refactor/extract-projection-composable`
- `test/auth-e2e`

### Commit messages — Conventional Commits, subject-only

Format: `<type>(<scope>)?: <imperative summary>` — lowercase, no period, ≤ 72 chars. **Subject line only, never a body.** All context goes in the PR description, not the commit.

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `build`, `ci`, `revert`.

Scope is the affected module/package when relevant: `feat(auth): add discord oauth`, `fix(voice): debounce livekit reconnect`. Skip the scope for cross-cutting changes.

Examples:
```
feat(auth): add discord oauth provider
fix(realtime): scope socket namespaces by serverId
chore: setup pnpm workspace
docs: add ER diagram
```

Pass the message with a single `-m`, never with a heredoc body. A pre-commit hook (Husky + commitlint) enforces the format. **Don't bypass it with `--no-verify` unless the user explicitly asks** — if a commit fails the hook, fix the subject.

### Pull request rules

- PR title = same Conventional Commit format as the squash commit
- PR body has 3 sections: **What** (1-2 sentences), **Why** (the user-facing motivation), **How to test** (steps a reviewer can run)
- Link the related ticket/issue if any
- Squash merge by default — keeps `main` linear with one commit per PR
- CI must be green (lint + typecheck + tests). Fix the underlying issue, never disable a check to land a PR
- Branch is deleted after merge

### Never credit Claude

**Commits, PR descriptions, comments, README, code — never add a "Co-Authored-By: Claude", "Generated with Claude Code", "🤖 ..." footer, or any AI-authorship marker.** All authorship is the user's. If you generate a commit message, write it as if the user typed it; if you write a PR description, the same rule. If a tool default tries to inject a co-author line, strip it before committing.

## Environment & secrets

`.env.example` lists every required variable. Local dev uses `.env`. Prod uses environment variables on the VPS or Docker secrets.

Required:

```bash
NODE_ENV=development
PORT=3000

DATABASE_URL=postgres://nookapp:nookapp@localhost:5432/nookapp
JWT_SECRET=...                              # for Socket.IO handshake
BETTER_AUTH_SECRET=...                      # 32+ chars

# Discord OAuth (https://discord.com/developers/applications)
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback/discord

# LiveKit (self-hosted via docker-compose by default)
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=poc-gather-dev-secret-min-32-characters-long

# Email — Mailpit in dev, Resend in prod
MAIL_DRIVER=mailpit                         # "mailpit" | "resend"
MAIL_FROM="NookApp <noreply@nookapp.local>"
RESEND_API_KEY=...                          # only when MAIL_DRIVER=resend
```

Discord OAuth setup: create an app at https://discord.com/developers/applications, add the redirect URI, copy the client ID + secret.

Resend setup: sign up at https://resend.com, verify a sending domain (or use the `onboarding@resend.dev` for test), grab an API key.

## Sprint roadmap

### Sprint 1 — Foundation (the next chantier)

Goal: full infra boots end-to-end, you can sign up via email or Discord, verify your email, log in, and reach an empty `/app` page. No game, no domain logic yet.

Deliverables:
- pnpm workspace + tsconfig.base + ESLint/Prettier + Husky + commitlint
- `apps/api` scaffolded with NestJS, basic modules: `auth`, `users`, `mailer`, `health`
- `apps/web` scaffolded with Nuxt 3, Tailwind, Reka UI, Pinia. Pages: `/`, `/auth/register`, `/auth/login`, `/auth/verify`, `/app`
- `packages/protocol` with auth DTOs (Zod)
- `packages/db` with Drizzle schema for `user`, `account`, `session`, `verification`. Migration generated and applied on boot in dev
- Better Auth integrated in NestJS, exposing routes, with email-pass + Discord providers
- Mailer abstraction with Mailpit + Resend drivers; verification email template
- `docker-compose.yml`: postgres, mailpit, livekit, api, web, caddy
- `Caddyfile` configured for local dev (proxying `nookapp.localhost` → web app)
- Top-level scripts: `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`
- README with quickstart
- `.env.example` complete

### Sprint 2 — Core domain

- Servers (Nooks) CRUD: create, list mine, invite, join via invite link
- Channels CRUD inside a server
- Members + roles (owner/admin/member) + a permission system on routes
- Messages: REST for fetching, Socket.IO for live broadcast, persistence in DB
- LiveKit token endpoint scoped to channel + membership check
- Per-server Socket.IO namespace, per-channel room

### Sprint 3 — Plugin SDK

- `packages/plugin-sdk` with full typed contract
- NestJS `PluginsModule` that loads `plugins/*/plugin.json` at boot, registers per-server modules dynamically based on `server_plugins.enabled`
- `PluginPermissionGuard` on every SDK call
- `plugins/hello-world` reference plugin: registers a `/hello` command, posts an event, has a Vue panel
- Frontend plugin runtime: dynamic component loading, command palette integration

### Sprint 4 — Map editor

- Phaser scene mounted in Nuxt with empty world
- Y.js doc bound to map state, Hocuspocus client connecting to backend
- Tile palette UI + paint tool (phase Sols)
- Room tool: drag rectangle, generate walls + door, auto-create channel (phase Pièces)
- Object palette: drag-and-drop, rotation, snap, Y-sort (phase Décor)
- Per-tool permission checks (only members with edit permission can mutate)
- Live cursor preview of other admins editing

### Sprint 5 — Polish + deploy

- Full Jest unit coverage for services
- E2E tests on critical flows (signup, create server, post message)
- `@nestjs/swagger` exposing `/api/docs` with all endpoints documented
- ER diagram generated via `drizzle-kit studio` screenshot or `dbdocs`
- `ARCHITECTURE.md` with diagrams (Excalidraw)
- GitHub Actions CI: lint + typecheck + test on PR; build + push docker images on `main`
- VPS deploy script: SSH + `docker compose pull && up -d`
- Caddy with real domain + auto-HTTPS
- Production `.env` rotation procedure documented

## What NOT to do

- **Don't add features beyond the current sprint**. Scope creep is the #1 risk on a 5-sprint project. Slot machine, card game, music bot, etc. live in `plugins/` — they wait until Sprint 3.
- **Don't write multi-paragraph comments or ASCII art docstrings**. The codebase prefers terse code with named identifiers over long prose.
- **Don't use `any` to bypass type errors**. Fix the type or add a justified `@ts-expect-error` with a comment.
- **Don't query without `serverId` scoping** on tenant-owned tables. Use the repo helpers; raw queries that escape this rule will leak data across Nooks.
- **Don't bundle plugins into the main app**. They must stay in `plugins/` and be loaded via the registry. Otherwise you can't disable them per-Nook.
- **Don't put state in `update()` (Phaser) — use the `POST_UPDATE` event** for any DOM/overlay positioning. Reading `player.x` in `update()` gives you last-frame's value because physics runs after.
- **Don't commit `.env`**. There's a `.gitignore` for it. Rotate any leaked LiveKit/Discord/Resend credentials immediately.
- **Don't reach for SQLite** "just for dev". Mismatched dev/prod DB engines bite hard with JSONB, full-text search, etc. Run Postgres in Docker for dev too.

## Lessons from the POC

The `poc-archive/` (current `poc-gather` codebase) explored the UX and validated technical choices. The patterns worth carrying forward:

- **LimeZu Modern Office Revamped** + **Character Generator** assets are excellent. Already documented in `~/.claude/projects/-Users-jordan-olv-Jordan-Dev-poc-gather/memory/limezu_cg_layout.md`. Key facts: 896×656 sheets, 16×32 frames, row 0 = idle (R/U/L/D), row 2 = walks (R/U/L/D × 6 frames each).
- **Identity = `socket.id`** for LiveKit JWTs so remote tracks map 1:1 to remote player sprites. Critical pattern.
- **DOM for text, Phaser for sprites/world geometry**. Canvas `image-rendering: pixelated` ruins anti-aliased text.
- **In-world overlays project via `cam.worldView`** (not `cam.scrollX` — broken under follow + zoom). Formula: `screenX = rect.left + ((worldX - wv.x) / wv.width) * rect.width`.
- **2-second grace period on voice room exit** (cancels if player walks back in) avoids audio churn on boundaries.
- **Audio quality tuning**: `audioCaptureDefaults` with `echoCancellation/noiseSuppression/autoGainControl`, `audioPreset: { maxBitrate: 96_000 }` (vs default 24 kbps), `dtx + red` enabled.
- **Screen share quality tuning**: capture at 2560×1440 30fps with `displaySurface: "monitor"`, publish at 7 Mbps with VP9 codec, no simulcast.
- **`makeFloating` panels** (POC pattern) — for Nook, replace with proper Vue components. The pattern (drag + resize + persist) is the same; the implementation moves into a composable.

The core UX learnings (chat panel docked right with shrinking canvas, voice panel bottom-left, MMO-style menu with vertical tabs, command palette via `Cmd+K` / `/`, build editor with phase tools) all carry over. Re-implement them as Vue components, not vanilla DOM.

## Open questions / future calls

- **Plugin distribution**: in-repo only for v1. v2: public marketplace? Submission flow? Sandboxing?
- **Y.js auth**: Hocuspocus auth happens via JWT on connection. How do we revoke mid-session if a user is removed from a server? (Probably: check membership on every doc operation server-side.)
- **LiveKit cost at scale**: self-hosted is fine for one VPS. If we cross ~50 concurrent voice users across Nooks, we may need a media-only secondary server.
- **Map size limits**: tile + object count caps to keep Y.Doc reasonable. 200×200 grid max? Need to benchmark.
- **Email verification UX**: 24h token expiry, resend flow, what happens to unverified accounts (auto-delete after 7d?).
- **Nook deletion**: hard delete vs soft delete (preserve message history for the platform owner)?
- **Free tier limits**: how many Nooks per user? (Discord: unlimited. We probably want a soft cap for spam protection.)

## Long-term memory

When you discover something non-obvious that future Claude sessions would need (an obscure SDK quirk, a sprite-coordinate mistake, a configuration gotcha), write a memory file at `~/.claude/projects/<project-slug>/memory/`. The POC already has memories there worth checking — `limezu_cg_layout.md` in particular.

---

**Next step**: scaffold Sprint 1 according to the roadmap above. Start by archiving the POC, initializing the pnpm workspace, then iterating through the deliverables list. Verify each piece works locally before moving on.
