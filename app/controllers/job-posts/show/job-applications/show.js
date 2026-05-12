import Controller from '@ember/controller';
import { service } from '@ember/service';
import { getOwner } from '@ember/owner';
import { action } from '@ember/object';
import {
  stepsForStatus,
  TERMINAL_STATES,
} from 'career-caddy-frontend/utils/job-application-steps';

export default class JobPostsShowJobApplicationsShowController extends Controller {
  @service flashMessages;
  @service router;

  get jobPost() {
    return getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
  }

  get statusSteps() {
    return stepsForStatus(this.model.status);
  }

  get failedStates() {
    return TERMINAL_STATES;
  }

  @action destroyRecord(event) {
    event.preventDefault();
    if (!confirm('Delete application? This can not be undone.')) return;
    const jobPost = this.model.jobPost;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Application deleted.');
        this.router.transitionTo('job-posts.show', jobPost);
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete application.');
        }
      });
  }
}
