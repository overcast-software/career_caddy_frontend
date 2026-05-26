# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# API_HOST is baked into the Ember production build via process.env.
# Default points at prod so existing builds (no --build-arg) keep their
# current behavior. Override at build time for dev environments served
# from a different origin or routed same-origin behind a proxy:
#   --build-arg API_HOST=""                       # same-origin (no CORS)
#   --build-arg API_HOST=https://api.example.com  # explicit cross-origin
ARG API_HOST=https://api.careercaddy.online
ENV API_HOST=$API_HOST
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1
