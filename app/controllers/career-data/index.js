import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { parseMarkdownSections } from 'career-caddy-frontend/utils/markdown-sections';

export default class CareerDataIndexController extends Controller {
  @service flashMessages;
  @tracked copied = false;

  get sections() {
    // Shared parse — the anchor-nav widget and the sectioned card view
    // below use the same ids, so nav jumps land on the matching card.
    return parseMarkdownSections(this.model?.data);
  }

  @action
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 1500);
    } catch (err) {
      this.flashMessages.danger('Failed to copy to clipboard.');
      console.error('Failed to copy:', err);
    }
  }
}
