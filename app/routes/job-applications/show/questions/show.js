import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsShowRoute extends Route {
  @service store;

  async model({ question_id }) {
    const { application_id } = this.paramsFor('job-applications.show');
    const jobApplication = this.store.peekRecord('job-application', application_id);
    const question = await this.store.findRecord('question', question_id, {
      include: 'answers',
    });
    const answers = await question.answers;
    return { jobApplication, question, answers };
  }
}
