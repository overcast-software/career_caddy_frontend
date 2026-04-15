import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobPostsShowQuestionsShowController extends Controller {
  @service router;
  @service flashMessages;
  @service store;

  get showAnswersList() {
    const route = this.router.currentRouteName;
    return (
      route === 'job-posts.show.questions.show' ||
      route === 'job-posts.show.questions.show.index'
    );
  }

  @action onAnswerSave() {
    this.store.findRecord('question', this.model.question.id, {
      include: 'answers',
      reload: true,
    });
    this.router.transitionTo(
      'job-posts.show.questions.show',
      this.model.jobPost,
      this.model.question,
    );
  }

  @action async deleteAnswer(answer) {
    if (!window.confirm('Delete this answer?')) return;
    try {
      await answer.destroyRecord();
      this.flashMessages.success('Answer deleted.');
      await this.store.findRecord('question', this.model.question.id, {
        include: 'answers',
        reload: true,
      });
    } catch {
      this.flashMessages.danger('Failed to delete answer.');
    }
  }
}
