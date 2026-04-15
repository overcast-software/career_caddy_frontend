import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsNewRoute extends Route {
  @service store;

  async model() {
    const { application_id } = this.paramsFor('job-applications.show');
    const jobApplication = this.store.peekRecord(
      'job-application',
      application_id,
    );
    const jobPostId = jobApplication?.get('jobPost.id');
    const jobPost = jobPostId
      ? this.store.peekRecord('job-post', jobPostId)
      : null;
    const companyId = jobPost?.get('company.id');
    const company = companyId
      ? this.store.peekRecord('company', companyId)
      : null;
    const question = this.store.createRecord('question', {
      jobApplication,
      jobPost,
      company,
    });

    return { question, jobApplication };
  }
}
