# Extensions

The Career Caddy frontend exposes three neutral extension points so
downstream authors can add routes, nav entries, and public pages without
forking. These hooks are the canonical way to ship a theme pack, an
integration, or a branding layer on top of the app.

## 1. Engine mount point

`app/router.js` conditionally mounts an Ember engine named
`@careercaddy/site-chrome` if it is installed as a dependency. The check
uses `@embroider/macros`' `dependencySatisfies`, which is a **build-time**
conditional — when the engine package is not in `node_modules`, the mount
call is compiled out entirely and the host bundle has no reference to it.

To contribute routes:

1. Author your engine as a standard routable Ember engine (see the
   [ember-engines docs](https://ember-engines.com/)).
2. Publish it (or point to it via git) as `@careercaddy/site-chrome`.
3. In your deployment, add it as a devDependency before building:

   ```sh
   npm pkg set "devDependencies.@careercaddy/site-chrome"="git+ssh://<your repo>#main"
   npm install
   npm run build
   ```

The engine is mounted at path `/`, so its routes claim top-level URLs
(`/welcome`, `/credits`, etc). It is the engine author's responsibility to
avoid route-name collisions with the host's existing routes.

If you need multiple engines or a different mount name, fork this hook in
your deployment.

## 2. `extensions` service — nav entries

`app/services/extensions.js` exposes a `register(entries)` method. Each
entry is `{ route, label, icon?, position, authOnly? }`:

- `route`: Ember route name (`site-chrome.welcome`, for an engine-mounted
  route).
- `label`: visible text.
- `icon` _(optional)_: raw SVG string. If omitted, a generic arrow icon is
  used for sidebar entries; footer entries render without an icon.
- `position`: `'sidebar'` | `'footer'`.
- `authOnly` _(optional, default `false`)_: hide the entry when the user
  is a guest.

Register from an instance-initializer:

```js
// site-chrome/app/instance-initializers/site-chrome.js
export function initialize(appInstance) {
  const ext = appInstance.lookup("service:extensions");
  ext.register([
    { route: "site-chrome.welcome", label: "Welcome", position: "footer" },
    {
      route: "site-chrome.metrics",
      label: "Metrics",
      position: "sidebar",
      authOnly: true,
    },
  ]);
}

export default { initialize };
```

## 3. `public-routes` service — auth bypass

`app/services/public-routes.js` holds the allowlist of routes that skip
the auth guard in `app/routes/application.js`. An engine that adds
public-facing pages must register them:

```js
const pub = appInstance.lookup("service:public-routes");
pub.prefixes.add("site-chrome.welcome");
pub.prefixes.add("site-chrome.credits");
// routes kept out of the set stay auth-gated
```

`prefixes` uses startsWith matching on the dotted route name, so adding
`site-chrome.welcome` also allows `site-chrome.welcome.child`. `exact` is
a `Set<string>` for exact matches.

## Minimal example engine

```
my-engine/
├── package.json              # "keywords": ["ember-addon", "ember-engine"]
├── addon/
│   ├── engine.js             # Engine, dependencies: services: ['store', 'session', 'router', 'extensions', 'public-routes']
│   ├── routes-map.js         # this.route('welcome')
│   ├── routes/welcome.js
│   └── templates/welcome.hbs
└── app/
    └── instance-initializers/
        └── my-engine.js      # registers nav + public routes with host services
```

Declare `lazyLoading: { enabled: true }` in the addon's `index.js` to get
a separate bundle downloaded on demand.

## What the host does not expose

- No component override registry. Theme/branding changes currently require
  patching components in a fork or a build-time overlay. If this becomes
  a common need, a registry can be added here.
- No public API for modifying existing routes. Engines add new routes;
  host routes are not replaceable.
