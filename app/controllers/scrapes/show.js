import PollableController from 'career-caddy-frontend/controllers/pollable';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ScrapesShowController extends PollableController {
  @service spinner;
  @service store;
  @service router;

  startPollingIfPending() {
    this.flashMessages.info('Scrape in progress — waiting for results…');
    this.spinner.begin({ label: 'Scraping…' });
    super.startPollingIfPending();
  }

  onPollUpdate(rec) {
    this._refreshStatuses(rec);
  }

  async onPollComplete(rec) {
    this.spinner.end();
    this.flashMessages.success('Scrape completed.');
    await this.store.findRecord('scrape', rec.id, {
      reload: true,
      include: 'company,job-post',
    });
  }

  onPollFailed() {
    this.spinner.end();
    this.flashMessages.danger('Scrape failed.');
  }

  onPollError() {
    this.spinner.end();
    this.flashMessages.danger('Lost connection while waiting for scrape.');
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
  async queueScrape(scrape) {
    try {
      scrape.status = 'hold';
      await scrape.save();
      this.flashMessages.success('Scrape queued for poller');
      this.startPollingIfPending();
    } catch (error) {
      this.flashMessages.danger('Failed to queue scrape: ' + error.message);
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
