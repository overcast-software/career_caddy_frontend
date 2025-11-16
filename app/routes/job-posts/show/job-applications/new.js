import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationNewRoute extends Route {
  @service store;

  @service currentUser;
  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = await this.store.peekRecord('job-post', job_post_id);
    const jobApplication = await this.store.createRecord('job-application', {
      appliedAt: new Date(),
      status: 'applied',
    });

    jobApplication.jobPost = jobPost;
    return jobApplication;
  }
}
