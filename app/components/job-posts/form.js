import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsFormComponent extends Component {
  @service store;
  @service flashMessages;
  @service router;
  @service currentUser;
  @service spinner;
  @service pollable;
  @tracked _selectedCompany = null;
  @tracked showDeleteConfirm = false;
  @tracked pasteText = '';
  @tracked reextracting = false;

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }

  get selectedCompany() {
    return this._selectedCompany ?? this.args.jobPost?.company;
  }

  @action
  updateCompany(company) {
    this._selectedCompany = company;
    this.args.jobPost.company = company;
  }

  @action
  async searchCompanies(term) {
    const params = term ? { 'filter[query]': term } : {};
    const results = await this.store.query('company', params);
    return results.slice();
  }

  @action
  updateField(field, event) {
    this.args.jobPost[field] = event.target.value;
  }

  @action
  updateDateField(field, event) {
    this.args.jobPost[field] = event.target.valueAsDate ?? null;
  }

  @action
  addCompanyToJobPost(companyName) {
    const company = this.store.createRecord('company', { name: companyName });
    this._selectedCompany = company;
    this.args.jobPost.company = company;
    company
      .save()
      .then(() => this.flashMessages.success('Created company ' + company.name))
      .catch(() => this.flashMessages.danger('Failed to create company'));
  }

  @action
  async submitEdit(event) {
    event.preventDefault();
    try {
      await this.args.jobPost.save();
      this.flashMessages.success('Job post saved.');
      this.router.transitionTo('job-posts.show', this.args.jobPost);
    } catch (error) {
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to save job post.',
      );
    }
  }

  @action
  cancel(event) {
    event?.preventDefault?.();
    this.router.transitionTo('job-posts.show', this.args.jobPost);
  }

  @action
  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  @action
  cancelDelete() {
    this.showDeleteConfirm = false;
  }

  @action
  submitDelete() {
    this.showDeleteConfirm = false;
    this.args.jobPost
      .destroyRecord()
      .then(() => {
        this.args.jobPost.unloadRecord();
        this.flashMessages.success('Job post deleted.');
        this.router.transitionTo('job-posts.index');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete job post.');
        }
      });
  }

  get canReextract() {
    return !this.reextracting && this.pasteText.trim().length > 0;
  }

  @action
  updatePasteText(event) {
    this.pasteText = event.target.value;
  }

  @action
  reextractFromPaste() {
    if (!this.canReextract) return;
    const adapter = this.store.adapterFor('job-post');
    const id = this.args.jobPost.id;
    const url = adapter.buildURL('job-post', id) + 'reextract/';
    this.reextracting = true;
    this.flashMessages.info('Queued re-extraction — watching for completion.');
    adapter
      .ajax(url, 'POST', { data: { text: this.pasteText } })
      .then((payload) => {
        // The endpoint returns the just-created Scrape (status: pending).
        // Push it into the store, then poll until terminal — onComplete
        // refreshes the JobPost so form fields update in place.
        this.store.pushPayload('scrape', payload);
        const scrapeId = payload?.data?.id;
        const scrape = scrapeId
          ? this.store.peekRecord('scrape', scrapeId)
          : null;
        if (!scrape || this.pollable.isTerminal(scrape)) {
          this.flashMessages.clearMessages();
          this.flashMessages.success('Re-extract complete.');
          this._refreshJobPost();
          this.pasteText = '';
          this.reextracting = false;
          return;
        }
        this.spinner.begin({ label: 'Re-extracting…' });
        this.pollable.poll(scrape, {
          successMessage: 'Re-extract complete — fields refreshed.',
          failedMessage: 'Re-extract failed.',
          onComplete: () => {
            this._refreshJobPost();
            this.flashMessages.clearMessages();
            this.flashMessages.success(
              'Re-extract complete — fields refreshed.',
            );
            this.pasteText = '';
            this.reextracting = false;
          },
          onFailed: () => {
            this.flashMessages.clearMessages();
            this.flashMessages.danger(
              'Re-extract failed — try a cleaner copy of the page.',
            );
            this.reextracting = false;
          },
          onError: () => {
            this.flashMessages.clearMessages();
            this.flashMessages.danger('Lost connection while re-extracting.');
            this.reextracting = false;
          },
        });
      })
      .catch((error) => {
        this.flashMessages.clearMessages();
        const detail = error?.errors?.[0]?.detail ?? 'Re-extract failed.';
        this.flashMessages.danger(detail);
        this.reextracting = false;
      });
  }

  _refreshJobPost() {
    const id = this.args.jobPost?.id;
    if (!id) return;
    this.store.findRecord('job-post', id, { reload: true }).catch(() => {});
  }

  @action
  nuclearDelete() {
    this.showDeleteConfirm = false;
    const adapter = this.store.adapterFor('job-post');
    const id = this.args.jobPost.id;
    const url = adapter.buildURL('job-post', id) + 'nuclear/';
    adapter
      .ajax(url, 'DELETE')
      .then(() => {
        this.store.unloadAll('score');
        this.store.unloadAll('question');
        this.store.unloadAll('scrape');
        this.store.unloadAll('cover-letter');
        this.store.unloadAll('job-application');
        this.store.unloadAll('summary');
        this.args.jobPost.unloadRecord();
        this.flashMessages.success('Job post and all children deleted.');
        this.router.transitionTo('job-posts.index');
      })
      .catch(() => {
        this.flashMessages.danger('Nuclear delete failed.');
      });
  }
}
