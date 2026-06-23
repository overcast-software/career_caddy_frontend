import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Public `/<username>` profile page (CC #51) — the human-readable twin of the
// ActivityPub actor outbox. Lists a user's PUBLISHED (audience-public) job
// posts. Registered public in app/services/public-routes.js so a logged-out
// visitor reaches it without an auth redirect.
//
// Data path (canonical sub-collection-read pattern #3): store.query against
// the dedicated `public-job-post` model, whose adapter targets
// GET /api/v1/users/:username/job-posts/federated/ WITHOUT an Authorization
// header (api PR #195, AllowAny). An unknown username 404s and a known user
// with no public posts returns 200 with empty `data`; both degrade to the
// empty state below. The empty → populated transition (once a user publishes
// an audience-public post) is the intended end-to-end publish test signal.
export default class ProfileRoute extends Route {
  @service store;

  model(params) {
    const username = params.username;
    // .then/.catch (not async/await + try/catch) per project convention. The
    // resolution is one-shot: a 404 (endpoint not built yet) or any failure
    // degrades to an empty list — never a retry or render loop.
    return this.store
      .query('public-job-post', { username })
      .then((posts) => this._present(username, posts, posts.meta))
      .catch(() => this._present(username, [], null));
  }

  // Light actor/persona fields ride along in the JSON:API top-level `meta`
  // (display_name, avatar_url); fall back to the username when absent.
  _present(username, posts, meta) {
    const m = meta || {};
    const displayName = m.display_name || username;
    const avatarUrl = m.avatar_url || null;
    const initial = (displayName || username || '?').charAt(0);
    return { username, displayName, avatarUrl, initial, posts };
  }
}
