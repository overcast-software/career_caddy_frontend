import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

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
      onStop: async (rec) => {
        this.spinner.end();
        if (rec.status === 'failed' || rec.status === 'error') {
          this.flashMessages.danger('Scrape failed.');
        } else {
          this.flashMessages.success('Scrape completed.');
          await this.store.findRecord('scrape', rec.id, {
            reload: true,
            include: 'company,job-post',
          });
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
    try {
      const adapter = this.store.adapterFor('scrape');
      const base = adapter.buildURL('scrape', scrape.id).replace(/\/+$/, '');
      await adapter.ajax(`${base}/parse/`, 'POST');
      await scrape.reload();
      this.startPollingIfNeeded(scrape);
    } catch (error) {
      this.flashMessages.danger('Failed to parse scrape: ' + error.message);
    }
  }

  @action
  async retryScrape(scrape) {
    this.spinner.begin({ label: 'Retrying scrape...' });
    try {
      const adapter = this.store.adapterFor('scrape');
      const base = adapter.buildURL('scrape', scrape.id).replace(/\/+$/, '');
      await adapter.ajax(`${base}/redo/`, 'POST');

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
