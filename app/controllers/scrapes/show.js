import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ScrapesShowController extends Controller {
  @service pollable;
  @service store;
  @service router;
  @service spinner;
  @service flashMessages;

  startPollingIfPending() {
    this.pollable.pollIfPending(this.model, {
      label: 'Scraping…',
      successMessage: 'Scrape completed.',
      failedMessage: 'Scrape failed.',
      onUpdate: (rec) => this._refreshStatuses(rec),
      onComplete: async (rec) => {
        this.flashMessages.success('Scrape completed.');
        await this.store.findRecord('scrape', rec.id, {
          reload: true,
          include: 'company,job-post,scrape-statuses',
          adapterOptions: {
            fields: {
              scrape:
                'url,source_link,status,scraped_at,parse_method,external_link,job_content,latest_status_note',
            },
          },
        });
      },
      onFailed: () => this.flashMessages.danger('Scrape failed.'),
      onError: () =>
        this.flashMessages.danger('Lost connection while waiting for scrape.'),
    });
  }

  async _refreshStatuses(scrape) {
    try {
      const statuses = await scrape.scrapeStatuses;
      await statuses.reload();
    } catch {
      // Non-critical — timeline just won't update this tick
    }
  }

  @action
  async parseScrape(scrape) {
    try {
      const adapter = this.store.adapterFor('scrape');
      const base = adapter.buildURL('scrape', scrape.id).replace(/\/+$/, '');
      await adapter.ajax(`${base}/parse/`, 'POST');
      await scrape.reload();
      this.startPollingIfPending();
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
      this.startPollingIfPending();
    } catch (error) {
      this.flashMessages.danger('Failed to retry scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }
}
