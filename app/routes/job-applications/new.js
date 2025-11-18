import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsNewRoute extends Route {
  @service store;
  jobId = null
  async model(_params, transition) {
    const jobId = transition.to.queryParams.jobId;
    let jobPost = null
    let jobPosts = null
    if (jobId) {
      jobPost = this.store.peekRecord('job-post', jobId);
    } else {
      jobPosts = await this.store.findAll('job-post', { reload: true });
    }
    const resumes = await this.store.findAll('resume', { reload: true });
    this.store.findAll('cover-letter');
    const jobApplication = this.store.createRecord('job-application');
    return {jobApplication, jobPost, jobPosts, resumes}
  }

}
