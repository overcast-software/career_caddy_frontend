import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowScrapesShowController extends Controller {
  @service pollable;
  @service store;
  @service spinner;
  @service flashMessages;
  @service router;

  @action
  async parseScrape(scrape) {
    try {
      const adapter = this.store.adapterFor('scrape');
      const base = adapter.buildURL('scrape', scrape.id).replace(/\/+$/, '');
      await adapter.ajax(`${base}/parse/`, 'POST');
      await scrape.reload();
    } catch (error) {
      this.flashMessages.danger('Failed to parse scrape: ' + error.message);
    }
  }

  @action
  async retryScrape(scrape) {
    this.spinner.begin({ label: 'Retrying scrape...' });
    try {
      const adapter = this.store.adapterFor('scrape');
      const base = adapter.buildURL('scrape', scrape.id).replace(/\/+$/, '');
      await adapter.ajax(`${base}/redo/`, 'POST');
      this.flashMessages.success('Scrape retry initiated');

      // Poll until the scrape has a child (created by poller on redirect)
      const childId = await this._waitForChild(scrape);
      if (childId) {
        const jobPost = await scrape.jobPost;
        if (jobPost) {
          this.router.transitionTo(
            'job-posts.show.scrapes.show',
            jobPost.id,
            childId,
          );
          return;
        }
      }

      // No child created — reload the original scrape
      await scrape.reload();
    } catch (error) {
      this.flashMessages.danger('Failed to retry scrape: ' + error.message);
    } finally {
      this.spinner.end();
    }
  }

  async _waitForChild(scrape, maxWait = 30000) {
    const pollInterval = 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const fresh = await this.store.findRecord('scrape', scrape.id, {
          include: 'scrapes',
          reload: true,
        });
        const children = fresh.scrapes.value();
        if (children && children.length > 0) {
          return children[0].id;
        }
      } catch {
        // Silently ignore during polling
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return null;
  }
}
