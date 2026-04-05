import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @tracked copyButtonText = 'Copy Description';

  @action
  async copyDescription() {
    try {
      await navigator.clipboard.writeText(this.model.description);
      this.copyButtonText = 'Copied!';
      setTimeout(() => (this.copyButtonText = 'Copy Description'), 2000);
    } catch {
      this.flashMessages.alert('Failed to copy.');
    }
  }
}
