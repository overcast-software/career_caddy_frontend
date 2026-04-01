import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsIndexController extends Controller {
  queryParams = ['search'];

  @tracked search = '';
  @tracked compact = true;
  @tracked isSearching = false;
  @service flashMessages;

  @action
  onFilterChange({ query }) {
    this.search = query ?? '';
    this.isSearching = true;
  }

  @action
  onCompactToggle(compact) {
    this.compact = !!compact;
  }
}
