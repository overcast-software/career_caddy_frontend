import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class CareerDataIndexController extends Controller {
  @service flashMessages;
  @tracked copyButtonText = 'Copy to Clipboard';

  @action
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.copyButtonText = 'Copied';
      setTimeout(() => {
        this.copyButtonText = 'Copy to Clipboard';
      }, 2000);
    } catch (err) {
      this.flashMessages.error('Failed to copy to clipboard');
      console.error('Failed to copy:', err);
    }
  }
}
