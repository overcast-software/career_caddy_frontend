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
  @tracked selectedResumeId = null;
  @tracked coverLetterInProgress = false;
  @action
  onResumeChange(event) {
    this.selectedResumeId = event.target.value;
  }

  @action
  async createSummary() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    const user = this.currentUser.user;
    const resumeId = this.selectedResumeId;

    const resume = await this.store.peekRecord('resume', resumeId);
    const summary = await this.store.createRecord('summary', {
      resume,
      jobPost: jobPost,
      user,
    });

    try {
      // this action automatically sets the summary to the currently
      // selected resume.  Sometimes it's better to clone first.
      // the summary has no body so the api reaches out to chatgpt
      summary.save();
      this.router.transitionTo('summaries.index');
    } catch (e) {
      console.error('Failed to get or create summary', e);
    }
  }
  @action
  createCoverLetter() {
    const jobPost = this.args.jobPost;
    const user = this.currentUser.user;
    const resumeId = this.selectedResumeId;
    let resume = this.store.peekRecord('resume', resumeId);
    const newCoverLetter = this.store.createRecord('cover-letter', {
      resume,
      jobPost,
      user,
    });
    this.flashMessages.info('creating new cover letter');
    this.coverLetterInProgress = true;
    newCoverLetter
      .save()
      .then(() => {
        this.flashMessages.success('finished');
      })
      .catch((error) => console.log(error) & this.flashMessages.alert(error));
  }

  @action
  async scoreResume() {
    const jobPost = this.args.jobPost;
    const user = this.currentUser.user;
    const resumeId = this.selectedResumeId;

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
      console.error('Failed to create score', e);
    }
  }

  @action
  goToApply() {
    this.router.transitionTo('job-applications.new', {
      queryParams: { jobId: this.args.jobPost.id },
    });
  }
}
