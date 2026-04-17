import Controller from '@ember/controller';
import { service } from '@ember/service';
import { getOwner } from '@ember/owner';
import { action } from '@ember/object';

export default class JobPostsShowScrapesController extends Controller {
  @service pollable;
  @service store;
  @service spinner;
  @service flashMessages;

  @action isPending(record) {
    return this.pollable.isPending(record);
  }

  @action async createScrape() {
    const jobPost = getOwner(this)
      .lookup('route:job-posts.show')
      .modelFor('job-posts.show');
    const scrape = this.store.createRecord('scrape', {
      jobPost,
      url: jobPost.link ?? '',
    });
    try {
      this.spinner.begin({ label: 'Creating scrape…' });
      const saved = await scrape.save();
      if (!this.pollable.isTerminal(saved)) {
        this.pollable.poll(saved, {
          successMessage: 'Scrape completed.',
          failedMessage: 'Scrape failed.',
          onComplete: () => this.flashMessages.success('Scrape completed.'),
          onFailed: () => this.flashMessages.danger('Scrape failed.'),
          onError: () =>
            this.flashMessages.danger(
              'Lost connection while waiting for scrape.',
            ),
        });
      } else {
        this.spinner.end();
      }
    } catch {
      this.spinner.end();
      scrape.unloadRecord();
      this.flashMessages.danger('Failed to create scrape.');
    }
  }
}
