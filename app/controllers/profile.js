import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

// Drives the public profile feed (CC #51). The route seeds the first page; this
// controller accumulates subsequent KEYSET pages as the visitor scrolls. The
// bottom sentinel (app/modifiers/in-viewport.js) calls loadMore when it enters
// the viewport — there is no load-more button.
export default class ProfileController extends Controller {
  @service store;

  // Growing list of loaded posts. Pages are appended by SPREAD into a fresh
  // array — never .slice()/.toArray()/.objectAt(), which break Ember Data
  // RecordArray reactivity. (Spread is safe here: @tracked drives the
  // re-render on reassignment, and we deliberately own the accumulated list
  // across multiple queries rather than relying on one query's liveness. The
  // records inside stay live Ember Data records.) `seed` resets it per model().
  @tracked posts = [];
  // Opaque keyset cursor for the NEXT page; null means the feed is exhausted.
  @tracked cursor = null;
  // Re-entrancy guard so a flurry of sentinel intersections fires one fetch.
  @tracked loadingMore = false;

  get user() {
    return this.model.user;
  }

  get username() {
    return this.model.username;
  }

  get displayName() {
    return this.user?.displayName || this.username;
  }

  get initial() {
    return (this.displayName || '?').charAt(0);
  }

  get hasMore() {
    return this.cursor !== null;
  }

  // Public application-flow funnel (CC-105). Read straight off the route model
  // (like `user`/`username`) — it's static per navigation, not paginated, so it
  // needs no @tracked seeding. `flow` is the report's JSON:API attributes object
  // (`{ nodes, links, total_job_posts, … }`) the route's reportFetch resolved,
  // or null when the funnel fetch failed / the profile isn't rich; `nodes`/
  // `links` are fed verbatim to Reports::ApplicationFlowSankey.
  get flow() {
    return this.model.flow;
  }

  get flowNodes() {
    return this.flow?.nodes || [];
  }

  get flowLinks() {
    return this.flow?.links || [];
  }

  // The api returns an EMPTY flow (nodes:[]) for non-rich profiles / no
  // published posts. Hide the chart entirely in that case — a non-rich profile
  // shows just the cards, no empty chart frame.
  get hasFlow() {
    return this.flowNodes.length > 0;
  }

  // Reset tracked state from the route model. Called by the route's
  // setupController on every entry/param change.
  seed(model) {
    const firstPage = model.firstPage || [];
    this.posts = [...firstPage];
    this.cursor = firstPage.meta?.next_cursor ?? null;
    this.loadingMore = false;
  }

  @action
  loadMore() {
    if (this.loadingMore || this.cursor === null) return;
    this.loadingMore = true;
    // store.query here is an explicit, user-scroll-triggered pagination fetch —
    // NOT a reactive getter — so it cannot autotrack-loop (the runaway-fetch
    // footgun the no-store.query-in-controllers rule guards against). The first
    // page lives in the route's model() per the sub-collection-read pattern;
    // this is just the keyset continuation. .then/.catch per project convention.
    this.store
      .query('job-post', {
        username: this.username,
        page: { size: 20, after: this.cursor },
      })
      .then((page) => {
        this.posts = [...this.posts, ...page];
        this.cursor = page.meta?.next_cursor ?? null;
        this.loadingMore = false;
      })
      .catch(() => {
        // Stop on error — clear the cursor so the sentinel idles instead of
        // hammering a failing endpoint.
        this.cursor = null;
        this.loadingMore = false;
      });
  }
}
