import Controller from '@ember/controller';
import { service } from '@ember/service';

// Controller for the operator curation view (CC-64). Holds no query logic —
// the route's model() owns store.query. This getter derives the visible queue
// from the live RecordArray the route resolved.
export default class CurateController extends Controller {
  @service flashMessages;
  @service currentUser;

  // Publishable candidates minus any post that's already public. Iterates the
  // LIVE query RecordArray with for...of (no .slice()/.toArray()/.objectAt() —
  // those detach from Ember Data's tracking and kill reactivity). Reactive
  // removal: JobPosts::PublishToggle flips jobPost.audience on click, which
  // turns the model's `isPublic` getter true; because this getter reads
  // post.isPublic per row, that flip invalidates it and the just-published row
  // drops out of the queue with no callback plumbing back into the toggle.
  get candidates() {
    const posts = this.model;
    if (!posts) return [];
    const result = [];
    for (const post of posts) {
      if (!post.isPublic) result.push(post);
    }
    return result;
  }
}
