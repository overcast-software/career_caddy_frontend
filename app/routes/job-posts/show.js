import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowRoute extends Route {
  @service store;
  @service router;
  @service flashMessages;

  async model({ job_post_id }) {
    return await this.store.findRecord('job-post', job_post_id, {
      include: [
        'company',
        'job-applications',
        'questions',
        'scores',
        'cover-letters',
        'scrapes',
        'summaries',
      ],
    });
  }

  error() {
    this.flashMessages.danger('Job post not found.');
    this.router.transitionTo('job-posts.index');
    return false;
  }
}
