import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class CompaniesIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
  @service store;
  @tracked search = '';
  @tracked isSearching = false;

  @action updateSearch(value) { this.search = value; this.isSearching = false; }
  @action startSearching() { this.isSearching = true; }

  @action async deleteCompany(company) {
    const name = company.name;
    try {
      await company.destroyRecord();
      this.flashMessages.success(`deleted ${name}`);
    } catch {
      this.flashMessages.danger('Failed to delete company');
    }
  }
}
