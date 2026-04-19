import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

const SIDEBAR_KEY = 'cc:sidebar-open';

export default class MainApplicationComponent extends Component {
  @service currentUser;
  @service chat;
  @service router;
  @service spinner;
  @tracked sidebarOpen = localStorage.getItem(SIDEBAR_KEY) === 'true';

  constructor(owner, args) {
    super(owner, args);
    this.chat.sidebarOpen = false;
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
    if (transition.from && window.innerWidth < 768) {
      this.sidebarOpen = false;
      localStorage.setItem(SIDEBAR_KEY, 'false');
    }

    if (transition.to) {
      this.chat.currentPage = {
        route: transition.to.name,
        url: this.router.currentURL,
        params: transition.to.params,
      };
    }
  }

  @action
  toggle() {
    this.sidebarOpen = !this.sidebarOpen;
    localStorage.setItem(SIDEBAR_KEY, this.sidebarOpen);
    if (this.sidebarOpen) {
      this.chat.sidebarOpen = false;
    }
  }

  @action
  close() {
    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
      localStorage.setItem(SIDEBAR_KEY, 'false');
    }
  }

  @action
  closeSidebarForChat() {
    this.sidebarOpen = false;
    localStorage.setItem(SIDEBAR_KEY, 'false');
  }

  @action
  toggleChat() {
    this.chat.sidebarOpen = !this.chat.sidebarOpen;
    if (this.chat.sidebarOpen) {
      this.sidebarOpen = false;
      localStorage.setItem(SIDEBAR_KEY, 'false');
      this.chat.markRead();
    }
  }
}
