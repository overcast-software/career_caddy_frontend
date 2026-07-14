#!/bin/sh
# Env-gated same-origin reverse proxy for the prod frontend nginx image.
#
# The SAME image serves prod (careercaddy.online, behind omarchy/Caddy) and
# the GCP dev env (careercaddy.dev, Cloud Run, NO outer proxy). Default =
# no-op (SPA-only, no proxy) so the omarchy/prod path is unchanged: there,
# Caddy peels /api|/mcp off in front of nginx before the request ever
# reaches this container.
#
# On GCP there is no outer proxy, so nginx itself must path-split the single
# public host into the api/events/mcp Cloud Run services (same-origin, no
# CORS). nginx can't branch on an env var at request time, so we gate at
# container start: when API_UPSTREAM is set, write the proxy `location`
# blocks into the include dir nginx.conf already references; otherwise leave
# it empty (no-op). The official nginx entrypoint runs
# /docker-entrypoint.d/*.sh before launching nginx.
#
# Env vars (full https URLs of the Cloud Run services, e.g.
#   https://api-z5a55nqjfa-uc.a.run.app):
#   API_UPSTREAM    -> location /api/          (JSON:API)
#   EVENTS_UPSTREAM -> location /api/v1/events (SSE stream)
#   MCP_UPSTREAM    -> location /mcp/          (MCP server)
#
# API_UPSTREAM is the master switch. When it's empty/unset the whole proxy
# stays off (omarchy/prod-behind-Caddy path). EVENTS_UPSTREAM / MCP_UPSTREAM
# fall back to API_UPSTREAM's host if unset, so a single-service test still
# routes somewhere sane.
set -e

PROXY_DIR=/etc/nginx/api-proxy.d
PROXY_FILE="$PROXY_DIR/proxy.conf"

mkdir -p "$PROXY_DIR"
# Start clean so a restart with the vars cleared reverts to SPA-only.
rm -f "$PROXY_FILE"

if [ -z "$API_UPSTREAM" ]; then
    echo "10-api-proxy.sh: API_UPSTREAM unset -> no-op (SPA-only, no proxy; omarchy/Caddy path)"
    exit 0
fi

# Fall back to API_UPSTREAM for the other two if they weren't provided.
: "${EVENTS_UPSTREAM:=$API_UPSTREAM}"
: "${MCP_UPSTREAM:=$API_UPSTREAM}"

# Derive the bare Host (authority) from each upstream URL: strip the scheme
# and anything from the first '/' onward. Cloud Run routes by Host, so the
# Host header MUST be the upstream service's own run.app host (NOT the public
# careercaddy.dev host, which only the frontend service is mapped to). Django
# ALLOWED_HOSTS already contains the .run.app wildcard, so it accepts this.
host_of() {
    # shellcheck disable=SC2001
    echo "$1" | sed -e 's~^[a-zA-Z][a-zA-Z0-9+.-]*://~~' -e 's~/.*$~~'
}
API_HOST=$(host_of "$API_UPSTREAM")
EVENTS_HOST=$(host_of "$EVENTS_UPSTREAM")
MCP_HOST=$(host_of "$MCP_UPSTREAM")

# Strip any trailing slash from upstream URLs so proxy_pass concatenation is
# predictable (we pass the full request URI through, so proxy_pass must NOT
# carry a URI part -> no trailing '/').
API_UPSTREAM=${API_UPSTREAM%/}
EVENTS_UPSTREAM=${EVENTS_UPSTREAM%/}
MCP_UPSTREAM=${MCP_UPSTREAM%/}

cat > "$PROXY_FILE" <<EOF
# Same-origin reverse proxy (emitted by docker-entrypoint.d/10-api-proxy.sh
# because API_UPSTREAM is set). Most specific prefix first. Upstreams are
# HTTPS Cloud Run services; Host is rewritten to each service's own run.app
# host so Cloud Run can route (only the frontend is mapped to the public
# host). X-Forwarded-* preserved so Django builds correct absolute URLs.

# SSE event stream -- must come before the generic /api/ block. Buffering off
# + HTTP/1.1 + long read timeout so the stream is passed through live.
location /api/v1/events {
    proxy_pass ${EVENTS_UPSTREAM};
    proxy_ssl_server_name on;
    proxy_set_header Host ${EVENTS_HOST};
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP \$remote_addr;
}

# JSON:API
location /api/ {
    proxy_pass ${API_UPSTREAM};
    proxy_ssl_server_name on;
    proxy_set_header Host ${API_HOST};
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP \$remote_addr;
}

# MCP server
location /mcp/ {
    proxy_pass ${MCP_UPSTREAM};
    proxy_ssl_server_name on;
    proxy_set_header Host ${MCP_HOST};
    proxy_http_version 1.1;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP \$remote_addr;
}
EOF

echo "10-api-proxy.sh: API_UPSTREAM set -> reverse proxy enabled"
echo "  /api/v1/events -> ${EVENTS_UPSTREAM} (Host ${EVENTS_HOST})"
echo "  /api/          -> ${API_UPSTREAM} (Host ${API_HOST})"
echo "  /mcp/          -> ${MCP_UPSTREAM} (Host ${MCP_HOST})"
