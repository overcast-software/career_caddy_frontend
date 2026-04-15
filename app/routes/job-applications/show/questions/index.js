import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsIndexRoute extends Route {
  @service store;

  async model() {
    const { application_id } = this.paramsFor('job-applications.show');
    return await this.store.query('question', {
      'filter[application_id]': application_id,
      include: 'answers',
    });
  }
}
