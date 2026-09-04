import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class CoverLettersNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;

  // No selection = use Career Data (the placeholder says so). Matches
  // scores/form and every other resume picker; "Career Data" is the empty
  // state, not a synthetic entry mixed into the resume list.
  @tracked selectedResume = null;
  @tracked instructions = '';

  get resumeOptions() {
    return Array.from(this.store.peekAll('resume'));
  }

  get jobPosts() {
    return this.store.peekAll('job-post');
  }

  @action updateResume(resume) {
    this.selectedResume = resume;
    this.model.resume = resume ?? null;
  }

  @action addJobPostToCoverLetter(jobPost) {
    this.model.jobPost = jobPost;
  }

  @action updateInstructions(event) {
    this.instructions = event.target.value;
  }

  @action cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo('cover-letters');
  }

  @action saveCoverLetter() {
    if (this.model.isSaving) return;
    this.model.resume = this.selectedResume ?? null;
    this.model.instructions = this.instructions;
    this.spinner.wrap(
      this.model
        .save()
        .then((cl) => this.router.transitionTo('cover-letters.show', cl))
        .then(() => this.flashMessages.success('Cover letter created'))
        .catch((error) => this.flashMessages.danger(error)),
    );
  }
}
