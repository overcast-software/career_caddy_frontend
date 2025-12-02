import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
export default class JobPostsActions extends Component {
  @service store;
  @service router;
  @service currentUser;
  @service router;
  @service flashMessages;
  @tracked selectedResume = null;
  @tracked coverLetterInProgress = false;
  @action updateResume(resume) {
    this.args.resumeCallback?.(resume);
    this.selectedResume = resume;
  }

  @action
  async createSummary() {
    debugger;
    const jobPost = this.jobPost ?? this.args.jobPost;
    const resumeId = this.selectedResume.id;

    const resume = this.store.peekRecord('resume', resumeId);
    const summary = this.store.createRecord('summary', { resume, jobPost });
    summary
      .save()
      .then((summary) => this.router.transitionTo('summaries.show', summary.id))
      .catch(this.flashMessages.danger('failed to create summary'));
  }
  @action
  createCoverLetter() {
    const jobPost = this.args.jobPost;
    const resumeId = this.selectedResume.id;
    let resume = this.store.peekRecord('resume', resumeId);
    const newCoverLetter = this.store.createRecord('cover-letter', {
      resume,
      jobPost,
    });
    this.flashMessages.info('creating new cover letter');
    newCoverLetter
      .save()
      .then((cl)=> this.router.transitionTo('cover-letters.show', cl))
      .then(() => this.flashMessages.success('Cover letter created'))
      .catch((error) => console.log(error) & this.flashMessages.alert(error));
  }

  @action
  async scoreResume() {
    const jobPost = this.args.jobPost;
    const user = this.currentUser.user;
    const resumeId = this.selectedResume.id;

    let resume = this.store.peekRecord('resume', resumeId);
    const newScore = this.store.createRecord('score', {
      resume,
      jobPost,
      user,
    });

    try {
      //like summary above.  score is missing the content and
      //api will reach out to chatgpt to fill it in using user
      newScore.save();
    } catch (e) {
      this.flashMessages.danger(e);
    }
  }

  @action
  goToApply() {
    const queryParams = { jobId: this.args.jobPost.id };

    // Add coverLetterId and resumeId to queryParams if they are populated
    if (this.selectedResumeId) {
      queryParams.resumeId = this.selectedResumeId;
    }

    // Assuming you have a tracked property or method to get cover letter ID
    const coverLetterId =
      this.selectedCoverLetterId || this.getSelectedCoverLetterId();

    if (coverLetterId) {
      queryParams.coverLetterId = coverLetterId;
    }

    this.router.transitionTo('job-applications.new', { queryParams });
  }
}
