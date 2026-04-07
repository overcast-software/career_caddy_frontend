import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobApplicationsShowQuestionsShowController extends Controller {
  @service router;
  @service flashMessages;
  @service store;

  @action onAnswerSave() {
    this.store.findRecord('question', this.model.question.id, {
      include: 'answers',
      reload: true,
    });
    this.router.transitionTo(
      'job-applications.show.questions.show',
      this.model.jobApplication,
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
