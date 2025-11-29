import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class TopBarComponent extends Component {
  @service session;
  @service flashMessages;
  @service router;

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
