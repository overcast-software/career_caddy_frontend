import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';
export default class JobPostsEditController extends Controller {
  @service store;

  get companies() {
    return this.store.findAll('company');
  }

  @action addCompanyToJobPost(company) {
    debugger;
    this.model.company = company;
  }
}
