FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY apps/ apps/
COPY libs/ libs/
RUN npx prisma generate --schema libs/database/prisma/schema.prisma
RUN pnpm build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/apps/api/main"]
