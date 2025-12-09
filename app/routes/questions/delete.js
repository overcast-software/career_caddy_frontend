import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class QuestionsDeleteRoute extends Route {
  @service store;
  @service router;
  @service flashMessages;

  async beforeModel() {
    const { question_id } = this.paramsFor('questions.delete');

    if (!question_id) {
      this.flashMessages?.warning?.('No question to delete.');
      return this.router.transitionTo('questions.index');
    }

    try {
      const question = await this.store.findRecord('question', question_id, { reload: true });
      await question.destroyRecord();
      this.flashMessages?.success?.('Question deleted.');
    } catch (e) {
      this.flashMessages?.danger?.('Failed to delete question.');
    }

    return this.router.transitionTo('questions.index');
  }
}
