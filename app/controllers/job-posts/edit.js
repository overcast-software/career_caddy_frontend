import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsEditController extends Controller {
  @service flashMessages;
  @service router;
  @service store;
  @service currentUser;

  @tracked resolveAndDedupeSubmitting = false;

  // Staff-only: kick off a browser-driven scrape that resolves
  // redirects + captures the apply URL but skips LLM extraction.
  // Used to settle JS / meta-refresh trackers (e.g. ZipRecruiter
  // /km/<token>) so dedupe-by-canonical-link can collapse the row
  // onto its sibling. The originating JP's fields are not modified.
  @action
  resolveAndDedupe() {
    if (this.resolveAndDedupeSubmitting) return;
    if (!this.currentUser?.user?.isStaff) return;
    if (!this.model.link) {
      this.flashMessages.warning('No link to resolve on this post.');
      return;
    }
    if (
      !window.confirm(
        'Resolve redirects + check for duplicates? This runs a real ' +
          'browser fetch but does not modify this post.',
      )
    ) {
      return;
    }
    this.resolveAndDedupeSubmitting = true;
    this.store
      .adapterFor('job-post')
      .resolveAndDedupe(this.model)
      .then(() => {
        this.flashMessages.success(
          'Resolve & dedupe queued — watch the Scrapes panel for results.',
        );
        this.router.transitionTo('job-posts.show.scrapes', this.model.id);
      })
      .catch((err) =>
        this.flashMessages.danger(
          `Resolve & dedupe failed: ${err?.message || 'unknown error'}`,
        ),
      )
      .finally(() => {
        this.resolveAndDedupeSubmitting = false;
      });
  }

  // Reopen this post for re-scrape from the extension. Sets the
  // explicit `complete` flag to false; cc_auto, the extension popup,
  // and the from-text dedup all read this. Confirms first because
  // the action is otherwise indistinguishable from a misclick.
  @action
  markIncomplete() {
    if (!this.model.complete) return;
    if (
      !window.confirm(
        'Mark this post incomplete so the extension will re-scrape it?',
      )
    ) {
      return;
    }
    this.model.complete = false;
    this.model
      .save()
      .then(() => {
        this.flashMessages.success(
          'Marked incomplete — re-send from the extension to refresh it.',
        );
      })
      .catch((e) => {
        this.model.rollbackAttributes();
        this.flashMessages.danger(
          e?.errors?.[0]?.detail || e?.message || 'Failed to mark incomplete.',
        );
      });
  }
}
