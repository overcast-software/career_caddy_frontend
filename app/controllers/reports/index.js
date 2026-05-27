import Controller from '@ember/controller';
import { service } from '@ember/service';

export default class ReportsIndexController extends Controller {
  @service currentUser;

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }
}
