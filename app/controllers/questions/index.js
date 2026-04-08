import Controller from '@ember/controller';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class QuestionsIndexController extends Controller {
  queryParams = ['search'];

  @service flashMessages;
  @tracked search = '';
  @tracked isSearching = false;

  @action updateSearch(value) {
    this.search = value;
    this.isSearching = false;
  }
  @action startSearching() {
    this.isSearching = true;
  }
}
