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
    if (!q) return;

    const company = q.company;
    if (company) {
      this.selectedCompany = company;
      this._preloadCompanyRelated(company, q);
    }
    const jobPost = q.jobPost;
    if (jobPost) {
      this.selectedJobPost = jobPost;
      this.loadedJobPosts = [jobPost];
    }
    const jobApp = q.jobApplication;
    if (jobApp) {
      const title = jobPost?.get('title') ?? jobApp.get('jobPost.title');
      const status = jobApp.get('status') ?? '';
      const label = title
        ? `${title} — ${status}`
        : `Application #${jobApp.get('id')} (${status})`;
      this.selectedJobAppOption = { record: jobApp, label };
      this.loadedJobAppOptions = [this.selectedJobAppOption];
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

  get hasLockedContext() {
    return this.selectedJobPost || this.selectedJobAppOption;
  }

  @action
  async searchCompanies(term) {
    const params = term ? { 'filter[query]': term } : {};
    const results = await this.store.query('company', params);
    return results.slice();
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

  @action async addCompanyToQuestion(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    try {
      await company.save();
      this.selectedCompany = company;
      this.args.question.company = company;
      this.flashMessages.success('Company created: ' + company.name + '.');
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to create company.');
      }
    }
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
    try {
      const q = await this.args.question.save();
      this.flashMessages.success('Question saved.');
      this.router.transitionTo('questions.show', q.id);
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save question.');
      }
    }
  }

  @action async saveAndNew() {
    this.args.question.company = this.selectedCompany;
    this.args.question.jobPost = this.selectedJobPost;
    this.args.question.jobApplication =
      this.selectedJobAppOption?.record ?? null;
    try {
      await this.args.question.save();
      this.flashMessages.success('Question saved.');
      const jobApp = this.selectedJobAppOption?.record;
      if (jobApp) {
        this.router.transitionTo(
          'job-applications.show.questions.new',
          jobApp.id,
        );
      } else if (this.selectedJobPost) {
        this.router.transitionTo(
          'job-posts.show.questions.new',
          this.selectedJobPost.id,
        );
      } else {
        this.router.transitionTo('questions.new', {
          queryParams: {
            companyId: this.selectedCompany?.id ?? null,
            jobPostId: null,
            jobApplicationId: null,
          },
        });
      }
    } catch (error) {
      if (error?.status !== 403) {
        this.flashMessages.danger('Failed to save question.');
      }
    }
  }

  @action cancel(event) {
    event?.preventDefault();
    const wasEditing = this.isEditing;
    const questionId = this.args.question?.id;
    this.args.question.rollbackAttributes?.();
    if (wasEditing && questionId) {
      this.router.transitionTo('questions.show', questionId);
    } else if (this.selectedJobAppOption?.record) {
      this.router.transitionTo(
        'job-applications.show',
        this.selectedJobAppOption.record.id,
      );
    } else if (this.selectedJobPost) {
      this.router.transitionTo(
        'job-posts.show.questions.index',
        this.selectedJobPost.id,
      );
    } else if (this.selectedCompany) {
      this.router.transitionTo(
        'companies.show.answers',
        this.selectedCompany.id,
      );
    } else {
      this.router.transitionTo('questions.index');
    }
  }
}
