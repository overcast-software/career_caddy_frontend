import Route from '@ember/routing/route';

export default class CompaniesShowScoresRoute extends Route {
  async model() {
    const company = this.modelFor('companies.show');
    return await company.scores;
  }
}
