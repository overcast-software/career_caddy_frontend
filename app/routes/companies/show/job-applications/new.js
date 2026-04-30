import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesShowJobApplicationsNewRoute extends Route {
  @service store;

  async model() {
    const company = this.modelFor('companies.show');
    await company.jobPosts;
    await this.store.query('resume', { slim: 1 });
    this.store.findAll('cover-letter');
    return this.store.createRecord('job-application', {
      company,
      status: 'Applied',
      appliedAt: new Date(),
    });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    const company = this.modelFor('companies.show');
    controller.company = company;
    controller.jobPostOptions = company.sortedJobPosts ?? company.jobPosts;
  }
}
