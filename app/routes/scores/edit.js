import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScoresEditRoute extends Route {
  @service store;

  model({ score_id }) {
    return this.store.findRecord('resume', score_id);
  }
}
