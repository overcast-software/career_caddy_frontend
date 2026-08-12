# frontend/CLAUDE.md

Guidance for working in `frontend/` — the Ember SPA **and** the
`career-caddy-sender` browser extension. New to the project? Start with the
repo-root [CONTRIBUTING.md](../CONTRIBUTING.md).

## The rules that bite

### Don't break Ember Data reactivity

Calling `.slice()` or `.toArray()` on a relationship returns a plain array and
**kills reactivity** — the template stops updating and it looks like a data
bug, not a rendering one. Iterate the `ManyArray` directly. This has been
diagnosed from scratch more than once.

### Tracked intermediaries on text inputs

Bind inputs to a `@tracked` field, never straight to a model attribute —
direct binding drops characters on fast typing.

```js
@tracked title = '';
// template: value={{this.title}} {{on "input" (fn (mut this.title) …)}}
```

### Plan colour across every theme before writing any of it

Map every background × theme combination _first_. Retrofitting dark mode one
utility at a time produces combinations nobody checked, and the misses only
show up on someone else's screen.

### Other standing rules

- **Tailwind + HyperUI** for styling; Heroicons **outline** for all icons.
- **`ember-animated`**, not `liquid-fire` (removed 2026-04-22). Don't
  reintroduce `liquid-outlet` / `liquid-if`. For list entry animations use the
  existing `stagger-rows` CSS class — no JS needed.
- **Polling belongs in a service**, not a component.
- **No logic in component constructors.**

## Testing

**QUnit does not run locally** — the compose frontend container ships no
browser launcher. The path is:

```
docker compose exec -T frontend npm run lint:format -- --check <files>   # lint in-container
dagger -m ./dagger call test-frontend                                    # the authoritative QUnit run
```

The Dagger image ships headless Firefox, which is why it's the real gate.
**Do not build a host-side headless-browser test rig** to force a local run —
its green isn't the gate, and it's been tried. If the sanctioned path is
blocked, say so and push with the PR marked unverified rather than inventing
a parallel one.

Formatting goes through the repo's own script — `npm run format`, not a
direct `node_modules/.bin/prettier` invocation, which fails on plugin
resolution. Note `lint:format` covers `CLAUDE.md` too.

## The browser extension (`public/extensions/career-caddy-sender/`)

MV3, vanilla JS, no build step. It is **excluded from prettier and eslint and
has no test suite** — so a green frontend CI says _nothing_ about extension
changes. The real gate is:

```
node --check public/extensions/career-caddy-sender/popup.js
node --check public/extensions/career-caddy-sender/background.js
```

…plus loading it unpacked (`chrome://extensions` → Load unpacked, or Firefox
`about:debugging` → Load Temporary Add-on) and clicking through.

Things that will bite you here:

- **The popup is destroyed the moment it loses focus.** Clicking the page —
  the natural next gesture — tears it down and takes any un-persisted state
  with it. Anything the user might want after looking at the page must be
  written to `api.storage.local` **before** it's rendered, with a TTL, and
  restored on open.
- **Writing into a page field needs the native setter.** On React/Vue-backed
  forms (most ATSes) a plain `el.value = x` updates the DOM but not the
  framework's state — it's reverted on re-render or dropped on submit. It
  looks like it worked and didn't. Go through
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`
  then dispatch bubbling `input` **and** `change`. For `contenteditable`,
  `document.execCommand('insertText')` emits the events rich-text editors
  actually listen for.
- **`executeScript` only returns JSON** — a DOM node can't cross back to the
  popup. Do the work in-page and return a handle (this codebase stamps a
  `data-cc-field` attribute), then target the same `frameId` on the way back
  so iframe-embedded forms still resolve.
- **Recognise controls you can't fill; don't skip them.** Excluding
  `select`/radio/combobox from a scan doesn't make the code avoid them — it
  makes the code walk _past_ them onto an unrelated text input and fill that
  instead. Classify and report, don't filter.
- **Permissions are deliberately minimal**: `activeTab` + `scripting`, with
  one host permission for the instance origin. `activeTab` grants access only
  when the user invokes the action, which is why no broad host permission is
  needed. Adding one triggers re-consent on update — treat it as a real
  decision, not an implementation detail.
- **Packaging**: runtime files only, `manifest.json` at the zip root, named
  `career-caddy-sender-<version>.zip` in `public/extensions/` (gitignored).
  Exclude `README.md`, `store-assets/`, `.claude/`.

### RETIRED for agents — do not use

`frontend/notes.org` and the parent `todo.org` are Doug's personal
emacs surface: no `Read`, no writes, no commits. The `claude/cf-*` /
`cc-todo-*` emacsclient helpers no longer exist — `~/.config/doom/elisp/`
was deleted 2026-08-04, so calling one returns a void-function error.
Do not reintroduce them into a boot sequence.

## Stack

- Ember.js 6.x with Ember Data (JSON:API)
- Tailwind CSS (compiled on first start — slow initial load is normal)
- `ember-cli-flash` for flash messages
- Heroicons outline style for all icons
- `ember-animated` for route/tab transitions. We no longer use
  `liquid-fire` (removed 2026-04-22) — avoid reaching for it, and
  don't re-introduce `liquid-outlet`, `liquid-if`, or `transitions.js`.
  For list entry animations, add the existing `stagger-rows` CSS class
  to the container (defined in `app/styles/app.css`), which handles
  per-row fade-up via `nth-child` delays without any JS.

## Route + Template Pattern

Every route template wraps content in `<RouteLayout>`:

```hbs
{{page-title "Page Title"}}
<RouteLayout @flashMessages={{this.flashMessages}}>
  <:subnav>
    {{! page-level nav links, use class="nav-link" }}
  </:subnav>
  <:main>
    {{! page body, renders inside .fairway div }}
  </:main>
