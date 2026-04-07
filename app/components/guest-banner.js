import Component from '@glimmer/component';
import { service } from '@ember/service';

export default class GuestBannerComponent extends Component {
  @service currentUser;
}
