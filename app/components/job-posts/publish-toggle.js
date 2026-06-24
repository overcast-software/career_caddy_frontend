import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { AS2_PUBLIC } from 'career-caddy-frontend/models/job-post';

// One-click publish/unpublish affordance for a job-post (CC-56 C1).
// Bound to the model's `isPublic` getter; calls A1's
// POST /job-posts/:id/publish/ and /unpublish/ verbs. apiAction auto-pushes
// the api's flipped `audience`, so `isPublic` (and the jp.show "Private"
// badge) reconcile reactively with no manual reload. The click flips
// `audience` optimistically so the label turns over instantly, then
// restores the captured prior audience if the request fails. Reused by the
// C2 curation view. Follows the JobPosts::TriageActions .then/.catch/.finally
// shape (no async/await for the action, no .slice()/.toArray()).
export default class JobPostsPublishToggleComponent extends Component {
  @service flashMessages;
  @tracked submitting = false;

  get isPublic() {
    return this.args.jobPost?.isPublic;
  }

  get label() {
    return this.isPublic ? 'Unpublish' : 'Publish to my public feed';
  }

  @action
  toggle() {
    if (this.submitting) return;
    const jobPost = this.args.jobPost;
    const wasPublic = jobPost.isPublic;
    // Capture the exact prior array so a failure restores it verbatim — a
    // legacy audience may carry more entries than just AS2_PUBLIC.
    const prevAudience = jobPost.audience;
    this.submitting = true;
    // Optimistic flip — assign a fresh array (Ember Data tracks array
    // identity, not contents). On success apiAction's store.push lands the
    // api's authoritative audience, which matches this value so the
    // attribute settles clean.
    jobPost.audience = wasPublic ? [] : [AS2_PUBLIC];
    const request = wasPublic ? jobPost.unpublish() : jobPost.publish();
    request
      .then(() => {
        this.flashMessages.success(
          wasPublic ? 'Unpublished.' : 'Published to your public feed.',
        );
      })
      .catch((error) => {
        jobPost.audience = prevAudience;
        const detail =
          error?.errors?.[0]?.detail ?? 'Failed to update visibility.';
        this.flashMessages.danger(detail);
      })
      .finally(() => {
        this.submitting = false;
      });
  }
}
