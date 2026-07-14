# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# API_HOST is baked into the Ember production build via process.env.
# Default is empty → same-origin (SPA emits /api/v1/...; an outer proxy
# routes /api/* to the api container). Override at build time only for
# explicit cross-origin deployments:
#   --build-arg API_HOST=https://api.example.com  # explicit cross-origin
ARG API_HOST=""
ENV API_HOST=$API_HOST
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Env-gated search-indexing block (ROBOTS_NOINDEX). Empty include dir by
# default → no-op (prod stays indexable). The entrypoint script fills it
# only when ROBOTS_NOINDEX=true; runs via nginx's /docker-entrypoint.d hook.
RUN mkdir -p /etc/nginx/robots-noindex.d /etc/nginx/robots-noindex-header.d
COPY docker-entrypoint.d/20-robots-noindex.sh /docker-entrypoint.d/20-robots-noindex.sh
RUN chmod +x /docker-entrypoint.d/20-robots-noindex.sh
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1
