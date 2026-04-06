import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class CoverLettersNewController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;

  @tracked selectedResume = CAREER_DATA_OPTION;

  get resumeOptions() {
    const resumes = this.store.peekAll('resume');
    if (!resumes?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(resumes)];
  }

  get jobPosts() {
    return this.store.peekAll('job-post');
  }

  @action updateResume(resume) {
    this.selectedResume = resume;
    this.model.resume = this.store.peekRecord('resume', resume.id);
  }

  @action addJobPostToCoverLetter(jobPost) {
    this.model.jobPost = jobPost;
  }

  @action saveCoverLetter() {
    if (this.model.isSaving) return;
    const resumeId = this.selectedResume?.id;
    this.model.resume = this.store.peekRecord('resume', resumeId);
    this.spinner.wrap(
      this.model
        .save()
        .then((cl) => this.router.transitionTo('cover-letters.show', cl))
        .then(() => this.flashMessages.success('Cover letter created'))
        .catch((error) => this.flashMessages.danger(error)),
    );
  }
}
