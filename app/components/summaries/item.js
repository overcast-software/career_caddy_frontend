import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SummariesItemComponent extends Component {
  @tracked copyButtonText = 'Copy to Clipboard';

  @action
  async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.args.summary.content);
      this.copyButtonText = 'Copied';
      setTimeout(() => {
        this.copyButtonText = 'Copy to Clipboard';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }
}
