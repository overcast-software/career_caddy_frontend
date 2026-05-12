import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class JobPostsShowCoverLettersShowController extends Controller {
  @service pollable;
  @service flashMessages;

  startPollingIfPending() {
    this.pollable.pollIfPending(this.model, {
      label: 'Generating cover letter…',
      successMessage: 'Cover letter ready.',
      failedMessage: 'Cover letter generation failed.',
      onFailed: () =>
        this.flashMessages.danger('Cover letter generation failed.'),
      onError: () =>
        this.flashMessages.danger(
          'Lost connection while waiting for cover letter.',
        ),
    });
  }
}
