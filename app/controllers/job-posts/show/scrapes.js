import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const TERMINAL_STATUSES = new Set(['completed', 'done', 'failed', 'error']);

export default class JobPostsShowScrapesController extends Controller {
  @service store;
  @service router;
  @service spinner;
  @service flashMessages;
  @service poller;

  @tracked pendingIds = new Set();

  get jobPost() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    return this.store.peekRecord('job-post', job_post_id);
  }

  @action isPending(scrape) {
    return this.pendingIds.has(scrape.id);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    for (const id of this.pendingIds) {
      const record = this.store.peekRecord('scrape', id);
      if (record) this.poller.stop(record);
    }
  }

  @action async createScrape() {
    const jobPost = this.jobPost;
    const scrape = this.store.createRecord('scrape', { jobPost, url: jobPost.link ?? '' });
    try {
      const saved = await this.spinner.wrap(scrape.save(), { label: 'Creating scrape…' });
      if (!TERMINAL_STATUSES.has(saved.status)) {
        this._pollScrape(saved);
      }
    } catch {
      scrape.unloadRecord();
      this.flashMessages.alert('Failed to create scrape.');
    }
  }

  _pollScrape(scrape) {
    this.pendingIds = new Set([...this.pendingIds, scrape.id]);
    this.poller.watchRecord(scrape, {
      isTerminal: (rec) => TERMINAL_STATUSES.has(rec.status),
      onStop: (rec) => {
        this.pendingIds = new Set([...this.pendingIds].filter((id) => id !== scrape.id));
        if (rec.status === 'failed' || rec.status === 'error') {
          this.flashMessages.alert('Scrape failed.');
        } else {
          this.flashMessages.success('Scrape completed.');
        }
      },
      onError: () => {
        this.pendingIds = new Set([...this.pendingIds].filter((id) => id !== scrape.id));
        this.flashMessages.alert('Lost connection while waiting for scrape.');
      },
    });
  }
}
