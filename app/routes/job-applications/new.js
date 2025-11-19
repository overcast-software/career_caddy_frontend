import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsNewRoute extends Route {
  @service store;
  jobId = null;
  async model(_params, transition) {
    // Look for params that specifiy we already know the
    // job post and resume to use.
    // if those are absent just load them all and
    // let the user decide
    const { jobId, resumeId } = transition.to.queryParams;
    let jobPost = null;
    let jobPosts = null;
    let resume = null;
    if (jobId) {
      jobPost = this.store.peekRecord('job-post', jobId);
    } else {
      jobPosts = await this.store.findAll('job-post', { reload: true });
    }
    const resumes = await this.store.findAll('resume', { reload: true });
    this.store.findAll('cover-letter');
    if (resumeId) {
      resume = this.store.peekRecord('resume', resumeId);
    }
    const jobApplication = this.store.createRecord('job-application');
    return { jobApplication, jobPost, jobPosts, resumes, resume };
  }
}
