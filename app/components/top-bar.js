import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class TopBarComponent extends Component {
  @service session;
  @service flashMessages;
  @service router;

  @action honk() {
    console.log('honk');
    console.log(this.loadingStatus.loading);
    this.flashMessages.alert('honk', {
      showProgress: true,
      sticky: true,
    });
  }

  get loading() {
    console.log('loading', this.loadingStatus.loading);
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
