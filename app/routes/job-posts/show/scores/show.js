import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScoresShowRoute extends Route {
  @service store;

  model({ score_id }) {
    return this.store.findRecord('score', score_id);
  }
}
