import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CompaniesEditController extends Controller {
  @service flashMessages;
  @service router;

  @action
  async deleteCompany() {
    if (!confirm(`Delete ${this.model.name}?`)) return;
    await this.model.destroyRecord();
    this.flashMessages.success('Company deleted.');
    this.router.transitionTo('companies.index');
  }
}
