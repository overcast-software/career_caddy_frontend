import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsNewScrapeController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;

  queryParams = ['url'];
  @tracked url = '';

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  async submitHoldForm(event) {
    event.preventDefault();
    const scrape = this.store.createRecord('scrape', {
      url: this.url,
      status: 'hold',
    });
    let result;
    try {
      result = await this.spinner.wrap(scrape.save());
    } catch (error) {
      // 409 dedupe: API refused because the URL already maps to a
      // JobPost. Roll back the orphaned in-flight scrape (otherwise it
      // lingers in the store) and route the user to the existing post.
      const dupeId = error?.errors?.[0]?.meta?.existing_job_post_id;
      if (dupeId) {
        if (scrape && !scrape.isDestroyed) scrape.rollbackAttributes();
        this.flashMessages.info(`Already have this — opening #${dupeId}.`);
        this.router.transitionTo('job-posts.show', dupeId);
        return;
      }
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to start scrape.',
      );
      return;
    }
    this.router.transitionTo('scrapes.show', result);
  }
}
