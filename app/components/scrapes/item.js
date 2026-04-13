import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const STATE_MAP = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  done: 'Completed',
};

export default class ScrapesItemComponent extends Component {
  scrapeSteps = ['Pending', 'Running', 'Completed'];
  failedStates = ['failed', 'error'];
  @tracked jobContentExpanded = false;

  get normalizedState() {
    const raw = (this.args.scrape?.status ?? '').toLowerCase();
    return STATE_MAP[raw] ?? this.args.scrape?.status ?? '';
  }

  @action toggleJobContent() {
    this.jobContentExpanded = !this.jobContentExpanded;
  }
}
