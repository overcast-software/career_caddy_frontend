import PollableListController from 'career-caddy-frontend/controllers/pollable-list';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowScrapesController extends PollableListController {
  @service router;
  @service spinner;

  recordType = 'scrape';

  onRecordComplete() {
    this.flashMessages.success('Scrape completed.');
  }

  onRecordFailed() {
    this.flashMessages.danger('Scrape failed.');
  }

  onRecordError() {
    this.flashMessages.danger('Lost connection while waiting for scrape.');
  }

  @action async createScrape() {
    const { job_post_id } = this.router.currentRoute.parent.params;
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    const scrape = this.store.createRecord('scrape', {
      jobPost,
      url: jobPost.link ?? '',
    });
    try {
      const saved = await this.spinner.wrap(scrape.save(), {
        label: 'Creating scrape…',
      });
      if (!this.isTerminal(saved)) {
        this.pollRecord(saved);
      }
    } catch {
      scrape.unloadRecord();
      this.flashMessages.danger('Failed to create scrape.');
    }
  }
}
