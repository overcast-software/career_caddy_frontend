import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class QuestionsFormComponent extends Component {
  @tracked selectedCompany = null;
  @tracked selectedJobPost = null;
  @tracked selectedJobAppOption = null;
  @tracked loadedJobPosts = [];
  @tracked loadedJobAppOptions = [];
  @tracked isLoadingRelated = false;

  @service store;
  @service flashMessages;
  @service router;

  constructor(owner, args) {
    super(owner, args);
    const q = args.question;
    // Pre-select company when passed directly (e.g. from company context)
    if (args.company) {
      this.selectedCompany = args.company;
      this._preloadCompanyRelated(args.company, q);
    }
    // Pre-select job post (and its company) when coming from a job post context
    if (args.jobPost) {
      this.selectedJobPost = args.jobPost;
      const company = args.jobPost.belongsTo('company').value();
      if (company) {
        this.selectedCompany = company;
        this._preloadCompanyRelated(company, q);
      }
    }
    if (q && !q.isNew) {
      const company = q.belongsTo('company').value();
      if (company) {
        this.selectedCompany = company;
        this._preloadCompanyRelated(company, q);
      }
      const jobPost = q.belongsTo('jobPost').value();
      if (jobPost) {
        this.selectedJobPost = jobPost;
        this.loadedJobPosts = [jobPost];
      }
      const jobApp = q.belongsTo('jobApplication').value();
      if (jobApp) {
        const jp = jobApp.belongsTo('jobPost').value();
        const label = jp
          ? `${jp.title} — ${jobApp.status}`
          : `Application #${jobApp.id} (${jobApp.status})`;
        this.selectedJobAppOption = { record: jobApp, label };
        this.loadedJobAppOptions = [this.selectedJobAppOption];
      }
    }
  }

  async _preloadCompanyRelated(company, question) {
    this.isLoadingRelated = true;
    try {
      const loaded = await this.store.findRecord('company', company.id, {
        include: 'job-posts,job-applications.job-post',
        reload: true,
      });
      const jobPosts = await loaded.jobPosts;
      this.loadedJobPosts = jobPosts.slice();

      const jobApps = await loaded.jobApplications;
      this.loadedJobAppOptions = jobApps.slice().map((ja) => {
        const jp = ja.belongsTo('jobPost').value();
        const label = jp
          ? `${jp.title} — ${ja.status}`
          : `Application #${ja.id} (${ja.status})`;
        return { record: ja, label };
      });

      // Re-align the selected job application to its full option object
      if (question) {
        const jobApp = question.belongsTo('jobApplication').value();
        if (jobApp) {
          this.selectedJobAppOption =
            this.loadedJobAppOptions.find(
              (opt) => opt.record.id === jobApp.id,
            ) ?? this.selectedJobAppOption;
        }
      }
    } finally {
      this.isLoadingRelated = false;
    }
  }

  get isEditing() {
    return this.args.question && !this.args.question.isNew;
  }

  get companies() {
    return this.store.peekAll('company');
  }

  get filteredJobAppOptions() {
    if (!this.selectedJobPost) return this.loadedJobAppOptions;
    return this.loadedJobAppOptions.filter(
      (opt) => opt.record.belongsTo('jobPost').id() === this.selectedJobPost.id,
    );
  }

  @action updateContent(event) {
    this.args.question.content = event.target.value;
  }

  @action async updateCompany(company) {
    this.selectedCompany = company;
    this.selectedJobPost = null;
    this.selectedJobAppOption = null;
    this.loadedJobPosts = [];
    this.loadedJobAppOptions = [];
    this.args.question.company = company;
    this.args.question.jobPost = null;
    this.args.question.jobApplication = null;

    if (!company) return;

    this.isLoadingRelated = true;
    try {
      const loaded = await this.store.findRecord('company', company.id, {
        include: 'job-posts,job-applications.job-post',
        reload: true,
      });
      const jobPosts = await loaded.jobPosts;
      this.loadedJobPosts = jobPosts.slice();

      const jobApps = await loaded.jobApplications;
      this.loadedJobAppOptions = jobApps.slice().map((ja) => {
        const jp = ja.belongsTo('jobPost').value();
        const label = jp
          ? `${jp.title} — ${ja.status}`
          : `Application #${ja.id} (${ja.status})`;
        return { record: ja, label };
      });
    } finally {
      this.isLoadingRelated = false;
    }
  }

  @action addCompanyToQuestion(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    company.save().then(() => {
      this.selectedCompany = company;
      this.args.question.company = company;
      this.flashMessages.success('Created company: ' + company.name);
    });
  }

  @action updateJobPost(jobPost) {
    this.selectedJobPost = jobPost;
    this.selectedJobAppOption = null;
    this.args.question.jobPost = jobPost;
    this.args.question.jobApplication = null;
  }

  @action updateJobApplication(option) {
    this.selectedJobAppOption = option;
    this.args.question.jobApplication = option?.record ?? null;
  }

  @action async save(event) {
    event?.preventDefault();
    this.args.question.company = this.selectedCompany;
    this.args.question.jobPost = this.selectedJobPost;
    this.args.question.jobApplication =
      this.selectedJobAppOption?.record ?? null;
    const q = await this.args.question.save();
    this.flashMessages.success('Question saved');
    this.router.transitionTo('questions.show', q.id);
  }

  @action async saveAndNew() {
    this.args.question.company = this.selectedCompany;
    this.args.question.jobPost = this.selectedJobPost;
    this.args.question.jobApplication =
      this.selectedJobAppOption?.record ?? null;
    await this.args.question.save();
    this.flashMessages.success('Question saved');
    this.router.transitionTo('questions.new', {
      queryParams: { companyId: this.selectedCompany?.id },
    });
  }

  @action cancel(event) {
    event?.preventDefault();
    this.args.question.rollbackAttributes?.();
    if (this.isEditing) {
      this.router.transitionTo('questions.show', this.args.question.id);
    }
  }
}
