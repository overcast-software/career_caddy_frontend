import Controller from '@ember/controller';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobApplicationsShowQuestionsShowController extends Controller {
  @service router;

  get showAnswersList() {
    const route = this.router.currentRouteName;
    return (
      route === 'job-applications.show.questions.show' ||
      route === 'job-applications.show.questions.show.index'
    );
  }

  @action removeAnswer(answer) {
    this.model.hasMany('answers').value()?.removeObject(answer);
  }
}
