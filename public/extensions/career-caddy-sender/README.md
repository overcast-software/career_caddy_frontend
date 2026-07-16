# Career Caddy Sender — v1.8.0

A browser extension that captures the active page's URL + visible text and
POSTs it directly to your Career Caddy instance. The popup shows a one-time
**Connect** screen for first-run auth, after which clicking the toolbar icon
fires the page off and an OS-level system notification announces the result.

## Store release notes (resubmission — since published 1.1.x)

The published listings are far behind the code: **Chrome Web Store 1.1.0**,
**Firefox AMO 1.1.1**. This resubmission (**1.8.0**) catches both up. Paste-ready
"What's new" copy — highlights since 1.1.x:

- **Faster, cleaner capture.** Cross-platform dedup hints (apply URL, canonical
  link, referrer) plus a direct-POST fast path on known-good domains, so the
  post lands on the clean canonical link with less server work (1.2.0–1.4.0).
- **Track applications from the popup.** Mark a tracked JobPost as applied
  without leaving the page (1.7.0).
- **Quick-copy profile fields** for pasting into application forms (1.7.4).
- **Answer the selected text** — highlight a screening question on any page and
  generate/save an Answer straight from the popup (1.7.5).
- Opaque-id (NanoID) hardening and assorted fixes (1.7.1–1.7.6).

> ⚠️ **Permission re-consent on update.** The published 1.1.x only requested
> `notifications`; this build adds `activeTab`, `scripting`, `storage`, and
> `alarms` (all justified in `store-assets/cws-justifications.txt`). Existing
> users will see a permission prompt on update and the add-on may sit disabled
> until they re-accept. Expected given the feature growth — call it out in the
> store "What's new" copy so it isn't a surprise.

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

- **1.8.1** — Apex repoint (CC-6). `api.careercaddy.online` was retired in the
  2026-07-14 domain swap; production now serves `/api/*` same-origin off the
  apex. The extension's API `ORIGIN` moves to `https://careercaddy.online` and
  `host_permissions` drops the retired `api.` host (the apex already covered
  the palette-read), so it's now a single Career Caddy origin.
- **1.8.0** — Store resubmission. No functional change since 1.7.6; bumps the
  version so the far-behind Chrome (1.1.0) and Firefox (1.1.1) listings can be
  updated to the current build. See "Store release notes" above — this update
  adds permissions vs 1.1.x and will prompt users to re-consent.
- **1.7.6** — NanoID id audit (CC-77). Every resource id is treated as an opaque
  10-char string end-to-end — no `parseInt`/numeric assumptions in POST
  relationship ids or `filter[...]` params. No user-visible change.
- **1.7.5** — Ad-hoc **Answer the selected text**. Select text on any page and
  generate + save a Career Caddy Answer straight from the popup.
- **1.7.4** — **Quick-copy profile fields** card in the popup for fast pasting
  into application forms.
- **1.7.3** — When you're already on a Career Caddy page, the popup shows an
  on-Career-Caddy dialogue instead of the capture form (nothing external to send).
