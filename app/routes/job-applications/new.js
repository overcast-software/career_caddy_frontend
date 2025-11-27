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
    const jobApplication = this.store.createRecord('job-application');
    if (jobId) {
      jobPost = this.store.peekRecord('job-post', jobId);
      jobApplication.jobPost = jobPost;
    } else {
      this.store.findAll('job-post', { reload: true });
    }
    this.store.findAll('cover-letter');
    if (resumeId) {
      const resume = this.store.peekRecord('resume', resumeId);
      jobApplication.resume = resume;
    } else {
      debugger
      this.store.findAll('resume');
    }
    return jobApplication;
  }
}
