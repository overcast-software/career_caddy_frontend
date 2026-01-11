# Stage 1: Build
FROM node:20-bullseye-slim AS node
FROM python:3.11-slim AS app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node /usr/local /usr/local

# Enable pnpm via Corepack as root
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create non-root user and set ownership for app directory
RUN useradd -m appuser && mkdir -p /app && chown -R appuser:appuser /app
USER appuser

# Clone frontend repository and install dependencies
ARG FRONTEND_REPO=https://github.com/overcast-software/career_caddy_frontend
ARG FRONTEND_REF=main
RUN git clone --depth 1 --branch "$FRONTEND_REF" "$FRONTEND_REPO" /app/frontend
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile=false

# Clone backend repository
ARG BACKEND_REPO=https://github.com/overcast-software/career_caddy_api
ARG BACKEND_REF=main
WORKDIR /app
RUN git clone --depth 1 --branch "$BACKEND_REF" "$BACKEND_REPO" /app/backend
WORKDIR /app/backend
RUN python -m pip install --upgrade pip wheel && if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

# Set unified env for both services
ENV DEBUG=True \
    NODE_ENV=development \
    EMBER_ENV=development \
    CHOKIDAR_USEPOLLING=true \
    WATCHPACK_POLLING=true

EXPOSE 4200 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1:4200/ >/dev/null && (curl -fsS http://127.0.0.1:8000/api/v1/healthcheck >/dev/null || curl -fsS http://127.0.0.1:8000/ >/dev/null || curl -fsS http://127.0.0.1:8000/api/ >/dev/null) || exit 1

WORKDIR /app
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
