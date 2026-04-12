import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CoverLettersIndexRoute extends Route {
  @service store;

  model() {
    this.store.query('resume', { slim: 1 });
    return this.store.findAll('cover-letter', { include: 'job-post' });
  }
}
