import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScoresIndexRoute extends Route {
  @service infinity;
  @service store;

  model() {
    this.store.query('resume', { slim: 1 });
    return this.infinity.model('score', {
      perPage: 20,
      sort: '-created_at',
      include: 'job-post',
    });
  }
}
