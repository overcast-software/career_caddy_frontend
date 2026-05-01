import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowScrapesShowController extends Controller {
  @service pollable;
  @service store;
  @service spinner;
  @service flashMessages;

  @action
  async parseScrape(scrape) {
    try {
      const adapter = this.store.adapterFor('scrape');
      const base = adapter.buildURL('scrape', scrape.id).replace(/\/+$/, '');
      await adapter.ajax(`${base}/parse/`, 'POST');
      await scrape.reload();
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
    } catch (error) {
      this.flashMessages.danger('Failed to retry scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }
}
