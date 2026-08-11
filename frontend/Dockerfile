FROM node:22-alpine AS builder
WORKDIR /app
ENV CI=true
RUN npm config set registry https://registry.npmmirror.com && npm install -g pnpm
RUN pnpm config set registry https://registry.npmmirror.com
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY src/ src/
COPY public/ public/
COPY index.html tsconfig.json vite.config.ts uno.config.ts eslint.config.js ./
RUN pnpm install
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
