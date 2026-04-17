import Route from '@ember/routing/route';

export default class CompaniesShowScrapesRoute extends Route {
  async model() {
    const company = this.modelFor('companies.show');
    return await company.scrapes;
  }
}
