import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class QuestionsFormComponent extends Component {
  @tracked selectedCompany = null;
  @tracked selectedJobPost = null;
  @tracked selectedJobAppOption = null;
  @tracked loadedJobAppOptions = [];
  @tracked isLoadingRelated = false;

  @service store;
  @service flashMessages;
  @service router;

  constructor(owner, args) {
    super(owner, args);
    const q = args.question;
    if (!q) return;

    // Whether the question came in with a JobApp pre-filled. Used to
    // lock the JobApp picker — landing on jp.show.questions.new
    // pre-fills only the JobPost, and the picker must stay editable so
    // the user can attach the question to one of that JP's apps.
    this._initialJobAppLocked = Boolean(q.belongsTo('jobApplication').id());

    // Locking is an ARRIVAL fact, not a live-selection one. Routes like
    // job-posts/:id/questions/new hand us a question whose JobPost is
    // already decided, and those fields must render read-only. Deriving
    // this from the live `selectedJobPost` instead — as it used to —
    // meant that on the standalone /questions form, picking a job post
    // froze the Company and Job Post pickers with no way back.
    this._initialLockedContext = Boolean(
      q.belongsTo('jobPost').id() || q.belongsTo('jobApplication').id(),
    );

    const company = q.belongsTo('company').value();
    if (company) {
      this.selectedCompany = company;
      this._preloadCompanyRelated(company, q);
    }
    const jobPost = q.belongsTo('jobPost').value();
    const jobApp = q.belongsTo('jobApplication').value();
    const jobAppPost = jobApp?.belongsTo('jobPost').value() ?? null;

    // Same rule as picking one by hand: the application implies its job
    // post. job-posts/:jp/job-applications/:ja/questions/new arrives
    // with the application but no job post of its own, and used to
    // render a blank read-only Job Post field.
    //
    // Resolved to one value before assigning rather than written twice:
    // reading `selectedJobPost` and then setting it during construction
    // trips Ember's backtracking-rerender assertion.
    const contextJobPost = jobPost ?? jobAppPost;
    if (contextJobPost) {
      this.selectedJobPost = contextJobPost;
    }

    if (jobApp) {
      const title = contextJobPost?.title;
      const status = jobApp.status ?? '';
      const label = title
        ? `${title} — ${status}`
        : `Application #${jobApp.id} (${status})`;
      this.selectedJobAppOption = { record: jobApp, label };
      this.loadedJobAppOptions = [this.selectedJobAppOption];
    }
  }

  async _preloadCompanyRelated(company, question) {
    this.isLoadingRelated = true;
    try {
      const loaded = await this.store.findRecord('company', company.id, {
        include: 'job-applications.job-post',
        reload: true,
      });
      this.loadedJobAppOptions = await this._optionsFor(loaded);

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
    return this._initialLockedContext;
  }

  get jobAppLocked() {
    return this._initialJobAppLocked;
  }

  @action
  async searchCompanies(term) {
    const params = term ? { 'filter[query]': term } : {};
    const results = await this.store.query('company', params);
    return results.slice();
  }

  /**
   * Typeahead over job applications, the same shape as searchCompanies.
   *
   * filter[query] on job-applications matches the job post's title, the
   * company name and the status, which is what lets you find an
   * application by job title with no company chosen. filter[company_id]
   * narrows it once a company IS chosen.
   *
   * There is deliberately no filter[job_post_id] — JobApplicationViewSet
   * has no such filter and would ignore it silently.
   *
   * Search results are deliberately NOT narrowed to the selected job
   * post either, though the browse list below still is. Choosing an
   * application now sets the job post, so narrowing search by it would
   * mean that after picking one application you could never search your
   * way to a different one — the field would answer "no results" for
   * every other job. A typed term is the user asking for something
   * specific; the cascade belongs to the browse list.
   */
  @action
  async searchJobApplications(term) {
    const params = { include: 'job-post,company', 'page[size]': 20 };
    if (term) params['filter[query]'] = term;
    if (this.selectedCompany) {
      params['filter[company_id]'] = this.selectedCompany.id;
    }
    const results = await this.store.query('job-application', params);
    const options = [];
    for (const jobApp of results) {
      options.push(this._jobAppOption(jobApp));
    }
    return options;
  }

  get filteredJobAppOptions() {
    if (!this.selectedJobPost) return this.loadedJobAppOptions;
    return this.loadedJobAppOptions.filter(
      (opt) => opt.record.belongsTo('jobPost').id() === this.selectedJobPost.id,
    );
  }

  _jobAppOption(jobApp) {
    const jp = jobApp.belongsTo('jobPost').value();
    const label = jp
      ? `${jp.title} — ${jobApp.status}`
      : `Application #${jobApp.id} (${jobApp.status})`;
    return { record: jobApp, label };
  }

  async _optionsFor(company) {
    const options = [];
    for (const jobApp of await company.jobApplications) {
      options.push(this._jobAppOption(jobApp));
    }
    return options;
  }

  @action updateContent(event) {
    this.args.question.content = event.target.value;
  }

  // Favoriting is a per-answer concept — the Question itself has no
  // independent favorite flag. When the question has exactly one
  // answer we let the star on the form toggle that answer's favorite
  // directly; anything else is a misuse and we flash the ambiguity.
  get _loneAnswer() {
    const answers = this.args.question?.hasMany('answers').value() ?? [];
    return answers.length === 1 ? answers[0] : null;
  }

  get loneAnswerFavorited() {
    return this._loneAnswer?.favorite ?? false;
  }

  @action
  toggleLoneAnswerFavorite() {
    const answers = this.args.question?.hasMany('answers').value() ?? [];
    if (answers.length === 0) {
      this.flashMessages.warning(
        'Add an answer first — favoriting lives on the answer, not the question.',
      );
      return;
    }
    if (answers.length > 1) {
      this.flashMessages.warning(
        'This question has multiple answers. Open the question and favorite a specific answer.',
      );
      return;
    }
    const answer = answers[0];
    const previous = answer.favorite;
    answer.favorite = !previous;
    answer
      .save()
      .then(() => {
        this.flashMessages.success(
          previous
            ? 'Unfavorited the lone answer.'
            : 'Favorited the lone answer.',
        );
      })
      .catch(() => {
        answer.favorite = previous;
        this.flashMessages.danger('Failed to update favorite.');
      });
  }

  @action async updateCompany(company) {
    this.selectedCompany = company;
    this.selectedJobPost = null;
    this.selectedJobAppOption = null;
    this.loadedJobAppOptions = [];
    this.args.question.company = company;
    this.args.question.jobPost = null;
    this.args.question.jobApplication = null;

    if (!company) return;

    this.isLoadingRelated = true;
    try {
      const loaded = await this.store.findRecord('company', company.id, {
        include: 'job-applications.job-post',
        reload: true,
      });
      this.loadedJobAppOptions = await this._optionsFor(loaded);
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

  /**
   * The job application is the most specific thing on this form: it
   * implies its job post, which implies its company. Choosing one fills
   * both in rather than leaving a Job Post field that silently
   * disagrees — "if I can find the JA, then the JP should come along
   * for free". The application wins, so the Job Post field visibly
   * moves to match it.
   */
  @action updateJobApplication(option) {
    this.selectedJobAppOption = option;
    const jobApp = option?.record ?? null;
    this.args.question.jobApplication = jobApp;
    if (!jobApp) return;

    const jobPost = jobApp.belongsTo('jobPost').value();
    if (jobPost) {
      this._backfillFromJobApplication(option, jobPost);
    } else if (jobApp.belongsTo('jobPost').id()) {
      // Linked but not in the store — the option came from a payload
      // that didn't sideload job-post. Resolve it, then fill in, unless
      // the user has moved on to a different application meanwhile.
      jobApp.jobPost.then((resolved) => {
        if (resolved && this.selectedJobAppOption === option) {
          this._backfillFromJobApplication(option, resolved);
        }
      });
    }
  }

  _backfillFromJobApplication(option, jobPost) {
    this.selectedJobPost = jobPost;
    this.args.question.jobPost = jobPost;
    if (this.selectedCompany) return;
    const company =
      option.record.belongsTo('company').value() ??
      jobPost.belongsTo('company').value();
    if (company) {
      this.selectedCompany = company;
      this.args.question.company = company;
    }
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
      if (this.args.onSave) {
        this.args.onSave(q);
      } else {
        this.router.transitionTo('questions.show', q.id);
      }
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
        'companies.show.questions',
        this.selectedCompany.id,
      );
    } else {
      this.router.transitionTo('questions.index');
    }
  }

  @action
  async delete() {
    const q = this.args.question;
    if (!q?.id) return;
    if (!window.confirm('Delete this question and all its answers?')) return;
    try {
      await q.destroyRecord();
      this.flashMessages.success('Question deleted.');
      this.router.transitionTo('questions.index');
    } catch (error) {
      // Same post-success cleanup-trail filter as <Answers::Show>:
      // 204 empty-body parse / Ember Data relationship teardown both
      // surface as TypeError/SyntaxError without HTTP shape, while the
      // row is already gone server-side.
      const isRealHttpError =
        error?.status ||
        (Array.isArray(error?.errors) && error.errors.length > 0);
      if (!isRealHttpError) {
        this.flashMessages.success('Question deleted.');
        this.router.transitionTo('questions.index');
        return;
      }
      if (error.status !== 403) {
        this.flashMessages.danger('Failed to delete question.');
      }
    }
  }
}
