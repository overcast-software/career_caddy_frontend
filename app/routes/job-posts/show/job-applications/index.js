import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationsIndexRoute extends Route {
  @service store;

  async model() {
    const jobPost = this.modelFor('job-posts.show');
    await this.store.query('resume', { slim: 1 });
    return jobPost.jobApplications;
  }
}
