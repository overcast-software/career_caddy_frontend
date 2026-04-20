import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ChatSidebarComponent extends Component {
  @service chat;
  @service router;

  // Suppress the drawer/sidebar panel on /caddy — the full-page route
  // already renders <Chat::Panel> in its main area, and showing a
  // second one as a sidebar (or mobile bottom sheet) produces a giant
  // overlay covering the page.
  get isOnCaddyRoute() {
    return this.router.currentRouteName === 'caddy';
  }

  get isOpen() {
    return this.chat.sidebarOpen && !this.isOnCaddyRoute;
  }

  @action
  toggle() {
    this.chat.sidebarOpen = !this.chat.sidebarOpen;
    if (this.chat.sidebarOpen && this.args.onOpen) {
      this.args.onOpen();
    }
  }

  @action
  close() {
    this.chat.sidebarOpen = false;
  }
}
