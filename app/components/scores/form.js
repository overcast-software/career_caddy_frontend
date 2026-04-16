import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class ScoresFormComponent extends Component {
  @service store;
  @service router;
  @service flashMessages;

  @tracked selectedCompany = null;
  @tracked selectedJobPost = null;
  @tracked selectedResume = null;
  @tracked _score = '';
  @tracked _explanation = '';
  @tracked _instructions = '';
  @tracked companies = [];
  @tracked resumes = [];

  constructor() {
    super(...arguments);
    this._loadData();
  }

  async _loadData() {
    const [companies, resumes] = await Promise.all([
      this.store.findAll('company', { include: 'job-posts' }),
      this.store.findAll('resume'),
    ]);
    this.companies = companies;
    this.resumes = resumes;

    // Pre-populate for edit
    const score = this.args.score;
    if (score?.id) {
      this.selectedCompany = await score.company;
      this.selectedJobPost = await score.jobPost;
      this.selectedResume = await score.resume;
      this._score = score.score ?? '';
      this._explanation = score.explanation ?? '';
    }
  }

  get jobPosts() {
    if (!this.selectedCompany) return [];
    const companyId = this.selectedCompany.id;
    return this.store
      .peekAll('job-post')
      .filter((jp) => jp.company?.get('id') === companyId);
  }

  get score() {
    return this._score;
  }

  get explanation() {
    return this._explanation;
  }

  @action
  updateCompany(company) {
    this.selectedCompany = company;
    this.selectedJobPost = null;
  }

  @action
  updateJobPost(jobPost) {
    this.selectedJobPost = jobPost;
  }

  @action
  updateResume(resume) {
    this.selectedResume = resume;
  }

  @action
  updateScore(event) {
    this._score = event.target.value;
  }

  @action
  updateExplanation(event) {
    this._explanation = event.target.value;
  }

  @action
  updateInstructions(event) {
    this._instructions = event.target.value;
  }

  get instructions() {
    return this._instructions;
  }

  @action
  saveScore(event) {
    event.preventDefault();

    if (!this.selectedJobPost) {
      this.flashMessages.warning('Please select a job post.');
      return;
    }

    const score = this.args.score;
    score.jobPost = this.selectedJobPost;
    score.resume = this.selectedResume;
    score.score = this._score ? Number(this._score) : null;
    score.explanation = this._explanation || null;
    score.instructions = this._instructions || null;

    score
      .save()
      .then((saved) => {
        this.flashMessages.success('Score saved.');
        this.router.transitionTo('scores.show', saved.id);
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to save score.');
        }
      });
  }
}
