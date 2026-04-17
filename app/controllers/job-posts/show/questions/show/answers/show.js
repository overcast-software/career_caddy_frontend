import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowQuestionsShowAnswersShowController extends Controller {
  @service pollable;
  @service flashMessages;

  @tracked copyButtonText = 'Copy';

  startPollingIfPending() {
    this.pollable.pollIfPending(this.model, {
      label: 'Generating answer…',
      successMessage: 'Answer ready.',
      failedMessage: 'Answer generation failed.',
    });
  }

  @action
  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.model.content);
      this.copyButtonText = 'Copied';
      setTimeout(() => {
        this.copyButtonText = 'Copy';
      }, 2000);
    } catch {
      this.flashMessages.danger('Failed to copy to clipboard.');
    }
  }
}
