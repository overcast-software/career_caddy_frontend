import Route from '@ember/routing/route';

export default class CompaniesShowJobApplicationsRoute extends Route {
  async model() {
    const company = this.modelFor('companies.show');
    await company.jobApplications;
    return company.sortedJobApplications;
  }
}
