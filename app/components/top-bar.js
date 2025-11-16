import Component from '@glimmer/component';
import { service } from '@ember/service';
export default class TopBarComponent extends Component {
  @service session
  get authed(){
    return this.session.isAuthenticated
  }
}
