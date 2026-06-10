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
  submitHoldForm(event) {
    event.preventDefault();
    const scrape = this.store.createRecord('scrape', {
      url: this.url,
      status: 'hold',
    });
    this.spinner
      .wrap(scrape.save())
      .then((saved) => {
        // The api mints (or links) a JobPost up front so the scrape
        // can be associated with the post that will receive its
        // extracted fields. Prefer the nested route so the user sees
        // the new scrape inside the JobPost context (where the
        // scrapes hasMany + sideloaded description live) and can
        // navigate back to the parent show without losing their
        // place. Fall back to the top-level scrape route only if the
        // api skipped the JobPost (legacy contract).
        const jobPostId = saved.belongsTo('jobPost')?.id?.();
        if (jobPostId) {
          this.router.transitionTo(
            'job-posts.show.scrapes.show',
            jobPostId,
            saved.id,
          );
          return;
        }
        this.router.transitionTo('scrapes.show', saved);
      })
      .catch((error) => {
        // 409 dedupe: API refused because the URL already maps to a
        // JobPost. Roll back the orphaned in-flight scrape (otherwise
        // it lingers in the store) and route the user to the
        // existing post.
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
      });
  }
}
