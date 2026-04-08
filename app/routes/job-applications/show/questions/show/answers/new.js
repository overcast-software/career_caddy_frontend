import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsShowAnswersNewRoute extends Route {
  @service store;

  model() {
    const { application_id } = this.paramsFor('job-applications.show');
    const { question_id } = this.paramsFor(
      'job-applications.show.questions.show',
    );
    const jobApplication = this.store.peekRecord(
      'job-application',
      application_id,
    );
    const question = this.store.peekRecord('question', question_id);
    return {
      answer: this.store.createRecord('answer', { question }),
      jobApplication,
      question,
    };
  }
}
