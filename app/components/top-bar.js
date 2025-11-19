import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class TopBarComponent extends Component {
  @service session;
  @service flashMessages;
  @service router;

  @action honk() {
    console.log('honk');
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
    console.log(Object.keys(this.session));
    await this.session.invalidateSession();
    this.router.transitionTo('login');
  }
}
