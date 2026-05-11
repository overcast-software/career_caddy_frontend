# frontend/CLAUDE.md

Frontend-specific guidance for Claude Code when working in `frontend/`.

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
