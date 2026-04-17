import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class QuestionsShowController extends Controller {
  @service flashMessages;
  @service store;
  @service router;
  @service spinner;
  @action deleteQuestion() {
    if (!window.confirm('Delete this question?')) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Question deleted.');
        this.router.transitionTo('questions');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete question.');
        }
      });
  }
  get answers() {
    return this.model.answers;
  }

  @action newQuestion() {
    const jobAppId = this.model.get('jobApplication.id');
    if (jobAppId) {
      this.router.transitionTo('job-applications.show.questions.new', jobAppId);
      return;
    }
    const jobPostId = this.model.get('jobPost.id');
    if (jobPostId) {
      this.router.transitionTo('job-posts.show.questions.new', jobPostId);
      return;
    }
    const companyId = this.model.get('company.id');
    this.router.transitionTo('questions.new', {
      queryParams: {
        companyId: companyId ?? null,
        jobPostId: null,
        jobApplicationId: null,
      },
    });
  }

  @action askAI(question) {
    const answer = this.store.createRecord('answer', {
      question,
      ai_assist: true,
    });
    this.spinner.wrap(
      answer
        .save()
        .then((saved) =>
          this.router.transitionTo(
            'questions.show.answers.show',
            question.id,
            saved.id,
          ),
        )
        .catch(() => this.flashMessages.danger('Failed to create answer.')),
    );
  }
}
