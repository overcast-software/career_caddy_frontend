import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsScrapeController extends Controller {
  @service store;
  @service flashMessages;

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  submitScrape(event) {
    event.preventDefault();
    let scrape = this.store.createRecord('scrape', { url: this.url });
    scrape.save().catch((error) => {
      this.flashMessages.clearMessages();
      this.flashMessages.warning(error?.errors[0]?.detail || 'fucked');
    });
  }
}
