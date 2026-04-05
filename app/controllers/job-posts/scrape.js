import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

const TERMINAL_STATES = ['completed', 'done', 'failed', 'error'];
const POLL_INTERVAL_MS = 3000;

export default class JobPostsScrapeController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;

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

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  async submitScrape(event) {
    event.preventDefault();
    this._stopPolling();

    let scrape = this.store.createRecord('scrape', { url: this.url });
    let result;
    try {
      result = await this.spinner.wrap(scrape.save());
    } catch (error) {
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to start scrape.',
      );
      return;
    }

    // After save completes, go to scores/:id of the returned record
    this.router.transitionTo('job-posts.show', result.jobPost.id);
  }
}
