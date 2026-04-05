import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

const CAREER_DATA_OPTION = { id: '0', name: 'Career Data (internal)' };

export default class JobPostsActions extends Component {
  @service store;
  @service router;
  @service currentUser;
  @service spinner;
  @service flashMessages;
  @tracked selectedResume = CAREER_DATA_OPTION;

  get resumeOptions() {
    const resumes = this.args.resumes;
    // Read .length to establish a tracking dependency on the RecordArray's contents.
    // Without this, Glimmer won't re-run this getter when findAll resolves.
    if (!resumes?.length) return [CAREER_DATA_OPTION];
    return [CAREER_DATA_OPTION, ...Array.from(resumes)];
  }

  get isCareerDataSelected() {
    return this.selectedResume?.id === '0';
  }

  @tracked coverLetterInProgress = false;

  @action updateResume(resume) {
    this.args.resumeCallback?.(resume);
    this.selectedResume = resume;
  }

  @action
  async createSummary() {
    const jobPost = this.jobPost ?? this.args.jobPost;
    const resumeId = this.selectedResume.id;

    const resume = this.store.peekRecord('resume', resumeId);
    const summary = this.store.createRecord('summary', { resume, jobPost });

    this.spinner.wrap(
      summary
        .save()
        .then((summary) =>
          this.router.transitionTo('summaries.show', summary.id),
        )
        .catch(this.flashMessages.danger('failed to create summary')),
    );
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

    this.spinner.wrap(
      newCoverLetter
        .save()
        .then((cl) => this.router.transitionTo('cover-letters.show', cl))
        .then(() => this.flashMessages.success('Cover letter created'))
        .catch((error) => console.log(error) & this.flashMessages.alert(error)),
    );
  }

  @action
  async createScrape() {
    const jobPost = this.args.jobPost;
    const url = jobPost.link ?? '';
    const scrape = this.store.createRecord('scrape', { jobPost, url });
    try {
      const saved = await this.spinner.wrap(scrape.save(), {
        label: 'Creating scrape…',
      });
      this.router.transitionTo('scrapes.show', saved.id);
    } catch {
      scrape.unloadRecord();
      this.flashMessages.danger('Failed to create scrape.');
    }
  }

  @action
  async scoreResume() {
    const jobPost = this.args.jobPost;
    const user = this.currentUser.user;
    const resume = this.store.peekRecord('resume', this.selectedResume.id);

    const newScore = this.store.createRecord('score', {
      resume,
      jobPost,
      user,
    });
    try {
      await this.spinner.wrap(newScore.save(), {
        label: 'Scoring, please wait…',
      });
      this.router.transitionTo('job-posts.show.scores', jobPost);
    } catch (e) {
      newScore.unloadRecord();
      this.flashMessages.danger(
        e?.errors?.[0]?.detail ?? 'Failed to create score.',
      );
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
