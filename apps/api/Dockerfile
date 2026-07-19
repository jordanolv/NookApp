FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++ libc6-compat
RUN corepack enable && corepack prepare pnpm@10.18.2 --activate

WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/protocol/package.json packages/protocol/
COPY packages/db/package.json packages/db/

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps/api apps/api

RUN pnpm -r --filter "./packages/*" run build \
 && pnpm --filter @nookapp/api run build \
 && pnpm deploy --filter @nookapp/api --prod --legacy /prod/api


FROM node:22-alpine AS runtime

RUN apk add --no-cache tini libc6-compat

WORKDIR /app

ENV NODE_ENV=production \
    API_PORT=4000 \
    COLLAB_PORT=4234

COPY --from=builder /prod/api/node_modules ./node_modules
COPY --from=builder /prod/api/dist ./dist
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /app/uploads \
 && chown -R node:node /app

USER node

EXPOSE 4000 4234

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
