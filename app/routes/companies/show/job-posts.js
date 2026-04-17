import Route from '@ember/routing/route';

export default class CompaniesShowJobPostsRoute extends Route {
  async model() {
    const company = this.modelFor('companies.show');
    await company.jobPosts;
    return company.sortedJobPosts;
  }
}
