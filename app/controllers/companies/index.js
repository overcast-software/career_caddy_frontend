import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class CompaniesIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
  @service store;
  @tracked search = '';
  @tracked searchInput = '';
  @tracked isSearching = false;

  #debounceTimer = null;

  @action
  onSearchInput(event) {
    const value = event.target.value;
    this.searchInput = value;
    this.isSearching = true;
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.search = value;
    }, 300);
  }

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
