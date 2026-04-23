import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class AdminScrapeGraphController extends Controller {
  @service flashMessages;

  @action
  async copyMermaid() {
    try {
      await navigator.clipboard.writeText(this.model.mermaid);
      this.flashMessages.success('Mermaid source copied to clipboard.');
    } catch {
      this.flashMessages.danger('Clipboard copy failed.');
    }
  }
}
