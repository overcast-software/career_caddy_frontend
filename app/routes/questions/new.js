import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class QuestionsNewRoute extends Route {
  @service store;

  queryParams = {
    companyId: { refreshModel: true },
    jobPostId: { refreshModel: true },
    jobApplicationId: { refreshModel: true },
  };

  async model(params) {
    const question = this.store.createRecord('question');

    if (params.companyId) {
      const company = this.store.peekRecord('company', params.companyId);
      if (company) {
        question.company = company;
      }
    }
    if (params.jobPostId) {
      const jobPost = this.store.peekRecord('job-post', params.jobPostId);
      if (jobPost) {
        question.jobPost = jobPost;
      }
    }
    if (params.jobApplicationId) {
      const jobApp = this.store.peekRecord(
        'job-application',
        params.jobApplicationId,
      );
      if (jobApp) {
        question.jobApplication = jobApp;
      }
    }

    return question;
  }
}
