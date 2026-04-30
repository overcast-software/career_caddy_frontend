import Route from '@ember/routing/route';

export default class CompaniesShowAnswersRoute extends Route {
  async model() {
    const company = this.modelFor('companies.show');
    return await company.questions;
  }
}
