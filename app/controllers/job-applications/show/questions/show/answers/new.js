import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobApplicationsShowQuestionsShowAnswersNewController extends Controller {
  @service router;
  @service store;

  @action onSave() {
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
}
