import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class JobPostsControlsComponent extends Component {
  @tracked query = this.args.query ?? '';
  @tracked compact = this.args.compact ?? false;

  @action
  updateQuery(event) {
    this.query = event.target.value;
    this.args.onFilterChange?.({ query: this.query });
  }

  @action
  toggleCompact() {
    this.compact = !this.compact;
    this.args.onCompactToggle?.(this.compact);
  }
}
