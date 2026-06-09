import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Side-by-side compare of two JobPosts for staff dedupe curation.
// URL: /admin/dedupe/:a/compare/:b — a = the "from" JP (the one that
// will be marked duplicate/repost of b on submit), b = the target /
// canonical. The controller's submit action calls a.markDuplicateOf(...)
// with the user's field_overrides + relation choice.
export default class AdminDedupeCompareRoute extends Route {
  @service store;

  model(params) {
    return Promise.all([
      this.store.findRecord('job-post', params.a, {
        include: 'company',
      }),
      this.store.findRecord('job-post', params.b, {
        include: 'company',
      }),
    ]).then(([a, b]) => ({ a, b }));
  }

  resetController(controller, isExiting) {
    if (isExiting) {
      controller.resetState();
    }
  }
}
