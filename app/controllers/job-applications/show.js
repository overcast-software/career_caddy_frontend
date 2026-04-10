import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
import {
  stepsForStatus,
  TERMINAL_STATES,
} from 'career-caddy-frontend/utils/job-application-steps';

export default class JobApplicationsShowController extends Controller {
  @service flashMessages;
  @service router;

  get statusSteps() {
    return stepsForStatus(this.model.status);
  }

  get failedStates() {
    return TERMINAL_STATES;
  }

  @action async destroyRecord(event) {
    event.preventDefault();
    if (!confirm('Delete application? This can not be undone')) return;
    const jobPost = this.model.jobPost;
    await this.model.destroyRecord();
    this.flashMessages.success('Application deleted.');
    this.router.transitionTo('job-posts.show', jobPost);
  }
}
