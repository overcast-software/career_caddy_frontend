import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class PanelNavigation extends Component {
  @action leftAction() {
    this.args.left();
  }
  @action rightAction() {
    this.args.right();
  }
  @action upAction() {
    this.args.up();
  }
  @action downAction() {
    this.args.down();
  }
}
