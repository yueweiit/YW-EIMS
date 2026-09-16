FROM node:22-alpine AS builder
WORKDIR /app
ENV CI=true
ENV PNPM_CONFIG_NETWORK_CONCURRENCY=8 \
    PNPM_CONFIG_FETCH_RETRIES=5 \
    PNPM_CONFIG_FETCH_TIMEOUT=600000 \
    PNPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
RUN npm config set registry https://registry.npmmirror.com && npm install -g pnpm@11.8.0
RUN pnpm config set registry https://registry.npmmirror.com
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY src/ src/
COPY public/ public/
COPY index.html tsconfig.json vite.config.ts uno.config.ts eslint.config.js ./
# Keep the pnpm store across Docker rebuilds and tolerate the slow mirror used
# in the deployment environment. This prevents a transient package download
# from forcing the whole frontend dependency install to start over.
RUN --mount=type=cache,id=yw-eims-frontend-pnpm-store,target=/root/.local/share/pnpm/store/v11 \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
