import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsNewRoute extends Route {
  @service store;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    
    // Create a templated job-application for this job-post
    const jobApplication = this.store.createRecord('job-application', {
      appliedAt: new Date(),
      status: 'interested',
      jobPost: jobPost
    });
    
    // Create the question and attach it to the job-application
    const question = this.store.createRecord('question', {
      jobApplication: jobApplication,
      company: jobPost.get('company')
    });
    
    return question;
  }
}
