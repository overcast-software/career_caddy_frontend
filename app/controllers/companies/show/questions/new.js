import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsNewController extends Controller {
  @service router;

  // Save handler passed to <Questions::Form>. The shared form defaults
  // to /questions/:id on save; from this route we want to land on the
  // question under the company — same segment the user was exploring.
  @action
  afterSave(question) {
    this.router.transitionTo(
      'companies.show.questions.show',
      question.belongsTo('company').id(),
      question.id,
    );
  }
}
