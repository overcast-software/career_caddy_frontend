import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsEditController extends Controller {
  @service flashMessages;

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
