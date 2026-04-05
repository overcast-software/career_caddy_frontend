import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { later } from '@ember/runloop';

const TERMINAL_STATUSES = ['completed', 'done', 'failed', 'error'];
const POLL_INTERVAL_MS = 3000;

export default class ScrapesShowController extends Controller {
  @service spinner;
  @service flashMessages;
  @service store;
  @service poller;
  @service router;

  willDestroy() {
    super.willDestroy(...arguments);
    if (this.model) {
      this.poller.stop(this.model);
    }
  }

  startPollingIfNeeded(scrape) {
    if (TERMINAL_STATUSES.includes(scrape.status)) return;
    this.flashMessages.info('Scrape in progress — waiting for results…');
    this.spinner.begin({ label: 'Scraping…' });
    this.poller.watchRecord(scrape, {
      intervalMs: POLL_INTERVAL_MS,
      isTerminal: (rec) => TERMINAL_STATUSES.includes(rec.status),
      onStop: (rec) => {
        this.spinner.end();
        if (rec.status === 'failed' || rec.status === 'error') {
          this.flashMessages.danger('Scrape failed.');
        } else if (rec.jobPost?.id) {
          this.flashMessages.success('Scrape completed.');
          later(() => this.router.transitionTo('job-posts.show', rec.jobPost.id), 500);
        } else {
          this.flashMessages.success('Scrape completed.');
        }
      },
      onError: () => {
        this.spinner.end();
        this.flashMessages.danger('Lost connection while waiting for scrape.');
      },
    });
  }

  @action
  async parseScrape(scrape) {
    this.spinner.begin({ label: 'Parsing scrape...' });
    try {
      const adapter = this.store.adapterFor('scrape');
      const url = `${adapter.buildURL('scrape', scrape.id)}/parse/`;
      await adapter.ajax(url, 'POST');
      this.flashMessages.success('Parse initiated');
      await scrape.reload();
      this.startPollingIfNeeded(scrape);
    } catch (error) {
      this.flashMessages.danger('Failed to parse scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }

  @action
  async retryScrape(scrape) {
    this.spinner.begin({ label: 'Retrying scrape...' });
    try {
      const adapter = this.store.adapterFor('scrape');
      const url = `${adapter.buildURL('scrape', scrape.id)}/redo/`;

      await adapter.ajax(url, 'POST');

      this.flashMessages.success('Scrape retry initiated successfully');

      await scrape.reload();
      this.startPollingIfNeeded(scrape);
    } catch (error) {
      this.flashMessages.danger('Failed to retry scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }
}
