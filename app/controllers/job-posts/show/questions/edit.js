import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsEditController extends Controller {
  @service router;

  // Keep the user in the job-posts.show subtree — the shared form
  // otherwise falls through to the global questions.show redirect.
  // Read the job_post id from the question's belongsTo rather than
  // the route's parent params (per the 'derived state on model'
  // convention used elsewhere in this app).
  @action
  afterSave(question) {
    this.router.transitionTo(
      'job-posts.show.questions.show',
      question.belongsTo('jobPost').id(),
      question.id,
    );
  }
}
