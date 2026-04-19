import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsPasteController extends Controller {
  @service api;
  @service session;
  @service store;
  @service router;
  @service spinner;
  @service pollable;
  @service flashMessages;

  @tracked text = '';
  @tracked url = '';
  @tracked submitting = false;

  get canSubmit() {
    if (this.submitting) return false;
    return this.url.trim().length > 0 || this.text.trim().length > 0;
  }

  get submitLabel() {
    if (this.submitting) return 'Parsing…';
    if (this.url.trim().length > 0) return 'Scrape URL';
    return 'Create from paste';
  }

  @action
  updateText(event) {
    this.text = event.target.value;
  }

  @action
  updateUrl(event) {
    this.url = event.target.value;
  }

  @action
  submitPaste(event) {
    event?.preventDefault?.();
    if (!this.canSubmit) return;

    const url = this.url.trim();
    if (url) {
      const target = url;
      this._reset();
      this.router.transitionTo('job-posts.scrape', {
        queryParams: { url: target },
      });
      return;
    }

    this.submitting = true;
    this.flashMessages.info('Parsing the pasted content…');

    const refreshIfNeeded =
      !this.session.accessToken && this.session.refreshToken
        ? this.session.refresh().catch(() => {})
        : Promise.resolve();

    refreshIfNeeded
      .then(() =>
        fetch(`${this.api.baseUrl}scrapes/from-text/`, {
          method: 'POST',
          headers: {
            ...this.api.headers(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: this.text }),
        }),
      )
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const scrapeId = data?.data?.id;
        if (!scrapeId) throw new Error('No scrape id in response');
        this.store.pushPayload('scrape', data);
        const scrape = this.store.peekRecord('scrape', scrapeId);
        this.spinner.begin({ label: 'Parsing…' });
        this.pollable.poll(scrape, {
          successMessage: 'Job post created.',
          failedMessage: 'Parse failed — try a cleaner copy of the page.',
          onComplete: (rec) => {
            this.flashMessages.clearMessages();
            const jobPostId = rec.belongsTo('jobPost')?.id?.();
            if (jobPostId) {
              this.flashMessages.success('Job post created.');
              this._reset();
              this.router.transitionTo('job-posts.show', jobPostId);
            } else {
              this.flashMessages.warning(
                'Parse completed but no JobPost was created. Check the scrape.',
              );
              this.submitting = false;
            }
          },
          onFailed: () => {
            this.flashMessages.clearMessages();
            this.flashMessages.danger(
              'Parse failed — try a cleaner copy of the page.',
            );
            this.submitting = false;
          },
          onError: () => {
            this.flashMessages.clearMessages();
            this.flashMessages.danger('Lost connection while parsing.');
            this.submitting = false;
          },
        });
      })
      .catch((err) => {
        this.flashMessages.clearMessages();
        this.flashMessages.danger(`Submit failed: ${err.message}`);
        this.submitting = false;
      });
  }

  _reset() {
    this.text = '';
    this.url = '';
    this.submitting = false;
  }
}
