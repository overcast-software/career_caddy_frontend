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
    // Always queue as `hold`; the synchronous browser-MCP scrape path
    // is gone and the hold-poller is the only supported scrape driver.
    const scrape = this.store.createRecord('scrape', {
      jobPost,
      url: jobPost.link ?? '',
      status: 'hold',
    });
    try {
      this.spinner.begin({ label: 'Queuing scrape…' });
      const saved = await scrape.save();
      this.flashMessages.success('Scrape queued — watching for completion.');
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
    } catch (e) {
      this.spinner.end();
      const dupeId = e?.errors?.[0]?.meta?.existing_job_post_id;
      if (dupeId && String(dupeId) !== String(jobPost.id)) {
        scrape.rollbackAttributes();
        this.flashMessages.info(`Already have this — opening #${dupeId}.`);
        // No router service here; let the user pick the link from the
        // flash message. (This callsite is rare — the user is already
        // on jp.show and the api now skips dedupe when relationship is
        // sent, so this branch effectively only fires on contract drift.)
        return;
      }
      scrape.rollbackAttributes();
      this.flashMessages.danger('Failed to queue scrape.');
    }
  }
}
