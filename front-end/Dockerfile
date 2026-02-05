# Multi-stage build for Next.js (React + Tailwind) static export served by Nginx

FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm
ENV PNPM_HOME=/root/.local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# Install deps
COPY package.json pnpm-lock.yaml ./
COPY next.config.mjs postcss.config.mjs tailwind.config.ts tsconfig.json ./
COPY public ./public
COPY app ./app
COPY components ./components
COPY hooks ./hooks
COPY lib ./lib
COPY styles ./styles

# API base urls injected at build time
ARG API_BASE_USERS
ARG API_BASE_INVENTORY
ARG API_BASE_ORDERS
ARG API_BASE_DELIVERIES
ARG API_BASE_CAMPAIGNS
ENV NEXT_PUBLIC_API_BASE_USERS=${API_BASE_USERS}
ENV NEXT_PUBLIC_API_BASE_INVENTORY=${API_BASE_INVENTORY}
ENV NEXT_PUBLIC_API_BASE_ORDERS=${API_BASE_ORDERS}
ENV NEXT_PUBLIC_API_BASE_DELIVERIES=${API_BASE_DELIVERIES}
ENV NEXT_PUBLIC_API_BASE_CAMPAIGNS=${API_BASE_CAMPAIGNS}

RUN pnpm install --frozen-lockfile
RUN pnpm run build && pnpm exec next export -o out

FROM nginx:alpine AS runner
COPY --from=builder /app/out /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost || exit 1
