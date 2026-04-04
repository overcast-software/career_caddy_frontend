import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsIndexController extends Controller {
  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching = false;
  @service flashMessages;

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
