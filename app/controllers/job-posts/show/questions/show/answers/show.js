import PollableController from 'career-caddy-frontend/controllers/pollable';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowQuestionsShowAnswersShowController extends PollableController {
  @tracked copyButtonText = 'Copy';

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
