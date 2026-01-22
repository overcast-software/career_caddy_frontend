import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsScrapeController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  submitScrape(event) {
    event.preventDefault();
    let scrape = this.store.createRecord('scrape', { url: this.url });
    this.spinner.wrap(
      scrape
        .save()
        .catch((error) => {
          this.flashMessages.danger(error?.errors[0]?.detail);
        })
        .then(() => this.router.transitionTo('job-posts.index')),
    );
  }
}
