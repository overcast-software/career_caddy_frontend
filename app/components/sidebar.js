import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class SidebarComponent extends Component {
  @service currentUser;
  @service router;
  @service theme;

  get isDocsRoute() {
    return this.router.currentRouteName?.startsWith('docs');
  }
}
