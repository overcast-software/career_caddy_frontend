import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class MainApplicationComponent extends Component {
  @service currentUser;
  @service chat;
  @service router;
  @service spinner;
  @tracked sidebarOpen = true;

  constructor(owner, args) {
    super(owner, args);
    this.chat.currentPage = {
      route: this.router.currentRouteName,
      url: this.router.currentURL,
      params: {},
    };
    this.router.on('routeDidChange', this, this._onRouteChange);
  }

  willDestroy() {
    super.willDestroy();
    this.router.off('routeDidChange', this, this._onRouteChange);
  }

  _onRouteChange(transition) {
    // Close sidebar on navigation for mobile only. On wide viewports (≥768px)
    // the persistent sidebar stays open — closing it on every click is jarring.
    if (transition.from && window.innerWidth < 768) {
      this.sidebarOpen = false;
    }

    if (transition.to) {
      this.chat.currentPage = {
        route: transition.to.name,
        url: this.router.currentURL,
        params: transition.to.params,
      };
      console.log('[page-context]', transition.to.name, this.router.currentURL);
    }
  }

  @action
  toggle() {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebarOpen) {
      this.chat.sidebarOpen = false;
    }
  }

  @action
  close() {
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
    }
  }

  @action
  closeSidebarForChat() {
    this.sidebarOpen = false;
  }

  @action
  toggleChat() {
    this.chat.sidebarOpen = !this.chat.sidebarOpen;
    if (this.chat.sidebarOpen) {
      this.sidebarOpen = false;
    }
  }
}
