import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class FavoritesRoute extends Route {
  @service store;

  async model() {
    const [answers, coverLetters, resumes] = await Promise.all([
      this.store.findAll('answer'),
      this.store.findAll('cover-letter'),
      this.store.findAll('resume'),
    ]);

    return {
      answers,
      coverLetters,
      resumes,
    };
  }
}
