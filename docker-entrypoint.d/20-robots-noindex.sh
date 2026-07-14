#!/bin/sh
# Env-gated search-indexing block for the prod frontend nginx image.
#
# The SAME image serves prod (careercaddy.online) and the GCP dev env
# (careercaddy.dev). Default = no-op so prod stays indexable. Terraform
# sets ROBOTS_NOINDEX=true ONLY on the dev frontend service to keep the
# non-prod env out of search indexes.
#
# nginx can't branch on an env var at request time, so we gate at
# container start: when ROBOTS_NOINDEX=true, write conf snippets into the
# include dirs that nginx.conf already references; otherwise leave them
# empty (no-op). The official nginx entrypoint runs /docker-entrypoint.d/*.sh
# before launching nginx.
#
# Two include dirs, because nginx `add_header` does NOT inherit into a
# location that sets its own add_header:
#   robots-noindex-header.d → the bare X-Robots-Tag line, re-included into
#     each location that overrides add_header + at server level.
#   robots-noindex.d        → the `location = /robots.txt` disallow-all block.
set -e

HEADER_DIR=/etc/nginx/robots-noindex-header.d
LOCATION_DIR=/etc/nginx/robots-noindex.d
HEADER_FILE="$HEADER_DIR/x-robots-tag.conf"
LOCATION_FILE="$LOCATION_DIR/robots-txt.conf"

mkdir -p "$HEADER_DIR" "$LOCATION_DIR"
# Start clean so a container restart with the flag flipped off reverts.
rm -f "$HEADER_FILE" "$LOCATION_FILE"

if [ "$ROBOTS_NOINDEX" = "true" ]; then
    # `always` so the header rides error/redirect responses too.
    cat > "$HEADER_FILE" <<'EOF'
add_header X-Robots-Tag "noindex, nofollow" always;
EOF

    cat > "$LOCATION_FILE" <<'EOF'
# Serve robots.txt directly (don't depend on a static file the SPA build
# may or may not ship). Disallow-all for this non-prod environment.
location = /robots.txt {
    # This location sets its own add_header, so re-include X-Robots-Tag.
    include /etc/nginx/robots-noindex-header.d/*.conf;
    default_type text/plain;
    return 200 "User-agent: *\nDisallow: /\n";
}
EOF
    echo "20-robots-noindex.sh: ROBOTS_NOINDEX=true -> search indexing blocked (X-Robots-Tag + /robots.txt disallow-all)"
else
    echo "20-robots-noindex.sh: ROBOTS_NOINDEX not 'true' -> no-op (environment stays indexable)"
fi
