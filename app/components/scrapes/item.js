import Component from '@glimmer/component';

const STATE_MAP = {
  pending: 'Pending',
  running: 'Running',
  completed: 'Completed',
  done: 'Completed',
};

export default class ScrapesItemComponent extends Component {
  scrapeSteps = ['Pending', 'Running', 'Completed'];
  failedStates = ['failed', 'error'];

  get normalizedState() {
    const raw = (this.args.scrape?.status ?? '').toLowerCase();
    return STATE_MAP[raw] ?? this.args.scrape?.status ?? '';
  }
}
