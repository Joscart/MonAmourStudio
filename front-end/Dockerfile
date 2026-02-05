# Multi-stage build for Next.js (App Router) served by Next standalone server

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
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Carry over public assets and standalone server
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Re-expose runtime env (also baked at build time)
ENV NEXT_PUBLIC_API_BASE_USERS=${API_BASE_USERS}
ENV NEXT_PUBLIC_API_BASE_INVENTORY=${API_BASE_INVENTORY}
ENV NEXT_PUBLIC_API_BASE_ORDERS=${API_BASE_ORDERS}
ENV NEXT_PUBLIC_API_BASE_DELIVERIES=${API_BASE_DELIVERIES}
ENV NEXT_PUBLIC_API_BASE_CAMPAIGNS=${API_BASE_CAMPAIGNS}

EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000 || exit 1
CMD ["node", "server.js"]
