import Controller from '@ember/controller';
import { service } from '@ember/service';
import { getOwner } from '@ember/owner';

export default class JobPostsShowSummariesShowController extends Controller {
  @service pollable;
  @service flashMessages;

  get jobPost() {
    return getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
  }

  startPollingIfPending() {
    this.pollable.pollIfPending(this.model, {
      label: 'Generating summary…',
      successMessage: 'Summary ready.',
      failedMessage: 'Summary generation failed.',
      onFailed: () => this.flashMessages.danger('Summary generation failed.'),
      onError: () =>
        this.flashMessages.danger('Lost connection while waiting for summary.'),
    });
  }
}
