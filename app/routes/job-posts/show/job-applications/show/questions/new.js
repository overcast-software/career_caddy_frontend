import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowJobApplicationsShowQuestionsNewRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const { job_application_id } = this.paramsFor('job-posts.show.job-applications.show');
    const jobApplication = this.store.peekRecord('job-application', job_application_id);
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    
    // Create the question and attach it to the existing job-application
    const question = this.store.createRecord('question', {
      jobApplication: jobApplication,
      company: jobPost.get('company')
    });
    
    return question;
  }
}
