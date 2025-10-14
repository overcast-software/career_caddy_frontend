import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class PanelCardComponent extends Component {
  @tracked collapsed = false;

  constructor(owner, args) {
    super(owner, args);
    if ('startCollapsed' in (this.args ?? {})) {
      this.collapsed = !!this.args.startCollapsed;
    }
  }

  @action
  toggleCollapsed() {
    this.collapsed = !this.collapsed;
  }
}
