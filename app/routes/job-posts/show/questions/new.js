import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowQuestionsNewRoute extends Route {
  @service store;
  @service router;

  async model() {
    const { job_post_id } = this.paramsFor('job-posts.show');
    const jobPost = this.store.peekRecord('job-post', job_post_id);
    
    // Create and save a templated job-application for this job-post
    const jobApplication = this.store.createRecord('job-application', {
      appliedAt: new Date(),
      status: 'interested',
      jobPost: jobPost
    });
    
    await jobApplication.save();
    
    // Redirect to the nested route
    this.router.transitionTo('job-posts.show.job-applications.show.questions.new', job_post_id, jobApplication.id);
  }
}
