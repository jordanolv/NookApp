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
COPY apps/web apps/web

RUN pnpm -r --filter "./packages/*" run build \
 && pnpm --filter @nookapp/web run build


FROM node:22-alpine AS runtime

RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production \
    NUXT_HOST=0.0.0.0 \
    NUXT_PORT=4001 \
    PORT=4001

COPY --from=builder /repo/apps/web/.output ./.output

USER node

EXPOSE 4001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", ".output/server/index.mjs"]
