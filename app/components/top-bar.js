import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class TopBarComponent extends Component {
  @service session;
  @service flashMessages;
  @service router;

  @action honk() {
    console.log('honk');
    this.flashMessages.alert('honk', {
      showProgress: true,
      sticky: true,
    });
  }

  get authed() {
    return this.session.isAuthenticated;
  }
  @action async invalidateSession() {
    console.log(Object.keys(this.session))
    debugger
    await this.session.invalidateUser()
    this.router.transitionTo('login')

  }
}
