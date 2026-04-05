import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowRoute extends Route {
  @service store;

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

  async afterModel() {
    await this.store.findAll('resume');
  }
}
