import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ScrapesIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
  @service spinner;
  @tracked search = '';
  @tracked isSearching = false;

  @action updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }
  @action startSearching() {
    this.isSearching = true;
  }

  @action
  async retryScrape(scrape) {
    this.spinner.begin({ label: 'Retrying scrape...' });
    try {
      await scrape.redo();
      this.flashMessages.success('Scrape retry initiated');
      await scrape.reload();
    } catch (error) {
      this.flashMessages.danger('Failed to retry scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }
}
