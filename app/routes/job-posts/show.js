import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowRoute extends Route {
  @service store;
  @service router;
  @service flashMessages;

  async model({ job_post_id }) {
    const jp = await this.store.findRecord('job-post', job_post_id, {
      include: 'scrapes',
    });
    // Reload the duplicate-candidates async hasMany on every route
    // activation — including a param change from clicking a candidate's
    // LinkTo. .reload() bypasses the per-record relationship cache so
    // the second visit doesn't show the first visit's stale list. The
    // custom job-post adapter's urlForFindHasMany routes the call to
    // /api/v1/job-posts/<id>/duplicate-candidates/.
    await jp.hasMany('duplicateCandidates').reload();
    return jp;
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.descriptionExpanded = false;
    if (!model.belongsTo('company').id()) {
      this.flashMessages.warning('This job post has no associated company.', {
        sticky: true,
      });
    }
  }

  error() {
    this.flashMessages.danger('Job post not found.');
    this.router.transitionTo('job-posts.index');
    return false;
  }
}
