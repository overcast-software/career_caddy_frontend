import Route from '@ember/routing/route';
import { service } from '@ember/service';

// /admin/job-posts/:job_post_id/dupes — staff dedupe workspace for
// one JobPost. Loads the JP with `include=duplicate-candidates,company`
// so the candidate set is materialized synchronously on first paint.
// Reload: true so the candidate set is fresh even when arriving from
// a jp.edit that already has the JP cached without the include.
export default class AdminJobPostsDupesRoute extends Route {
  @service store;

  model({ job_post_id }) {
    return this.store.findRecord('job-post', job_post_id, {
      include: 'duplicate-candidates,company',
      reload: true,
    });
  }
}
