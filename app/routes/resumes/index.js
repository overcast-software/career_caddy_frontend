import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ResumesIndexRoute extends Route {
  @service store;

  async model() {
    const resume = this.store.findAll('resume',  {
      include: 'user,skill,experience,education,certification,summary',
    });
    return resume
  }
}