- **1.7.2** — Send the page URL on `extension-direct` scrape payloads (CCEXT #12).
- **1.7.1** — Relabel the staff **Enrich → Sharpen** action; **Re-check** now
  busts the per-host selector cache so a fresh profile is fetched.
- **1.7.0** — **Track an application** directly from a tracked JobPost in the
  popup (mark applied without leaving the page).
- **1.6.0** — Staff **Proposed job-post validator** in the Tools tab: validate
  the per-host extraction selectors against the live DOM before trusting them.
- **1.5.0** — Staff-only **Tools tab** (gated on `/me` `is_staff`): "Sharpen
  profile for this domain" + an extracted `job_data` preview, folding the old
  always-on dev hints into a gated, store-shippable panel.
- **1.4.0** — Server-gated direct-POST fast path. The extension-direct
  fast path is now gated on the api's per-domain **known-good** signal
  rather than purely on client-side presence. The
  `GET /api/v1/scrape-profiles/extension-selectors/?hostname=…` response
  now carries two additive top-level keys (siblings of `data`):
  `known_good` (bool) and `tier` (`"0" | "auto" | "1" | "2" | "3"`). When
  `known_good` is `true`, the api vouches that the domain's ScrapeProfile
  is complete: the popup trusts the curated `job_data_selectors`, and a
  complete extraction (title + company + description) takes the
  `source_mode=extension-direct` + `captured_payload` POST to
  `POST /api/v1/scrapes/` — exactly the 1.3.0 Phase-C fast path. This is
  the behavior meant to land once the ScrapeProfile is complete for the
  invoked domain. When `known_good` is `false`, absent, or the selectors
  fetch fails, the popup falls back to 1.3.0 behavior **unchanged** — the
  client-side presence heuristic still drives a direct-POST when all
  three fields are present, otherwise `POST /api/v1/scrapes/from-text/`.
  `known_good` / `tier` are cached alongside the per-host selectors and
  respect the existing 1h TTL. Defensive against an api that hasn't
  deployed the new keys: a missing `known_good` is treated as `false`, so
  the extension behaves exactly like 1.3.0 until the api ships the
  signal — no regression for any domain.
- **1.3.0** — Extension direct-POST when capture is complete (Phase C of
  the extension-direct plan). When the per-host `job_data_selectors`
  yield BOTH `title` and `company_name` non-empty AND the page body
  text (description) is non-empty, the popup now POSTs a scrape with
  `source_mode=extension-direct` and a `captured_payload` carrying
  title / company / description (+ optional apply_url / location /
  extraction_hints) to `POST /api/v1/scrapes/` (JSON:API). The
  scrape-graph fast path (Phase B) short-circuits the browser tier and
  goes straight to PersistJobPost — zero server-side browser cost on
  the hot path. When the gate fails (any field empty), the popup
  falls through to today's `POST /api/v1/scrapes/from-text/` path,
  unchanged — that's the safety net for hosts whose
  `extension_selectors` haven't been seeded yet. Trust presence,
  iterate — no validator threshold at v1; non-empty is the gate.
  Requires api Phase A (Scrape.source_mode + captured_payload +
  serializer validation) in prod for the new behavior to land
  successfully; before then, gate-pass POSTs will 400 and gate-fail
  POSTs keep working as today.
- **1.2.0** — Cross-platform dedup hints. On send, the popup now also
  extracts three best-effort signals from the active page and forwards
  them to `POST /api/v1/scrapes/from-text/`: (a) `apply_url` — reads
  the per-host apply-button selectors and decodes wrapper URLs (e.g.
  LinkedIn's `safety/go/?url=…` → embedded ATS URL), written directly
  to `JobPost.apply_url`; (b) `canonical_link_hint` — reads the
  per-host canonical-link selectors (LinkedIn's `<meta
  property="og:url">`) so the persisted JP lands on the clean canonical
  link rather than a tracker-laden `location.href`; (c) `referrer_url`
  — universal, filtered through an allowlist (linkedin.com, indeed.com,
  glassdoor.com, ziprecruiter.com) so the symmetric ATS-from-LinkedIn
  flow gets captured too. The api creates referrer stubs for referrer
  URLs that don't yet exist and surfaces a `canonical_redirect` in the
  response so the popup links the user to whichever JP is the canonical
  record (ATS preferred over jobboard). On the tracked screen (existing
  JP), the popup also PATCHes `apply_url` onto the JP when the page
  yields a new one — single-channel storage, no special endpoint.

  Per-host selectors live on `ScrapeProfile.extension_selectors` and
  are fetched lazily from
  `GET /api/v1/scrape-profiles/extension-selectors/?hostname=…` on
  send; the popup caches per-hostname in `chrome.storage` for an hour
  and falls back to baked LinkedIn defaults if the api is unreachable
  or has no profile for the host. Disconnect clears the cache. Adding
  a new host is now a one-row api seed plus (if the host uses a novel
  apply-link wrapper) one entry in the popup's `DECODERS` registry.

  Every extractor is null-safe — a layout shift, DNS hiccup, or
  network failure never blocks a send.
- **1.1.1** — Resend-to-complete UX for incomplete posts. When the active
  page maps to an existing JobPost flagged `complete=false` (cc_auto
  email-stub, user-flagged "Mark incomplete", or CompletenessReviewer
  rejection), the popup now swaps the heading to **Complete this post**,
  shows a tagged banner with the existing post's title + company, and
  relabels the action button to **Resend to complete**. Replaces the
  subtle "Completing existing post: …" status caption that landed in the
  earlier 1.1.0 build (commit d2ea3da) without a version bump — installs
  carrying that pre-bump 1.1.0 should reload to pick up the explicit UX.
  No api or auth changes; same `/scrapes/from-text/` POST, same trust
  ladder behavior.
- **1.1.0** — SSO via SPA session. The popup no longer takes a username
  and password — first run was the only screen using them, and it was a
  second sign-in for users already authenticated to the SPA. Instead the
  popup reads `ember_simple_auth-session` from the active
  careercaddy.online tab's `localStorage`, refreshes the JWT if needed,
  and mints the API key from there. If you're not signed in to the SPA,
  the popup links you to `careercaddy.online/login` — sign in there,
  reopen the popup, you're connected. Minor bump because the connect
  flow visibly changed: no more username/password fields. Same
  `Career Caddy Sender — YYYY-MM-DD` API key naming convention; revoke
  under Settings → API Keys as before.
- **0.3.6** — API calls now target `api.careercaddy.online` directly, bypassing the
  frontend reverse-proxy. Fixes 405 Method Not Allowed on Connect when the frontend
  domain's Caddy config does not forward POST requests to the API.
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

1. Open the popup. First time you see a **Connect** screen. As long as you're
   signed in to Career Caddy in a browser tab, click **Connect** — the extension
   reads your `careercaddy.online` session (no username/password re-entry since
   1.1.0), mints a dedicated revocable API key, and stores only that key. If
   you're not signed in, the popup links you to `careercaddy.online/login`; sign
   in, reopen the popup, and connect.
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
