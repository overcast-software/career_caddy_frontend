import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowJobApplicationsNewController extends Controller {
  @service flashMessages;
  @service router;

  get jobApplication() {
    return this.model.jobApplication;
  }

  get resumes() {
    return this.model.resumes;
  }

  get jobPostId() {
    return this.jobApplication?.belongsTo('jobPost')?.id();
  }

  @action async save() {
    try {
      await this.jobApplication.save();
      this.flashMessages.success('Application saved.');
      this.router.transitionTo('job-posts.show.job-applications', this.jobPostId);
    } catch {
      this.flashMessages.danger('Failed to save application.');
    }
  }

  @action cancel() {
    this.jobApplication.rollbackAttributes();
    this.router.transitionTo('job-posts.show.job-applications', this.jobPostId);
  }
}
