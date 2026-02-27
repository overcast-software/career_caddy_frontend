import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
export default class TopBarComponent extends Component {
  @tracked open = false;
  @service session;
  @service flashMessages;
  @service router;

  @action
  toggle() {
    this.open = !this.open;
  }

  @action
  close() {
    this.open = false;
  }
  @action honk() {
    // I'm here to test flash messages
    this.flashMessages.success('honk', {
      showProgress: true,
      sticky: true,
    });
  }

  get loading() {
    return this.loadingStatus.loading;
  }

  get authed() {
    return this.session.isAuthenticated;
  }

  @action async invalidateSession() {
    this.session
      .invalidate()
      .then(this.flashMessages.success('Successfully logged out.'))
      .then(() => {
        this.router.transitionTo('index');
      });
  }
}
