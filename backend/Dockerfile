FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.5.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nest-cli.json tsconfig.json ./
COPY apps ./apps
COPY libs ./libs

RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm build

FROM node:22-alpine AS runtime

RUN corepack enable && corepack prepare pnpm@10.5.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/libs/database/prisma ./libs/database/prisma

EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema libs/database/prisma/schema.prisma && node dist/apps/api/main.js"]
