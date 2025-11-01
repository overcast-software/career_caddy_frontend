import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SummariesIndexRoute extends Route {
  @service store;
  @service currentUser;

  model() {
    this.store.findAll('job-post', { created_by: this.currentUser.user });
    return this.currentUser.user.summaries;
  }
}
