import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class CoverLettersShowRoute extends Route {
  @service store;

  async model({ cover_letter_id }) {
    return this.store.findRecord('cover-letter', cover_letter_id);
  }
}
