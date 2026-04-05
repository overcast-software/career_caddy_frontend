import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JobApplicationsIndexController extends Controller {
  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching = false;

  #debounceTimer = null;

  @action
  onSearchInput(event) {
    const value = event.target.value;
    this.isSearching = true;
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.search = value;
    }, 300);
  }

  @action
  removeApplication(application) {
    this.model.content.removeObject(application);
  }
}