</RouteLayout>
```

- Pass `@flashMessages={{this.flashMessages}}` from any route that needs flash messages
- Static or docs routes can omit `@flashMessages`
- `{{outlet}}` can be placed inside `<:main>` for parent routes with nested children

## Sidebar

`frontend/app/components/sidebar.hbs` — all nav links live here.

- Icons: Heroicons outline SVG, `class="size-5 shrink-0"`, `stroke-width="1.5"`, no fill
- All links call `{{on "click" @onClose}}` to close the mobile drawer
- No auth conditional in the sidebar itself — auth is handled at the route level

## Auth Guard

`frontend/app/routes/application.js` `beforeModel` handles all auth logic.

**Public routes** (no login required): `setup`, `login`, `about`, `docs.*`

To add a new public route, expand the `isPublic` check at line 18:

```js
const isPublic =
  routeName === "setup" ||
  routeName === "login" ||
  routeName === "about" ||
  (routeName && routeName.startsWith("docs"));
// add new public routes here
```

## Tracked Inputs

Use `@tracked` intermediary values on text inputs to prevent lost characters on fast typing.
Do **not** bind inputs directly to model attributes.

```js
// correct
@tracked title = '';
// then in template: value={{this.title}} {{on "input" (fn (mut this.title) event.target.value)}}

// wrong — causes lost characters
// value={{@model.title}}
```

## Adding a New Route

1. Add to `frontend/app/router.js`
2. Create `frontend/app/routes/my-route.js` (can be an empty class)
3. Create `frontend/app/templates/my-route.hbs` using `<RouteLayout>` pattern
4. Add a `<LinkTo>` in `frontend/app/components/sidebar.hbs` with a matching Heroicon

## Models (Ember Data)

All models live in `frontend/app/models/`. They communicate via JSON:API.

The application adapter (in `frontend/app/adapters/application.js`) injects JWT auth
headers and handles `401 → token refresh → retry` automatically.

### Four canonical patterns for non-CRUD API access

Every HTTP call from the frontend should fall into one of these four
buckets. Drop into raw `fetch()` only for file download/upload or
pre-auth flows — and leave a `KEEP raw fetch: <why>` comment when
you do.

1. **Verbs on a resource** — `POST /resources/:id/<verb>/`.
   Use [`apiAction(this, { method, path, data })`][api-action] from a
   model method. Auto-pushes JSON:API responses, so the resolved
   value is the live store-backed record.
   Examples: `JobPost#resolveAndDedupe`, `JobPost#nuclearDelete`,
   `JobPost#submitTriage`, `JobPost#reextract`, `Scrape#parse`,
   `Scrape#redo`, `Resume#reorderExperiences`,
   `Experience#reorderDescriptions`.

2. **Collection verbs** — `POST /resources/<verb>/` (no `:id`).
   Use [`collectionAction(store, modelName, { method, path, data })`][api-action]
   from a model **static** method. Same auto-push semantics.
   Example: `Scrape.fromText`.

3. **Sub-collection reads** — `GET /parents/:id/<children>/`.
   Custom adapter with `urlForQuery`; route uses `store.query`.
   The api endpoint must return JSON:API resource objects (a
   compound document with `included` for related resources is the
   norm). Read `result.meta` directly off the query result for any
   denormalized metadata.
   Examples: `app/adapters/job-post-duplicate-candidate.js`,
   `app/adapters/scrape-status.js` (graph-trace),
   `app/adapters/screenshot.js`.

4. **Reports / non-resource GETs** — denormalized aggregates that
   don't fit an Ember Data model class.
   Use [`reportFetch(api, path, params)`][report-fetch]. Returns a
   uniform `{ data, meta, error }` envelope where `error` is
   `null | 'forbidden' | 'failed'` (403 distinguished).
   Examples: routes under `app/routes/reports/`, `app/routes/admin/`,
   `app/routes/settings/ai-spend.js`.

### Patterns that intentionally stay on raw fetch

- **File download / multipart upload** — binary blob responses or
  `FormData` bodies don't fit JSON:API or Ember Data. Use
  [`downloadResource({adapter, session, modelName, id, path, filename})`][download]
  for downloads with the docx-blob / S3-`{url}` dual-shape pattern;
  use raw fetch for everything else with a `KEEP raw fetch:` note.
  Examples: `app/controllers/settings/data.js` (xlsx export/import),
  per-file screenshot binary in `app/components/scrapes/item.js`.
- **Pre-auth flows** — login, signup, forgot-password, accept-invite,
  waitlist, guest-session. Raw fetch — the application adapter would
  short-circuit unauthenticated requests through the docs route.

[api-action]: app/utils/api-action.js
[report-fetch]: app/utils/report-fetch.js
[download]: app/utils/download.js

## Docs Routes

The `/docs` route tree (`docs`, `docs.career-data`, `docs.job-posts`, etc.) contains
static in-app documentation. These routes have no model hooks and are publicly accessible
without login. Do not add API calls or model lookups to docs routes.
