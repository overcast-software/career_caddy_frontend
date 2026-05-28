import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { AS2_PUBLIC } from 'career-caddy-frontend/models/job-post';

export default class JobPostsFormComponent extends Component {
  @service store;
  @service flashMessages;
  @service router;
  @service currentUser;
  @service spinner;
  @service pollable;
  @tracked _selectedCompany = null;
  // Intermediary value for apply_url so fast typing doesn't get clobbered
  // by Ember-Data tracking re-renders. Mirrors the _selectedCompany shape:
  // null = "untouched, fall back to model"; "" = "user cleared it".
  @tracked _applyUrl = null;
  @tracked showDeleteConfirm = false;
  @tracked pasteText = '';
  @tracked reextracting = false;
  @tracked selectedDupTarget = null;
  @tracked dupSubmitting = false;

  // Canonical list — matches the backend's KNOWN_SOURCES constant. Kept
  // hardcoded because it rarely changes; the reports filter options
  // endpoint is the dynamic list, but the edit form wants a fixed set so
  // users don't invent free-text values.
  sourceOptions = ['manual', 'email', 'paste', 'scrape', 'chat', 'import'];

  get isStaff() {
    return this.currentUser.user?.isStaff;
  }

  // Reflects the model's audience. Reads via the model getter so any
  // future audience changes (Followers, Unlisted) the picker doesn't yet
  // distinguish still render with the closest-match Public/Private state.
  get isPublic() {
    return this.args.jobPost?.isPublic;
  }

  @action
  updateVisibility(event) {
    // Assign a fresh array — Ember Data tracks array identity, not
    // contents; in-place mutation wouldn't dirty the attribute and the
    // PATCH would silently drop the change.
    const next = event.target.value === 'public' ? [AS2_PUBLIC] : [];
    this.args.jobPost.audience = next;
  }

  get selectedCompany() {
    return this._selectedCompany ?? this.args.jobPost?.company;
  }

  get applyUrlInput() {
    return this._applyUrl ?? this.args.jobPost?.applyUrl ?? '';
  }

  @action
  updateApplyUrl(event) {
    this._applyUrl = event.target.value;
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
  submitEdit(event) {
    event.preventDefault();
    // Flush the apply_url intermediary onto the model. Null sentinel means
    // the user never touched the field — leave the model value alone so
    // a no-op save() doesn't mass-clear apply_url to "".
    if (this._applyUrl !== null) {
      this.args.jobPost.applyUrl = this._applyUrl;
    }
    return this.args.jobPost
      .save()
      .then(() => {
        // Reset intermediary so a subsequent save() reads the freshly
        // persisted model value rather than the stale staged input.
        this._applyUrl = null;
        this.flashMessages.success('Job post saved.');
        this.router.transitionTo('job-posts.show', this.args.jobPost);
      })
      .catch((error) => {
        this.flashMessages.danger(
          error?.errors?.[0]?.detail ?? 'Failed to save job post.',
        );
      });
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
    this.reextracting = true;
    this.flashMessages.info('Queued re-extraction — watching for completion.');
    this.args.jobPost
      .reextract({ text: this.pasteText })
      .then((scrape) => {
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
  async searchJobPosts(term) {
    const trimmed = (term || '').trim();
    if (!trimmed) return [];
    // Exclude self so the user can't pick their own row in the picker.
    const results = await this.store.query('job-post', {
      'filter[query]': trimmed,
      'page[size]': 20,
    });
    const own = this.args.jobPost?.id;
    const out = [];
    for (const p of results) {
      if (p.id !== own) out.push(p);
    }
    return out;
  }

  @action
  markAsDuplicate(target) {
    if (!target) return;
    if (this.dupSubmitting) return;
    this.selectedDupTarget = target;
    this.dupSubmitting = true;
    this.args.jobPost
      .markDuplicateOf({ target_id: parseInt(target.id, 10) })
      .then(() => {
        this.flashMessages.success(`Marked as duplicate of #${target.id}.`);
        this.selectedDupTarget = null;
        this._refreshJobPost();
      })
      .catch((error) => {
        const detail =
          error?.errors?.[0]?.detail ?? 'Failed to mark as duplicate.';
        this.flashMessages.danger(detail);
        this.selectedDupTarget = null;
      })
      .finally(() => {
        this.dupSubmitting = false;
      });
  }

  @action
  unlinkDuplicate() {
    if (this.dupSubmitting) return;
    this.dupSubmitting = true;
    this.args.jobPost
      .unlinkDuplicate()
      .then(() => {
        this.flashMessages.success('Unlinked.');
        this._refreshJobPost();
      })
      .catch((error) => {
        const detail = error?.errors?.[0]?.detail ?? 'Failed to unlink.';
        this.flashMessages.danger(detail);
      })
      .finally(() => {
        this.dupSubmitting = false;
      });
  }

  @action
  promoteCanonical() {
    if (this.dupSubmitting) return;
    this.dupSubmitting = true;
    this.args.jobPost
      .promoteCanonical()
      .then(() => {
        this.flashMessages.success('Promoted to canonical.');
        this._refreshJobPost();
      })
      .catch((error) => {
        const detail = error?.errors?.[0]?.detail ?? 'Failed to promote.';
        this.flashMessages.danger(detail);
      })
      .finally(() => {
        this.dupSubmitting = false;
      });
  }

  @action
  nuclearDelete() {
    this.showDeleteConfirm = false;
    const jobPost = this.args.jobPost;
    jobPost
      .nuclearDelete()
      .then(() => {
        // deleteRecord() before unloadRecord() so any live tracked
        // arrays (ember-infinity's array on jp.index, peekAll
        // consumers) drop their reference. Without it, the cached
        // InfinityModel on jp.index re-renders this row after we
        // navigate back and reading any relationship throws
        // "this.store is undefined" / "_graph" — record proxy
        // detached but still in the array. Server-side cascade
        // already removed every child relation, so we don't need
        // the unloadAll() storm that nuked sibling posts' children.
        jobPost.deleteRecord();
        jobPost.unloadRecord();
        this.flashMessages.success('Job post and all children deleted.');
        this.router.transitionTo('job-posts.index');
      })
      .catch(() => {
        this.flashMessages.danger('Nuclear delete failed.');
      });
  }
}
