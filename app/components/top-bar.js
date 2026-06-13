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
  @service spinner;

  @action toggle() {
    this.open = !this.open;
  }

  @action close() {
    this.open = false;
  }

  @action async invalidateSession() {
    // session.invalidate() → handleInvalidation does store.unloadAll +
    // events.stop + currentUser.user=null + transition. No need to
    // repeat any of that here.
    await this.session.invalidate();
    this.flashMessages.success('Signed out.');
  }

  get onClose() {
    return this.args.onClose ?? (() => {});
  }
}
