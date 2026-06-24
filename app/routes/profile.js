import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Public `/<username>` profile page (CC #51) — the human-readable twin of a
// user's ActivityPub actor outbox. Renders a profile header + an infinite feed
// of that user's PUBLISHED (audience-public) job posts.
//
// Registered public in app/services/public-routes.js (so the auth guard in
// app/routes/application.js lets a logged-out visitor in) and whitelisted in
// app/adapters/application.js (so the two AllowAny reads below go out
// unauthenticated). One model hook, two idiomatic Ember Data reads against the
// REAL models — no shadow `public-job-post` model:
//
//   • queryRecord('user', { username })         → GET /users/:username/
//   • query('job-post', { username, page })     → GET /users/:username/job-posts/federated/
//
// The per-model adapters (app/adapters/user.js, app/adapters/job-post.js) map
// the `username` param onto those URLs. The first page seeds the controller,
// which then advances the keyset cursor (firstPage.meta.next_cursor) on scroll
// (see app/controllers/profile.js).
export default class ProfileRoute extends Route {
  @service store;

  model({ username }) {
    // Normalize the raw `/:username` param so the Mastodon-style /@dough
    // resolves identically to the canonical /dough (CC #67 / BACK #94). The
    // router captures '@dough' verbatim; passed through untouched it would GET
    // /users/%40dough/ → api 404 → not-found state, and the template's
    // `@{{this.username}}` would render the doubled '@@dough'. Stripping here
    // (and threading the cleaned handle into the returned model.username) fixes
    // both the lookup and the rendered handle.
    const handle = this.normalizeUsername(username);

    // .then/.catch (not async/await + try/catch) per project convention. The
    // resolution is one-shot and fully degrading: an unknown username (404 on
    // the user lookup) yields a null user → the template's not-found state; a
    // user that loads but whose feed errors yields an empty feed → the empty
    // state. Never a login bounce (the route is public) and never a render loop.
    return this.store
      .queryRecord('user', { username: handle })
      .then((user) =>
        this.store
          .query('job-post', { username: handle, page: { size: 20 } })
          .then((firstPage) => ({ username: handle, user, firstPage }))
          .catch(() => ({ username: handle, user, firstPage: [] })),
      )
      .catch(() => ({ username: handle, user: null, firstPage: [] }));
  }

  // Strip the Mastodon-style decorations off a /:username route param so the
  // federation-handle URLs all resolve to the same local profile:
  //   /@dough                     → dough   (leading '@')
  //   /@dough@careercaddy.online  → dough   (full handle — only when the host
  //                                           part is OUR instance)
  // A remote handle like /@alice@mastodon.social keeps its host part and so
  // (correctly) falls through to the not-found state rather than masquerading
  // as the local user 'alice'. The instance host is read from
  // window.location.host — never baked into the bundle — matching the
  // federation host idiom in app/components/companies/subscribe-button.js, so
  // one build serves multiple instances (mirror cluster, dev tunnels, etc.).
  normalizeUsername(raw) {
    let username = (raw || '').replace(/^@+/, '');
    const at = username.indexOf('@');
    if (at !== -1) {
      const hostPart = username.slice(at + 1).toLowerCase();
      const ourHost =
        typeof window !== 'undefined' && window.location
          ? window.location.host.toLowerCase()
          : '';
      if (hostPart && ourHost && hostPart === ourHost) {
        username = username.slice(0, at);
      }
    }
    return username;
  }

  // Seed the controller's tracked feed from each model() resolution, so
  // navigating /alice → /bob resets the list + cursor instead of appending
  // bob's posts onto alice's.
  setupController(controller, model) {
    super.setupController(controller, model);
    controller.seed(model);
  }
}
