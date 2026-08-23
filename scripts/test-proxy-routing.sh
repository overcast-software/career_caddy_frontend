#!/usr/bin/env bash
#
# Routing regression test for docker-entrypoint.d/10-api-proxy.sh.
#
#   npm run verify:proxy-routing
#   ./scripts/test-proxy-routing.sh [path/to/alternate/10-api-proxy.sh]
#
# WHY THIS EXISTS
#
# The same-origin proxy splits one public host across three Cloud Run
# services. Getting a `location` wrong there does not fail loudly: nginx
# still serves, the SPA still loads, and only one endpoint quietly goes to
# the wrong upstream.
#
# That happened. `location /api/v1/events` was a PREFIX match, so it also
# captured /api/v1/events/token/ and sent it to the events service, whose
# Starlette app (api/job_hunting/sse_asgi.py) routes only the stream itself.
# Every token mint 404'd, SSE was dead in production for weeks with nobody
# noticing (services/pollable.js silently covers for it), and the client's
# reconnect loop turned the 404 into roughly 70% of all production traffic
# and a budget alert.
#
# `nginx -t` cannot catch this: the broken config is perfectly valid. Only
# an actual request proves which upstream a path reaches. So this test
# stands up the real image config against stub upstreams that echo their own
# identity, and asserts the path→upstream mapping.
#
# NOT wired into `npm test` on purpose: that runs inside the Dagger CI
# container, which has no Docker daemon. Run it locally when touching the
# proxy config. To prove the test still has teeth, point it at an older
# revision of the entrypoint and watch the token checks fail:
#
#   git show <rev>:docker-entrypoint.d/10-api-proxy.sh > /tmp/old.sh
#   ./scripts/test-proxy-routing.sh /tmp/old.sh
#
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE="$(dirname "$HERE")"
ENTRY_SRC="${1:-$FE/docker-entrypoint.d/10-api-proxy.sh}"

NET=ccproxytest
W=

cleanup() {
  docker rm -f ccproxystub ccproxyfront >/dev/null 2>&1
  docker network rm "$NET" >/dev/null 2>&1
  [ -n "$W" ] && rm -rf "$W"
}
trap cleanup EXIT

if ! docker info >/dev/null 2>&1; then
  echo "docker is not available - cannot run the proxy routing test" >&2
  exit 2
fi

# Clear any leftovers from an interrupted run BEFORE allocating the workdir,
# so the pre-run sweep cannot delete the directory this run depends on.
cleanup
W="$(mktemp -d)"

echo "entrypoint under test: $ENTRY_SRC"
echo

# Stub upstream: echoes the upstream host it was addressed as, plus the URI
# it received. One container answers for all three aliases, so the Host
# header the proxy sets is what distinguishes them - exactly the mechanism
# Cloud Run uses to route.
cat > "$W/stub.conf" <<'STUB'
server {
    listen 80;
    server_name _;
    location / {
        add_header Content-Type text/plain;
        return 200 "UPSTREAM=$host URI=$request_uri\n";
    }
}
STUB

mkdir -p "$W/entry"
cp "$ENTRY_SRC" "$W/entry/10-api-proxy.sh"
chmod +x "$W/entry/10-api-proxy.sh"

docker network create "$NET" >/dev/null || exit 1

docker run -d --name ccproxystub --network "$NET" \
  --network-alias api.local \
  --network-alias events.local \
  --network-alias mcp.local \
  -v "$W/stub.conf:/etc/nginx/conf.d/default.conf:ro" \
  nginx:alpine >/dev/null || exit 1

docker run -d --name ccproxyfront --network "$NET" \
  -e API_UPSTREAM=http://api.local \
  -e EVENTS_UPSTREAM=http://events.local \
  -e MCP_UPSTREAM=http://mcp.local \
  -v "$FE/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$W/entry/10-api-proxy.sh:/docker-entrypoint.d/10-api-proxy.sh:ro" \
  nginx:alpine >/dev/null || exit 1

# Give the official entrypoint time to run the hook and start nginx.
for _ in $(seq 1 20); do
  docker exec ccproxyfront test -f /etc/nginx/api-proxy.d/proxy.conf 2>/dev/null && break
  sleep 1
done
sleep 1

echo "===== nginx -t ====="
docker exec ccproxyfront nginx -t 2>&1 || exit 1
echo

fail=0

# The heredoc that emits proxy.conf is UNQUOTED (it must expand the upstream
# vars), so a backtick or bare $ anywhere inside it -- including in a comment
# -- is executed by the shell. The text silently disappears from the emitted
# config and the container logs "line NN: <word>: not found" on every start.
# Caught in review once already; assert on it rather than trusting eyes.
echo "===== entrypoint emitted no shell errors ====="
if docker logs ccproxyfront 2>&1 | grep -q "not found"; then
  echo "FAIL  the entrypoint produced command-not-found errors:"
  docker logs ccproxyfront 2>&1 | grep "not found" | sed 's/^/        /'
  echo "      -> almost certainly a backtick or bare \$ inside the heredoc."
  fail=1
else
  echo "PASS  no command substitution leaked out of the heredoc"
fi
echo

check() {
  local method="$1" path="$2" expect="$3" label="$4" got
  got=$(docker run --rm --network "$NET" curlimages/curl:latest \
        -s -X "$method" "http://ccproxyfront${path}")
  if echo "$got" | grep -q "UPSTREAM=${expect}"; then
    printf 'PASS  %s\n' "$label"
  else
    printf 'FAIL  %s\n        %-28s expected UPSTREAM=%s\n        got: %s\n' \
      "$label" "$path" "$expect" "$got"
    fail=1
  fi
}

echo "===== path -> upstream ====="
# The regression. Both slash forms must reach Django, never the events app.
check POST /api/v1/events/token/ api.local    "token mint -> api      (the 2026-08 regression)"
check POST /api/v1/events/token  api.local    "token mint -> api, no trailing slash"
# The stream itself, both slash forms, must reach the events service.
check GET  /api/v1/events/       events.local "SSE stream -> events"
check GET  /api/v1/events        events.local "SSE stream -> events, no trailing slash"
# Nothing else may be dragged onto the events service by a loose prefix.
check GET  /api/v1/job-posts/    api.local    "ordinary api path -> api"
check GET  /api/v1/events-other/ api.local    "events-lookalike path -> api"
check GET  /mcp                  mcp.local    "mcp -> mcp"

echo
if [ "$fail" -eq 0 ]; then
  echo "ALL ROUTING CHECKS PASSED"
else
  echo "ROUTING CHECKS FAILED"
fi
exit "$fail"
