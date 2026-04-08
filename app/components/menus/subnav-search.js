import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class MenusSubnavSearchComponent extends Component {
  @tracked inputValue = this.args.value ?? '';
  #debounceTimer = null;

  @action
  onInput(event) {
    const value = event.target.value;
    this.inputValue = value;
    this.args.onSearchStart?.();
    clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.args.onSearch(value);
    }, 300);
  }
}
