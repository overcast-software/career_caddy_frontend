import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SummariesDetailListComponent extends Component {
  @tracked copiedId = null;

  @action
  async copyToClipboard(summary) {
    try {
      await navigator.clipboard.writeText(summary.content);
      this.copiedId = summary.id;
      setTimeout(() => {
        this.copiedId = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
}
