import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobPostsShowJobApplicationsIndexRoute extends Route {
  @service store;

  @service currentUser;
  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id)
    const jobApplications = jobPost.jobApplications
    return {jobPost, jobApplications}
  }
}
