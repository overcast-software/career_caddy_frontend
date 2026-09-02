import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsShowRoute extends Route {
  @service store;

  async model({ question_id }) {
    return this.store.findRecord('question', question_id, {
      include: 'answers',
    });
  }

  // CC-121: the `error()` action that used to live here flashed "Question not
  // found." and redirected to questions.index with `return false`. That
  // `return false` swallowed the error, so the app-level `error` substate
  // (app/templates/error.hbs) could never fire for this subtree — and it made
  // questions behave differently from every other show route, which now stays
  // on the URL and renders the substate with chrome intact. Removed on
  // purpose; do not reintroduce it. `router` / `flashMessages` went with it,
  // as nothing else in this route used them.
}
