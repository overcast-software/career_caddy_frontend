import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationsNewRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const [jobApplication, resumes] = await Promise.all([
      Promise.resolve(
        this.store.createRecord('job-application', {
          appliedAt: new Date(),
          status: 'applied',
        }),
      ),
      this.store.findAll('resume'),
    ]);
    jobApplication.jobPost = this.store.peekRecord('job-post', job_post_id);
    return { jobApplication, resumes };
  }
}
