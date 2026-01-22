import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JobPostsShowController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  showControls = true;
  get resumes() {
    return this.store.findAll('resume');
  }

  @action
  async createQuestionWithApplication() {
    // Create and save a templated job-application for this job-post
    const jobApplication = this.store.createRecord('job-application', {
      appliedAt: new Date(),
      status: 'interested',
      jobPost: this.model,
      company: this.model.company,
    });

    await jobApplication.save();

    const jaid = jobApplication.id;
    console.log(jobApplication.id);
    // Navigate to the job-applications questions route with full page refresh
    window.location.href = `/job-applications/${jaid}/questions/new`;
  }
}
