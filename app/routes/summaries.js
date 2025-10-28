import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SummariesRoute extends Route {
  @service store;

  model() {
    return this.store.query('summary', {include: 'job-post', sort: '-id'});
  }
}
