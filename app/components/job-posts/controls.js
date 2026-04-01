import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JobPostsControlsComponent extends Component {
  @tracked query = this.args.query ?? '';
  @tracked compact = this.args.compact ?? false;

  #debounceTimer = null;

  @action
  updateQuery(event) {
    const value = event.target.value;
    this.query = value;
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.args.onFilterChange?.({ query: value });
    }, 300);
  }

  @action
  toggleCompact() {
    this.compact = !this.compact;
    this.args.onCompactToggle?.(this.compact);
  }
}
