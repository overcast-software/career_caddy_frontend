import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsShowAnswersShowRoute extends Route {
  @service store;

  async model({ answer_id }) {
    const { application_id } = this.paramsFor('job-applications.show');
    const { question_id } = this.paramsFor('job-applications.show.questions.show');
    const jobApplication = this.store.peekRecord('job-application', application_id);
    const question = this.store.peekRecord('question', question_id);
    const answer = await this.store.findRecord('answer', answer_id);
    return { answer, jobApplication, question };
  }
}
