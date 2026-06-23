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
    // .then/.catch (not async/await + try/catch) per project convention. The
    // resolution is one-shot and fully degrading: an unknown username (404 on
    // the user lookup) yields a null user → the template's not-found state; a
    // user that loads but whose feed errors yields an empty feed → the empty
    // state. Never a login bounce (the route is public) and never a render loop.
    return this.store
      .queryRecord('user', { username })
      .then((user) =>
        this.store
          .query('job-post', { username, page: { size: 20 } })
          .then((firstPage) => ({ username, user, firstPage }))
          .catch(() => ({ username, user, firstPage: [] })),
      )
      .catch(() => ({ username, user: null, firstPage: [] }));
  }

  // Seed the controller's tracked feed from each model() resolution, so
  // navigating /alice → /bob resets the list + cursor instead of appending
  // bob's posts onto alice's.
  setupController(controller, model) {
    super.setupController(controller, model);
    controller.seed(model);
  }
}
