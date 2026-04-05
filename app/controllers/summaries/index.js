import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class SummariesIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
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
}
