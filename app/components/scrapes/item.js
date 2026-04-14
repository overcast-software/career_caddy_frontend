import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

const STATE_MAP = {
  hold: 'Hold',
  pending: 'Pending',
  running: 'Running',
  scraping: 'Scraping',
  extracting: 'Extracting',
  completed: 'Completed',
  done: 'Completed',
};

export default class ScrapesItemComponent extends Component {
  @service currentUser;
  @service session;

  scrapeSteps = [
    'Hold',
    'Pending',
    'Running',
    'Scraping',
    'Extracting',
    'Completed',
  ];
  failedStates = ['failed', 'error', 'login_failed'];
  @tracked jobContentExpanded = false;
  @tracked copied = false;
  @tracked screenshots = [];

  get normalizedState() {
    const raw = (this.args.scrape?.status ?? '').toLowerCase();
    return STATE_MAP[raw] ?? this.args.scrape?.status ?? '';
  }

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }

  constructor() {
    super(...arguments);
    if (this.isStaff) {
      this._loadScreenshots();
    }
  }

  async _loadScreenshots() {
    const id = this.args.scrape?.id;
    if (!id) return;
    try {
      const token = this.session.data?.authenticated?.access;
      const resp = await fetch(`/api/v1/scrapes/${id}/screenshots/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const json = await resp.json();
        this.screenshots = (json.data || []).map((s) => ({
          filename: s.filename,
          url: `/api/v1/scrapes/${id}/screenshots/${s.filename}`,
        }));
      }
    } catch {
      // Screenshots are optional debug info
    }
  }

  @action toggleJobContent() {
    this.jobContentExpanded = !this.jobContentExpanded;
  }

  @action async copyJobContent() {
    try {
      await navigator.clipboard.writeText(this.args.scrape.jobContent);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      // fallback silently
    }
  }
}
