import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class TopBarComponent extends Component {
  @tracked open = false;
  @service session;
  @service store;
  @service currentUser;
  @service flashMessages;
  @service router;

  @action toggle() {
    this.open = !this.open;
  }

  @action close() {
    this.open = false;
  }

  @action async invalidateSession() {
    await this.session.invalidate();
    this.store.unloadAll();
    this.flashMessages.success('Successfully logged out.');
  }

  get onClose() {
    return this.args.onClose ?? (() => {});
  }
}
