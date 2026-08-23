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
  // FRON-126. True only once we have POSITIVELY established that the
  // chosen application and its job post both carry no company — not
  // merely that we couldn't see one in the store. Drives the notice
  // under the Company field and turns the next company pick into a
  // repair of the job post itself.
  @tracked companyDeadEnd = false;
  @tracked attachingCompany = false;

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

  /**
   * FRON-126 — the chain resolved but nothing in it carries a company,
   * so the blank Company field is a fact about the record rather than
   * something the user forgot. The notice says so; the picker directly
   * above it stays live, so the fix is one selection away.
   *
   * Gated on the fields actually being editable. Arriving from
   * job-posts/:id/questions/new sets hasLockedContext, which renders
   * Company as a disabled input — there would be nothing to repair
   * with, so that path keeps the old silence. A known limit of this
   * pass, not a special case for the lock.
   */
  get showCompanyDeadEnd() {
    return this.companyDeadEnd && !this.hasLockedContext;
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
    // FRON-126 repair path. While the notice is up, choosing a company
    // is an ANSWER to "this job post has no company" — the post and
    // application the user already picked have to survive it. The reset
    // below would clear both and throw the repair away.
    if (this.companyDeadEnd && company) {
      return this.attachCompanyToJobPost(company);
    }
    this.selectedCompany = company;
    this.selectedJobPost = null;
    this.selectedJobAppOption = null;
    this.loadedJobAppOptions = [];
    this.companyDeadEnd = false;
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

  @action addCompanyToQuestion(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    return company
      .save()
      .then(() => {
        this.flashMessages.success('Company created: ' + company.name + '.');
        // A company created while the dead-end notice is up is being
        // created FOR the job post — attach it there too, same as
        // picking an existing one.
        if (this.companyDeadEnd) {
          return this.attachCompanyToJobPost(company);
        }
        this.selectedCompany = company;
        this.args.question.company = company;
        return null;
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to create company.');
        }
        return null;
      });
  }

  @action updateJobPost(jobPost) {
    this.selectedJobPost = jobPost;
    this.selectedJobAppOption = null;
    // A hand-picked job post supersedes whatever the previous chain
    // said, including any no-company finding about it.
    this.companyDeadEnd = false;
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
    // Any previous finding belongs to the previous chain; the back-fill
    // below re-derives it for this one.
    this.companyDeadEnd = false;
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
      return;
    }
    // FRON-126. Neither side has a company IN THE STORE, which is not
    // yet a dead end — a linked-but-unloaded company reads exactly the
    // same through .value(). Ask for the ids before saying anything:
    // announcing "this post has no company" about a post that has one
    // we simply didn't fetch would be worse than the silence.
    const linkedCompanyId =
      option.record.belongsTo('company').id() ??
      jobPost.belongsTo('company').id();
    if (linkedCompanyId) {
      this._resolveLinkedCompany(option, jobPost);
      return;
    }
    this.companyDeadEnd = true;
  }

  /**
   * One side claims a company by id but it isn't loaded. Resolve it and
   * back-fill; only a resolution that comes back EMPTY is a dead end. A
   * failed fetch is not — the link exists, we just couldn't follow it,
   * so we stay quiet rather than assert something we don't know.
   */
  _resolveLinkedCompany(option, jobPost) {
    const source = option.record.belongsTo('company').id()
      ? option.record
      : jobPost;
    source.company
      .then((company) => {
        // The user may have moved on to another application meanwhile.
        if (this.selectedJobAppOption !== option) return;
        if (this.selectedCompany) return;
        if (company) {
          this.selectedCompany = company;
          this.args.question.company = company;
        } else {
          this.companyDeadEnd = true;
        }
      })
      .catch(() => {});
  }

  /**
   * Write the company onto the JOB POST, not just the question.
   *
   * This is the whole point of the repair: setting it on the question
   * labels this one answer and leaves the post companyless for every
   * future use of it. Writing it to the post fixes the record.
   *
   * Plain Ember Data PATCH, deliberately — `company` is a writable
   * relationship on the api's JobPostSerializer (`relationship_fks`
   * maps it to `company_id`), so this is ordinary CRUD, not one of the
   * four non-CRUD patterns in CLAUDE.md. There is no attach-company
   * verb on JobPostViewSet to reach with apiAction, and <JobPosts::Form>
   * already performs exactly this write from the edit page.
   */
  attachCompanyToJobPost(company) {
    this.selectedCompany = company;
    this.args.question.company = company;

    const jobPost = this.selectedJobPost;
    if (!jobPost) {
      this.companyDeadEnd = false;
      return Promise.resolve(null);
    }

    const previousCompany = jobPost.belongsTo('company').value();
    jobPost.company = company;
    this.attachingCompany = true;
    return jobPost
      .save()
      .then((saved) => {
        this.attachingCompany = false;
        this.companyDeadEnd = false;
        this.flashMessages.success(
          `Attached ${company.name} to the job post — not just this question.`,
        );
        return saved;
      })
      .catch((error) => {
        this.attachingCompany = false;
        // Put the relationship back rather than leaving the form
        // claiming a link the server refused. The notice stays up
        // (the post is still companyless) so the pick can be retried.
        jobPost.company = previousCompany;
        if (error?.status !== 403) {
          this.flashMessages.danger(
            'Failed to attach the company to the job post.',
          );
        }
        return null;
      });
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
