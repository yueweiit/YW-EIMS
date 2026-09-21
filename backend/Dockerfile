FROM node:22-alpine AS builder
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmmirror.com
ENV CI=true \
    PNPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    PNPM_CONFIG_NETWORK_CONCURRENCY=8 \
    PNPM_CONFIG_FETCH_RETRIES=5 \
    PNPM_CONFIG_FETCH_TIMEOUT=600000 \
    PNPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
RUN npm config set registry "${NPM_REGISTRY}" && npm install -g pnpm@11.8.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# pnpm 11 reads network settings from PNPM_CONFIG_* (not install CLI flags).
# Cache downloaded packages even when an install fails. Copy source afterwards
# so application-only changes do not repeat the dependency download step.
RUN --mount=type=cache,id=yw-eims-backend-pnpm-store,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --ignore-scripts
COPY apps/ apps/
COPY libs/ libs/
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
RUN npx prisma generate --schema libs/database/prisma/schema.prisma
RUN npx nest build api

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/apps/api/main"]
