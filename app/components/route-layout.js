import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class RouteLayoutComponent extends Component {
  @service currentUser;
  @service spinner;
  @service router;

  get subnavPortal() {
    return document.getElementById('subnav-portal');
  }

  get routeKey() {
    return this.router.currentRouteName;
  }
}
