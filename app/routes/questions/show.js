import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class QuestionsShowRoute extends Route {
  @service store;
  @service router;
  @service flashMessages;
  async model({ question_id }) {
    return this.store.findRecord('question', question_id, {
      include: 'answers',
    });
  }

  // Matches routes/job-posts/show.js pattern — surface a soft flash
  // and land the user back on the list rather than the raw error page.
  error() {
    this.flashMessages.danger('Question not found.');
    this.router.transitionTo('questions.index');
    return false;
  }
}
