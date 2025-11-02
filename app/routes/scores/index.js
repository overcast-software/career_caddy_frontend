import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScoresIndexRoute extends Route {
  @service store;
  @service currentUser;

  async model() {
    return await this.currentUser.user.scores
  }
}
