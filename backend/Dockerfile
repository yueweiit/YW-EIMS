FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm config set registry https://registry.npmmirror.com && npm install
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY apps/ apps/
COPY libs/ libs/
RUN npx prisma generate --schema libs/database/prisma/schema.prisma
RUN npx nest build api

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/apps/api/main"]
