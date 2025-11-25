import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CoverLettersNewRoute extends Route {
  @service store;

  model() {
    this.store.findAll('job-post')
    this.store.findAll('company')
    return this.store.createRecord('cover-letter');
  }
}
