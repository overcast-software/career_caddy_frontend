import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class BuilderSectionComponent extends Component {
  @tracked _isOpen = null;

  get isOpen() {
    if (this._isOpen !== null) return this._isOpen;
    if (this.args.collapsible === false) return true;
    return !this.args.startCollapsed;
  }

  @action toggle() {
    if (this.args.collapsible === false) return;
    this._isOpen = !this.isOpen;
  }

  @action stopPropagation(event) {
    event.stopPropagation();
  }
}
