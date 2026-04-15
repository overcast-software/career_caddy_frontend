import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class JobPostsShowQuestionsIndexController extends Controller {
  @service flashMessages;
  @service router;

  @tracked answeringQuestionId = null;

  @action startAnswering(question) {
    this.answeringQuestionId = question.id;
  }

  @action cancelAnswer() {
    this.answeringQuestionId = null;
  }

  @action answerComplete() {
    this.answeringQuestionId = null;
  }

  @action answerSaved(answer, question) {
    this.answeringQuestionId = null;
    const { job_post_id } = this.router.currentRoute.parent.parent.params;
    this.router.transitionTo(
      'job-posts.show.questions.show.answers.show',
      job_post_id,
      question.id,
      answer.id,
    );
  }

  @action deleteQuestion(question) {
    if (!window.confirm('Delete this question?')) return;
    question
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Question deleted.');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete question.');
        }
      });
  }

  @action editQuestion(question) {
    this.router.transitionTo('questions.edit', question);
  }
}
