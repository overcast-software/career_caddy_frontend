import Controller from '@ember/controller';
import { action } from '@ember/object';

export default class QuestionsShowAnswersIndexController extends Controller {
  // On this route the model IS the question's answers ManyArray
  // (see routes/questions/show/answers/index.js:model), so the
  // splice is direct — no hasMany() resolution dance needed.
  @action removeAnswer(answer) {
    this.model?.removeObject(answer);
  }
}
