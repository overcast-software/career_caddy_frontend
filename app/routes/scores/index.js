import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { infinityModel } from '../../utils/list-model';

export default class ScoresIndexRoute extends Route {
  @service infinity;
  @service store;

  model() {
    this.store.query('resume', { slim: 1 });
    return infinityModel(this, 'score', {
      perPage: 20,
      sort: '-created_at',
      include: 'job-post',
    });
  }
}
