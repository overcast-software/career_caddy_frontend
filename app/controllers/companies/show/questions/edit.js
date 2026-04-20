import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsEditController extends Controller {
  @service router;

  // Keep the user in the companies.show subtree — the shared form
  // otherwise falls through to the global questions.show redirect.
  @action
  afterSave(question) {
    this.router.transitionTo(
      'companies.show.questions.show',
      question.belongsTo('company').id(),
      question.id,
    );
  }
}
