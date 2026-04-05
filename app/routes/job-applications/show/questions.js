import Route from '@ember/routing/route';

export default class JobApplicationsShowQuestionsRoute extends Route {
  async model() {
    const application = this.modelFor('job-applications.show');
    return await application.questions;
  }
}
