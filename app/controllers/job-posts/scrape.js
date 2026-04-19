import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsScrapeController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;
  @service currentUser;

  queryParams = ['url'];
  @tracked url = '';

  get showHoldOption() {
    return this.currentUser.user?.isStaff;
  }

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  async _submit(status) {
    let attrs = { url: this.url };
    if (status) {
      attrs.status = status;
    }
    let scrape = this.store.createRecord('scrape', attrs);
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

  @action
  async submitScrape(event) {
    event.preventDefault();
    await this._submit(null);
  }

  @action
  async submitHold() {
    await this._submit('hold');
  }
}
