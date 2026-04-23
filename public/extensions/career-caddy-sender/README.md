# Career Caddy Sender — v0.2.0

A tiny browser extension: click the toolbar button on any job posting page and
the page's URL + visible text land in Career Caddy's `/job-posts/new/paste`
form, ready for review.

## Version history

- **0.2.0** — Popup adds "Auto-submit without review" and "Also score against
  career data" checkboxes. Selections are remembered per browser. Off by
  default; check them to chain paste → submit → score in one click.
- **0.1.0** — Initial release. Grab page, open the paste form, fill via
  postMessage handshake.

## Upgrading

Re-download the zip, then:
- **Firefox**: `about:debugging` → your Temporary Extension → **Remove** → re-load.
- **Chrome**: `chrome://extensions` → find "Career Caddy Sender" → **Remove**,
  unzip the new archive, **Load unpacked** pointing at the new folder.

Same result as the in-app bookmarklet, but it also works on CSP-strict sites
(LinkedIn, Greenhouse, GitHub) where `javascript:` bookmarklets are blocked.

## Install — Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` from the unzipped folder (or the `.zip` itself works).
4. A grey puzzle-piece icon appears in the toolbar. Right-click it → **Pin to
   Toolbar** for easier access.

Note: "temporary" means it's removed on Firefox restart. To persist, we'd need
to sign the extension through addons.mozilla.org. Drop a note in the repo if
that's worth doing.

## Install — Chrome / Chromium / Brave / Edge

1. Unzip the archive.
2. Open `chrome://extensions`.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and select the unzipped folder.
5. Pin the extension from the puzzle-piece menu.

Sideloaded extensions stay installed across restarts, but Chrome will nag about
"developer mode extensions" — click **Keep** on the first prompt.

## Use

1. Visit any job posting (LinkedIn, Greenhouse, company careers page, whatever).
2. Click the Career Caddy Sender icon in the toolbar.
3. Hit **📎 Send to Paste form**.
4. A new tab opens on `/job-posts/new/paste` with the URL and page text
   pre-filled. Review and submit.

## Configure a different origin

Default target is `https://careercaddy.online`. If you run Career Caddy against
localhost or a staging host, open the popup and type the origin into the
**Career Caddy origin** field — it's stored per-browser.

## Uninstall

Remove it from `about:addons` (Firefox) or `chrome://extensions` (Chrome).

## What it does, exactly

- Reads `location.href` and `document.body.innerText` from the active tab.
- Opens `https://<origin>/job-posts/new/paste?ext=1` in a new tab.
- `postMessage`s the `{url, text}` payload to that tab every 200ms until the
  paste form's listener ACKs (or 10s pass). The paste form fills itself; no
  auto-submit — you always review before posting.

No network traffic to anywhere except your Career Caddy origin. No analytics.
Source: `frontend/public/extensions/career-caddy-sender/` in the Career Caddy
repo.
