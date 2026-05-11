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
  @service api;
  @service store;

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
      this._loadScreenshotList();
    }
  }

  async _loadScreenshotList() {
    const id = this.args.scrape?.id;
    if (!id) return;
    try {
      const result = await this.store.query('screenshot', { scrape_id: id });
      this.screenshots = (result.toArray?.() ?? []).map((s) => ({
        filename: s.filename,
        url: `${this.api.baseUrl}scrapes/${id}/screenshots/${s.filename}`,
        revealed: false,
      }));
    } catch {
      // Screenshots are optional debug info
    }
  }

  @action async toggleScreenshot(shot) {
    if (shot.revealed) {
      const updated = this.screenshots.map((s) =>
        s.filename === shot.filename ? { ...s, revealed: false } : s,
      );
      this.screenshots = updated;
      return;
    }

    let blobUrl = shot.blobUrl;
    if (!blobUrl) {
      // KEEP raw fetch: per-file binary PNG download. JSON:API
      // doesn't apply to a binary response, and adapter.ajax assumes
      // a JSON body. Mirrors the cover-letter export pattern.
      const resp = await fetch(shot.url, {
        headers: this.api.headers(),
      });
      if (resp.ok) {
        const blob = await resp.blob();
        blobUrl = URL.createObjectURL(blob);
      }
    }

    const updated = this.screenshots.map((s) =>
      s.filename === shot.filename ? { ...s, revealed: true, blobUrl } : s,
    );
    this.screenshots = updated;
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
