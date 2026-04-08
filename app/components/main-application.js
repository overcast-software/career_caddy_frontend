import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class MainApplicationComponent extends Component {
  @tracked sidebarOpen = true;

  @action
  toggle() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  @action
  close() {
    this.sidebarOpen = false;
  }

}
