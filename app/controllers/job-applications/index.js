import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JobApplicationsIndexController extends Controller {
  queryParams = ['search'];

  @tracked search = '';
  @tracked isSearching = false;

  @action updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }
  @action startSearching() {
    this.isSearching = true;
  }

  @action
  removeApplication(application) {
    this.model.content.removeObject(application);
  }
}
