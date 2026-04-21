import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class ChatPanelComponent extends Component {
  @service chat;

  @tracked inputText = '';

  get messages() {
    return this.chat.messages;
  }

  get isStreaming() {
    return this.chat.isStreaming;
  }

  _scrollToBottom() {
    requestAnimationFrame(() => {
      const el = document.getElementById('chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  @action
  updateInput(event) {
    this.inputText = event.target.value;
  }

  @action
  handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  @action
  async send() {
    const text = this.inputText.trim();
    if (!text) return;
    this.inputText = '';
    this._scrollToBottom();
    document.getElementById('chat-input')?.focus();
    await this.chat.sendMessage(text);
    this._scrollToBottom();
    document.getElementById('chat-input')?.focus();
  }

  @action
  clearChat() {
    this.chat.clearConversation();
  }

  @action
  toggleSmartModel() {
    this.chat.smartModel = !this.chat.smartModel;
  }

  @action
  closePanel() {
    this.chat.sidebarOpen = false;
  }
}
