import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

const TERMINAL_STATES = ['completed', 'done', 'failed', 'error'];
const POLL_INTERVAL_MS = 3000;

export default class JobPostsScrapeController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;
  @service currentUser;

  @tracked scrapeStatus = null;

  _pollTimeout = null;

  willDestroy() {
    super.willDestroy(...arguments);
    this._stopPolling();
  }

  _stopPolling() {
    if (this._pollTimeout) {
      clearTimeout(this._pollTimeout);
      this._pollTimeout = null;
    }
  }

  async _pollScrape(scrape) {
    try {
      await scrape.reload();
    } catch {
      this.flashMessages.danger('Lost connection while waiting for scrape.');
      return;
    }

    if (TERMINAL_STATES.includes(scrape.state)) {
      if (scrape.state === 'failed' || scrape.state === 'error') {
        this.flashMessages.danger('Scrape failed.');
      } else {
        this.flashMessages.success('Scrape completed successfully!');
      }
      return;
    }

    this._pollTimeout = setTimeout(
      () => this._pollScrape(scrape),
      POLL_INTERVAL_MS,
    );
  }

  get showHoldOption() {
    return this.currentUser.user?.isStaff;
  }

  get isHold() {
    return this.scrapeStatus === 'hold';
  }

  @action
  setStatus(status) {
    this.scrapeStatus = status;
  }

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  async submitScrape(event) {
    event.preventDefault();
    this._stopPolling();

    let attrs = { url: this.url };
    if (this.scrapeStatus) {
      attrs.status = this.scrapeStatus;
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
}
