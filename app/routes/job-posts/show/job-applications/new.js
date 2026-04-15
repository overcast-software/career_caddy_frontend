import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationsNewRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    await this.store.query('resume', { slim: 1 });
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    return this.store.createRecord('job-application', {
      appliedAt: new Date(),
      status: 'Applied',
      jobPost,
    });
  }
}
