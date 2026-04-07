import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsIndexRoute extends Route {
  @service store;

  async model() {
    const { application_id } = this.paramsFor('job-applications.show');
    const jobApplication = await this.store.findRecord(
      'job-application',
      application_id,
      { include: 'questions,questions.answers' },
    );
    return { jobApplication, questions: await jobApplication.questions };
  }
}
