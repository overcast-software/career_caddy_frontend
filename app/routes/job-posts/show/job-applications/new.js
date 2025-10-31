import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationNewRoute extends Route {
  @service store;
  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const applicationPromise = this.store.createRecord('application', {
      appliedAt: new Date(),
      status: 'applied',
    });
    const jobPostPromise = this.store.findRecord('job-post', job_post_id);

    return Promise.all([applicationPromise, jobPostPromise]).then(
      ([application, jobPost]) => ({
        application,
        jobPost,
      }),
    );
  }
}
