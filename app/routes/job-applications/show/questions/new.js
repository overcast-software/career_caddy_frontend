import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsNewRoute extends Route {
  @service store;

  async model() {
    const { application_id } = this.paramsFor('job-applications.show');
    const jobApplication = this.store.peekRecord('job-application', application_id);
    
    // Create the question and attach it to the job-application
    const question = this.store.createRecord('question', {
      jobApplication: jobApplication,
      company: jobApplication.get('jobPost.company')
    });
    
    return question;
  }
}
