# 后端构建阶段
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 复制后端依赖配置文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制后端源码
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY apps/ apps/
COPY libs/ libs/

# 生成 Prisma Client
RUN npx prisma generate --schema libs/database/prisma/schema.prisma

# 构建
RUN pnpm build

# 生产阶段
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
