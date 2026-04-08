# frontend/CLAUDE.md

Frontend-specific guidance for Claude Code when working in `frontend/`.

## Stack

- Ember.js 6.x with Ember Data (JSON:API)
- Tailwind CSS (compiled on first start — slow initial load is normal)
- `ember-cli-flash` for flash messages
- Heroicons outline style for all icons

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

All 21 models live in `frontend/app/models/`. They communicate via JSON:API.

The application adapter (in `frontend/app/adapters/application.js`) injects JWT auth
headers and handles `401 → token refresh → retry` automatically.

## Docs Routes

The `/docs` route tree (`docs`, `docs.career-data`, `docs.job-posts`, etc.) contains
static in-app documentation. These routes have no model hooks and are publicly accessible
without login. Do not add API calls or model lookups to docs routes.
