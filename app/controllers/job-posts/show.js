import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;
  @service pollable;

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
    // Async belongsTo — use .value() so we pass the loaded Company
    // instance rather than the async proxy (rejected by Ember Data).
    const company = this.model.belongsTo('company').value();
    const scrape = this.store.createRecord('scrape', {
      jobPost: this.model,
      company,
      url: this.model.link,
      status: 'hold',
    });
    scrape
      .save()
      .then((saved) => {
        this.flashMessages.success('Scrape queued — watching for completion.');
        // Park the user on the scrapes tab so they see the new row (which
        // the scrapes route fetches fresh) while the poller works.
        this.router.transitionTo('job-posts.show.scrapes', this.model);
        if (!this.pollable.isTerminal(saved)) {
          this.spinner.begin({ label: 'Scraping…' });
          this.pollable.poll(saved, {
            successMessage: 'Scrape complete.',
            failedMessage: 'Scrape failed.',
            onComplete: () => {
              this.flashMessages.clearMessages();
              this.flashMessages.success('Scrape complete.');
              // Refresh the jobPost so title/description/salary reflect
              // the freshly-parsed values without a page reload.
              this.model.reload().catch(() => {});
            },
            onFailed: () => {
              this.flashMessages.clearMessages();
              this.flashMessages.danger(
                'Scrape failed — try Run scrape again or paste the page text.',
              );
            },
          });
        }
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
