import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class JobApplicationsNewRoute extends Route {
  @service store;
  jobId = null;
  setupController(controller, model) {
    controller.selectedJobPost = model.jobPost;
    controller.selectedResume = model.resume;
    controller.selectedCoverLetter = model.coverLetter;
    controller.selectedStatus = model.status;
    controller.model = model;
  }
  async model(_params, transition) {
    // Look for params that specifiy we already know the
    // job post and resume to use.
    // if those are absent just load them all and
    // let the user decide
    const { jobId, resumeId } = transition.to.queryParams;
    const jobApplication = this.store.createRecord('job-application');
    if (jobId) {
      const jobPost = await this.store.findRecord('job-post', jobId, {
        include: 'company',
      });
      jobApplication.jobPost = jobPost;
    }
    this.store.findAll('cover-letter');
    if (resumeId) {
      const resume = this.store.peekRecord('resume', resumeId);
      jobApplication.resume = resume;
    } else {
      this.store.findAll('resume');
    }
    return jobApplication;
  }
}
