FROM node:22-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.5.0 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY src ./src
COPY build ./build
COPY public ./public
COPY index.html vite.config.ts tsconfig.json uno.config.ts ./
COPY .env ./
COPY .env.prod ./
ARG VITE_SERVICE_BASE_URL=/api
ENV VITE_SERVICE_BASE_URL=${VITE_SERVICE_BASE_URL}

RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
