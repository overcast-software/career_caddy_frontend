import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowRoute extends Route {
  @service store;
  @service router;
  @service flashMessages;

  async model({ job_post_id }) {
    // `?include=duplicate-candidates` brings the candidate set in the same
    // round-trip as the JobPost itself — JP payload carries the
    // relationships.duplicate-candidates {data, links} block and the top-
    // level included[] holds the candidate resources, so Ember Data
    // populates the hasMany without a second request. The serializer-side
    // links.related declaration also makes a future .reload() work, but
    // the include= path is the one we actually exercise on every nav.
    return this.store.findRecord('job-post', job_post_id, {
      include: 'scrapes,duplicate-candidates',
      reload: true,
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
