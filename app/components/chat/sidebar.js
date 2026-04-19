import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class ChatSidebarComponent extends Component {
  @service chat;

  get isOpen() {
    return this.chat.sidebarOpen;
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
