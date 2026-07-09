import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Operator "share my journey" curation view (CC-64 / CC-56 C2). Lists the
// vetted-but-unpublished posts the api surfaces via CC-61's
// filter[publishable]=true predicate so the operator can publish them
// deliberately (one-click, via the reused JobPosts::PublishToggle) to fill
// out the public @dough feed.
//
// store.query lives HERE, in the route model() — never in the controller or a
// component (frontend rule no-store-query-in-components). The returned live
// RecordArray is handed to the controller, whose `candidates` getter iterates
// it with for...of and drops any post that's already public, so publishing a
// row reactively removes it from the queue with no callback wiring.
//
// include is DASH-case (company, top-score, job-applications, questions) —
// app/serializers/application.js overrides keyForAttribute to snake_case but
// leaves keyForRelationship at the JSON:API default (dash), matching the
// include shape in app/routes/job-posts/show.js. Sideloading these lets the
// row's score cell + JA/question presence pills render on first paint without
// per-row follow-up fetches.
export default class CurateRoute extends Route {
  @service store;

  model() {
    return this.store.query('job-post', {
      'filter[publishable]': true,
      include: 'company,top-score,job-applications,questions',
      // -created_at is the proven-whitelisted job-post sort (same as the
      // /job-posts list). CC-93 makes an unknown sort key 400, so don't
      // gamble on last_seen_at here — recency intent is preserved.
      sort: '-created_at',
    });
  }
}
