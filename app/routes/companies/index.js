import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CompaniesIndexRoute extends Route {
  @service store;

  async model() {
    return  this.store.findAll('company', {include: 'job-post,job-application'})
  }
}
