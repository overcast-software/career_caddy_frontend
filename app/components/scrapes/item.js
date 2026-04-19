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
      // Use absolute API URL — in prod the frontend and API are on
      // different origins, and a relative /api/v1/... resolves to the
      // frontend origin which serves index.html as SPA fallback.
      const listUrl = `${this.api.baseUrl}scrapes/${id}/screenshots/`;
      const resp = await fetch(listUrl, {
        headers: this.api.headers(),
        // Poller writes screenshots mid-lifecycle; without no-store the
        // browser can 304 back to an earlier empty-list response.
        cache: 'no-store',
      });
      if (resp.ok) {
        const json = await resp.json();
        this.screenshots = (json.data || []).map((s) => ({
          filename: s.filename,
          url: `${this.api.baseUrl}scrapes/${id}/screenshots/${s.filename}`,
          revealed: false,
        }));
      }
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
