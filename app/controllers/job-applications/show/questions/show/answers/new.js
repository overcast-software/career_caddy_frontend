import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class JobApplicationsShowQuestionsShowAnswersNewController extends Controller {
  @service router;

  @action onSave(answer) {
    this.router.transitionTo(
      'job-applications.show.questions.show.answers.show',
      this.model.jobApplication.id,
      this.model.question.id,
      answer.id,
    );
  }
}
