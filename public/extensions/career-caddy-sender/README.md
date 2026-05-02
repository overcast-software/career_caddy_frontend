# Career Caddy Sender — v0.3.5

A browser extension that captures the active page's URL + visible text and
POSTs it directly to your Career Caddy instance. The popup shows a one-time
**Connect** screen for first-run auth, after which clicking the toolbar icon
fires the page off and an OS-level system notification announces the result.

## What changed in 0.3.0

- **Direct POST, no new tab.** The extension now hits
  `POST /api/v1/scrapes/from-text/` itself instead of opening
  `/job-posts/new/paste` and delivering text via `window.postMessage`. The
  popup closes ~1.5s after the POST.
- **Per-extension API key with one-click revoke.** First connect prompts for
  email + password, calls `/api/v1/token/` once to get a short-lived JWT, then
  uses that JWT to create a named `jh_*` API key
  (`Career Caddy Sender — YYYY-MM-DD`) via `/api/v1/api-keys/`. Only the
  resulting API key is persisted — your password is discarded immediately.
  **Disconnect** revokes the key server-side via
  `/api/v1/api-keys/{id}/revoke/` and clears local storage. Designed to be
  safe on shared computers.
- **OS notifications on completion.** A background service worker polls the
  scrape via `chrome.alarms` and fires a system toast on terminal status
  (added / could-not-parse / already-in-library / still-processing).
- **Manifest V3 background service worker.** New `background.js`. Required
  permissions added: `notifications`, `alarms`, `storage`. The `tabs`
  permission is no longer required — `activeTab` covers everything.

## Version history

- **0.3.5** — Press Enter in the username or password field to connect.
- **0.3.4** — Re-import theme from the active Career Caddy tab on every
  popup open (was: only on Connect). Fixes existing installs that were
  upgraded after their first connect — the popup now picks up the app's
  theme without needing to disconnect/reconnect.
- **0.3.3** — Visual refresh: dark-mode aware popup, palette-aware accent
  color (indigo / jade / rose / amber / violet / blue), theme toggle in the
  footer, and best-effort theme import from the active Career Caddy tab on
  Connect so the popup matches the app on first open.
- **0.3.2** — Refuse to send Career Caddy's own pages, `localhost`/private
  hosts, and non-`http(s)` URLs. Fast-fails in the popup before any POST;
  the API enforces the same policy authoritatively.
- **0.3.1** — Hardcoded origin (`https://careercaddy.online`); removed the
  per-install configurable origin input. Pre-flight cleanup before store
  submission.
- **0.3.0** — Direct API POST, in-popup login, named API key, disconnect
  revokes server-side, system notifications via background service worker.
- **0.2.6** — Tighter retry rhythm (100ms × 150 = 15s) and early-stop on
  ACK from the app-route listener.
- **0.2.5** — Default origin flipped back to `https://careercaddy.online`.
- **0.2.4** — Default origin flipped to `http://localhost:4200` (dev).
- **0.2.3** — Auto-submit + Also-score default to ON on fresh install.
- **0.2.2** — Popup shows installed version in the top-right.
- **0.2.1** — Origin field saves on every keystroke.
- **0.2.0** — Auto-submit + chained scoring checkboxes.
- **0.1.0** — Initial release. Page → paste form via `postMessage`.

## Install — Firefox

### Temporary (regular Firefox)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select `manifest.json` from the unzipped folder (or the `.zip` itself).
4. Pin the toolbar icon for easy access.

Removed on Firefox restart.

### Persistent via `.xpi` (Developer Edition / Nightly / ESR)

1. `about:config` → `xpinstall.signatures.required` → `false`.
2. Drag the `.xpi` onto a Firefox window (or `about:addons` → gear →
   **Install Add-on From File**).
3. Confirm the install prompt.

## Install — Chrome / Chromium / Brave / Edge

1. Unzip the archive.
2. `chrome://extensions` → toggle **Developer mode**.
3. **Load unpacked** → select the unzipped folder.
4. Pin the extension from the puzzle-piece menu.

## Use

1. Open the popup. First time you see a **Connect** screen — enter your
   Career Caddy username and password. Click **Connect**. The extension
   authenticates against `https://careercaddy.online`, mints a dedicated
   API key, and immediately discards the password.
2. After connecting, the popup shows a **Send this page** button and the
   email you connected as.
3. Visit any job posting and click the toolbar icon → **Send this page**.
4. Popup closes. A system notification fires when the scrape completes
   (typically within ~30s, longer for sites that need the hold-poller).

## Disconnect

Click **Disconnect** in the popup. The extension calls
`POST /api/v1/api-keys/{id}/revoke/` to kill the key server-side, then wipes
local storage. The next time you open the popup you'll see the Connect
screen again.

## What it does, exactly

- Reads `location.href` and `document.body.innerText` from the active tab via
  `scripting.executeScript` (requires `activeTab`).
- POSTs `{text, link}` to `${origin}/api/v1/scrapes/from-text/` with
  `Authorization: Bearer ${apiKey}`.
- Hands the returned scrape id to the background service worker, which polls
  `${origin}/api/v1/scrapes/${id}/` until the status is terminal.
- Fires a single OS notification on completion.

No traffic to anywhere except your Career Caddy origin. No analytics.
Source: `frontend/public/extensions/career-caddy-sender/` in the Career Caddy
repo.

## Known caveats

- Chrome MV3 alarms below 1 minute are clamped to 1 minute for non-foreground
  extensions. Notifications may arrive 1–2 minutes after completion in
  Chrome; Firefox honors the configured 30s cadence.
- The "Also score against career data" toggle changes the notification
  semantics. With the toggle **off**, the OS notification fires when the
  scrape lands the JobPost ("Added ✓ — Title"). With the toggle **on**,
  the JobPost-creation notification is suppressed in favor of the score
  result ("Scored 87 ✓ — Title") which arrives ~10–30s later. If the
  score POST fails (e.g. no career data set up), the worker falls back
  to the plain "Added ✓" notification so you still get told something.
  The score itself uses the user's full career data (favorited resumes,
  cover letters, answers) — no resume picker needed.
- If your CC password changes, the API key still works — the key is
  independent of session credentials, by design. Revoke it from
  **Settings → API Keys** (or **Disconnect** from the popup) if you want to
  invalidate.
