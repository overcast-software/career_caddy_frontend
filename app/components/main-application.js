import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class MainApplicationComponent extends Component {
  @service router;
  @tracked sidebarOpen = true;

  constructor(owner, args) {
    super(owner, args);
    this.router.on('routeDidChange', this, this._onRouteChange);
  }

  willDestroy() {
    super.willDestroy();
    this.router.off('routeDidChange', this, this._onRouteChange);
  }

  _onRouteChange(transition) {
    // Skip initial load (transition.from is null); close on all subsequent navigation.
    // This ensures the mobile sidebar overlay closes on mobile Firefox where touch
    // events on <LinkTo> anchors may not reliably fire click handlers.
    if (transition.from) {
      this.sidebarOpen = false;
    }
  }

  @action
  toggle() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  @action
  close() {
    this.sidebarOpen = false;
  }
}
