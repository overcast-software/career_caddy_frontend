import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class ScrapesShowController extends Controller {
  @service spinner;
  @service flashMessages;
  @service store;

  @action
  async retryScrape(scrape) {
    this.spinner.begin({ label: 'Retrying scrape...' });
    try {
      const adapter = this.store.adapterFor('scrape');
      const url = `${adapter.buildURL('scrape', scrape.id)}/redo/`;
      
      await adapter.ajax(url, 'POST');
      
      this.flashMessages.success('Scrape retry initiated successfully');
      
      // Reload the scrape to get updated status
      await scrape.reload();
    } catch (error) {
      this.flashMessages.danger('Failed to retry scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }
}
