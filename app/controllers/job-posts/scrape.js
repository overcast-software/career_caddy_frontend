import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsScrapeController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;

  queryParams = ['url'];
  @tracked url = '';

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  async submitHoldForm(event) {
    event.preventDefault();
    const scrape = this.store.createRecord('scrape', {
      url: this.url,
      status: 'hold',
    });
    let result;
    try {
      result = await this.spinner.wrap(scrape.save());
    } catch (error) {
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to start scrape.',
      );
      return;
    }
    this.router.transitionTo('scrapes.show', result);
  }
}
