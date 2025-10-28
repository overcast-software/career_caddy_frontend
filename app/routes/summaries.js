import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SummariesRoute extends Route {
  @service store;
  @service currentUser;

  model() {
    return this.currentUser.user.summaries
  }
}
