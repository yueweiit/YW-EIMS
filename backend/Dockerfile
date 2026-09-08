FROM node:22-alpine AS builder
WORKDIR /app
RUN npm config set registry https://registry.npmjs.org && npm install -g pnpm@11.8.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/ apps/
COPY libs/ libs/
RUN pnpm install --frozen-lockfile --ignore-scripts
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
