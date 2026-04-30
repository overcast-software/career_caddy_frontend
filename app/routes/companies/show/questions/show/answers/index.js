import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowQuestionsShowAnswersIndexRoute extends Route {
  @service router;

  redirect() {
    const { question_id } = this.paramsFor('companies.show.questions.show');
    this.router.replaceWith('companies.show.questions.show', question_id);
  }
}
