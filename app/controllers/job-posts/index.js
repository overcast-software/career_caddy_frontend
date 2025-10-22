import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JobPostsIndexController extends Controller {
  @tracked query = '';
  @tracked compact = false;

  @action
  onFilterChange({ query }) {
    this.query = query ?? '';
  }

  @action
  onCompactToggle(compact) {
    this.compact = !!compact;
  }
}
