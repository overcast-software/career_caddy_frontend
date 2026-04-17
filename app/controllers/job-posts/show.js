import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {
  @service store;
  @service flashMessages;
  @service router;

  @tracked copyButtonText = 'Copy Description';
  @tracked scrapeSubmitting = false;

  @action
  async copyDescription() {
    try {
      await navigator.clipboard.writeText(this.model.description);
      this.copyButtonText = 'Copied!';
      setTimeout(() => (this.copyButtonText = 'Copy Description'), 2000);
    } catch {
      this.flashMessages.danger('Failed to copy.');
    }
  }

  @action
  runScrape() {
    if (this.scrapeSubmitting || !this.model.link) return;
    this.scrapeSubmitting = true;
    const scrape = this.store.createRecord('scrape', {
      jobPost: this.model,
      company: this.model.company,
      url: this.model.link,
      status: 'hold',
    });
    scrape
      .save()
      .then(() => {
        this.flashMessages.success(
          'Scrape queued — the poller will pick it up.',
        );
      })
      .catch(() => {
        scrape.rollbackAttributes();
        this.flashMessages.danger('Failed to queue scrape.');
      })
      .finally(() => {
        this.scrapeSubmitting = false;
      });
  }
}
