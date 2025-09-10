import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class CoverLettersEditRoute extends Route {
  @service store;

  model({ cover_letter_id }) {
    return this.store.findRecord('cover-letter', cover_letter_id);
  }
}
