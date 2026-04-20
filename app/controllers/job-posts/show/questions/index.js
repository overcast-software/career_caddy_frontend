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

  @action answerSaved() {
    // Collapse the inline editor and stay on the list — the user was
    // inline-answering here deliberately, routing away to the answer
    // show page defeats the point of the inline affordance.
    this.answeringQuestionId = null;
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
    // Stay inside the job-posts.show subtree rather than jumping out
    // to the global /questions/:id/edit form.
    this.router.transitionTo(
      'job-posts.show.questions.edit',
      question.belongsTo('jobPost').id(),
      question.id,
    );
  }
}
