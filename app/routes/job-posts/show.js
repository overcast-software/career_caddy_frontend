import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowRoute extends Route {
  @service store;
  @service router;
  @service flashMessages;

  async model({ job_post_id }) {
    return await this.store.findRecord('job-post', job_post_id, {
      include: 'scrapes',
    });
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
