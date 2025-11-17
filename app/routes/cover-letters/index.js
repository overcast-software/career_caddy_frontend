import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CoverLettersIndexRoute extends Route {
  @service store;

  model() {
    return this.store.findAll('cover-letter', {
      include: 'job-post,resume',
      reload: true,
    });
  }
}
