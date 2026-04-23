import Controller from '@ember/controller';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class JobPostsNewPasteController extends Controller {
  @service api;
  @service session;
  @service store;
  @service router;
  @service spinner;
  @service pollable;
  @service currentUser;
  @service flashMessages;

  queryParams = ['bookmarklet', 'auto', 'score'];

  @tracked bookmarklet = null;
  @tracked auto = null;
  @tracked score = null;
  @tracked text = '';
  @tracked url = '';
  @tracked submitting = false;
  /**
   * Set when the API returns 409 duplicate_job_post. Shape:
   *   { id, title, companyName }
   * Drives the "Open existing" / "Re-parse anyway" banner above the form.
   */
  @tracked duplicate = null;

  _bookmarkletListener = null;

  @action
  installBookmarkletListener() {
    // Defer off the render pass — _drainPendingPaste can fire flash
    // messages and auto-submit, both of which read+write tracked state
    // that Ember's auto-tracking forbids during a render computation.
    Promise.resolve().then(() => {
      // Announce the auto-flow before any async work so the user sees
      // feedback immediately on page-load from the extension. Without
      // this, the first few hundred ms look like a blank paste form.
      if (this._shouldAutoSubmit()) {
        const chain = this.score === '1' ? 'submit + score' : 'submit';
        this.flashMessages.info(
          `Bookmarklet payload incoming — auto-${chain} engaged.`,
          { sticky: true },
        );
      }
      this._drainPendingPaste();
    });
    if (this._bookmarkletListener) return;
    const handler = (event) => {
      const data = event.data;
      if (!data || data.type !== 'cc-bookmarklet') return;
      if (typeof data.text === 'string') this.text = data.text;
      if (typeof data.url === 'string') this.url = data.url;
      try {
        window.sessionStorage.removeItem('cc-pending-paste');
      } catch {
        /* ignore */
      }
      if (this._shouldAutoSubmit()) {
        this._maybeAutoSubmit();
      } else {
        this.flashMessages.info('Filled from bookmarklet — review and submit.');
      }
    };
    window.addEventListener('message', handler);
    this._bookmarkletListener = handler;
  }

  _drainPendingPaste() {
    let raw = null;
    try {
      raw = window.sessionStorage.getItem('cc-pending-paste');
    } catch {
      return;
    }
    if (!raw) {
      return;
    }
    try {
      const payload = JSON.parse(raw);
      if (typeof payload.text === 'string' && payload.text) {
        this.text = payload.text;
      }
      if (typeof payload.url === 'string' && payload.url) {
        this.url = payload.url;
      }
      if (!this._shouldAutoSubmit()) {
        this.flashMessages.info('Filled from bookmarklet — review and submit.');
      }
    } catch {
      /* malformed payload — drop it */
    }
    try {
      window.sessionStorage.removeItem('cc-pending-paste');
    } catch {
      /* ignore */
    }
    if (this._shouldAutoSubmit()) {
      this._maybeAutoSubmit();
    }
  }

  _shouldAutoSubmit() {
    // score=1 implies auto=1 — scoring without a post to score against
    // makes no sense, so we always submit when the caller asked to score.
    return this.auto === '1' || this.score === '1';
  }

  _maybeAutoSubmit() {
    if (this.submitting) {
      return;
    }
    if (!this.text || !this.text.trim()) {
      return;
    }
    this.flashMessages.info('Auto-submitting pasted content…');
    // Defer a tick so tracked props settle before the fetch kicks off
    Promise.resolve().then(() => {
      this.submitPaste();
    });
  }

  @action
  teardownBookmarkletListener() {
    if (!this._bookmarkletListener) return;
    window.removeEventListener('message', this._bookmarkletListener);
    this._bookmarkletListener = null;
  }

  @action
  setBookmarkletHref(element) {
    const origin = window.location.origin;
    const src = `(function(){var O=${JSON.stringify(origin)};var p={type:'cc-bookmarklet',url:location.href,text:document.body.innerText};var w=window.open(O+'/job-posts/new/paste?bookmarklet=1','_blank');if(!w){alert('Popup blocked — allow popups for '+location.host);return;}var iv=setInterval(function(){try{w.postMessage(p,O);}catch(e){}},200);window.addEventListener('message',function h(e){if(e.origin===O&&e.data==='cc-bookmarklet-ack'){clearInterval(iv);window.removeEventListener('message',h);}});setTimeout(function(){clearInterval(iv);},10000);})();`;
    element.setAttribute('href', `javascript:${encodeURIComponent(src)}`);
  }

  get canSubmit() {
    if (this.submitting) return false;
    return this.text.trim().length > 0;
  }

  get submitLabel() {
    if (this.submitting) return 'Parsing…';
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
  submitPaste(event, { force = false } = {}) {
    event?.preventDefault?.();
    if (this.submitting) {
      return;
    }
    if (!this.canSubmit) {
      this.flashMessages.info('Paste the job-posting text before submitting.');
      return;
    }

    this.submitting = true;
    this.duplicate = null;
    this.flashMessages.info('Parsing the pasted content…');

    const refreshIfNeeded =
      !this.session.accessToken && this.session.refreshToken
        ? this.session.refresh().catch(() => {})
        : Promise.resolve();

    const body = { text: this.text };
    const link = this.url.trim();
    if (link) body.link = link;
    if (force) body.force = true;

    refreshIfNeeded
      .then(() =>
        fetch(`${this.api.baseUrl}scrapes/from-text/`, {
          method: 'POST',
          headers: {
            ...this.api.headers(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }),
      )
      .then((response) => {
        if (response.status === 409) {
          // Bail before the agent call is dispatched. parse() the body
          // so we can show the user which post they collided with.
          return response.json().then((data) => {
            const meta = data?.errors?.[0]?.meta ?? {};
            this.duplicate = {
              id: meta.job_post_id,
              title: meta.title,
              companyName: meta.company_name,
            };
            this.flashMessages.clearMessages();
            this.flashMessages.warning(
              `Already in your library — pick "Open existing" or "Re-parse anyway".`,
              { sticky: true },
            );
            this.submitting = false;
            return null;
          });
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (!data) return; // 409 short-circuit
        const scrapeId = data?.data?.id;
        if (!scrapeId) throw new Error('No scrape id in response');
        this.store.pushPayload('scrape', data);
        const scrape = this.store.peekRecord('scrape', scrapeId);
        this.flashMessages.info(
          `Scrape #${scrapeId} queued; polling for completion…`,
        );
        this.spinner.begin({ label: 'Parsing…' });
        this.pollable.poll(scrape, {
          successMessage: 'Job post created.',
          failedMessage: 'Parse failed — try a cleaner copy of the page.',
          onComplete: (rec) => {
            const jobPostId = rec.belongsTo('jobPost')?.id?.();
            this.flashMessages.clearMessages();
            this.flashMessages.info(
              `Scrape #${rec.id} completed; jobPost=${jobPostId ?? 'none'}.`,
            );
            if (!jobPostId) {
              this.flashMessages.warning(
                'Parse completed but no JobPost was created. Check the scrape.',
                { sticky: true },
              );
              this.submitting = false;
              return;
            }
            const note = rec.latestStatusNote || '';
            const isDuplicate = note.startsWith('duplicate:');
            if (isDuplicate) {
              this.flashMessages.warning(
                'You already have a job post for this link.',
                { sticky: true },
              );
            } else if (note.startsWith('updated_stub:')) {
              this.flashMessages.success(
                'Upgraded an existing stub with the pasted details.',
              );
            } else {
              this.flashMessages.success('Job post created.');
            }
            this._reset();
            if (this.score === '1') {
              this.flashMessages.info(
                'Heading to scores — career-data scoring will start there.',
              );
              this.router.transitionTo('job-posts.show.scores', jobPostId, {
                queryParams: { auto: '1' },
              });
            } else {
              this.flashMessages.info(`Navigating to job post #${jobPostId}.`);
              this.router.transitionTo('job-posts.show', jobPostId);
            }
          },
          onFailed: (rec) => {
            this.flashMessages.clearMessages();
            const noteTail = rec?.latestStatusNote
              ? ` (last note: ${rec.latestStatusNote})`
              : '';
            this.flashMessages.danger(
              `Parse failed — try a cleaner copy of the page.${noteTail}`,
              { sticky: true },
            );
            this.submitting = false;
          },
          onError: (err) => {
            this.flashMessages.clearMessages();
            const detail = err?.message ? ` — ${err.message}` : '';
            this.flashMessages.danger(
              `Lost connection while parsing${detail}.`,
              { sticky: true },
            );
            this.submitting = false;
          },
        });
      })
      .catch((err) => {
        this.flashMessages.clearMessages();
        this.flashMessages.danger(`Submit failed: ${err.message}`, {
          sticky: true,
        });
        this.submitting = false;
      });
  }

  _chainScore(jobPostId, isDuplicate) {
    // Land the user on the Scores tab even if something below fails —
    // we never want the score chain to leave them stuck on /paste.
    const fallbackTransition = () =>
      this.router.transitionTo('job-posts.show.scores', jobPostId);

    this.flashMessages.info(
      `Loading job post #${jobPostId} with existing scores…`,
    );
    this.store
      .findRecord('job-post', jobPostId, { include: 'scores', reload: true })
      .then((jobPost) => {
        const scores = jobPost.hasMany('scores').value() || [];
        this.flashMessages.info(
          `Found ${scores.length} existing score(s) on this post.`,
        );
        const existing = scores.find(
          (s) => !s.belongsTo('resume').id() && s.status === 'completed',
        );
        if (isDuplicate && existing) {
          this.flashMessages.success(
            `Opening your existing score #${existing.id}.`,
          );
          return this.router.transitionTo(
            'job-posts.show.scores.show',
            jobPostId,
            existing.id,
          );
        }
        const newScore = this.store.createRecord('score', {
          resume: null,
          jobPost,
          user: this.currentUser.user,
        });
        this.flashMessages.info('Scoring against your career data…');
        this.spinner.begin({ label: 'Scoring…' });
        newScore
          .save()
          .then((saved) => {
            this.flashMessages.info(
              `Score #${saved.id} created (status=${saved.status ?? 'unknown'}).`,
            );
            if (this.pollable.isTerminal(saved)) {
              this.spinner.end();
              this.router.transitionTo(
                'job-posts.show.scores.show',
                jobPostId,
                saved.id,
              );
              return;
            }
            this.pollable.poll(saved, {
              successMessage: 'Score ready.',
              failedMessage: 'Scoring failed.',
              onComplete: (scoreRec) => {
                this.flashMessages.success(`Score #${scoreRec.id} ready.`);
                this.router.transitionTo(
                  'job-posts.show.scores.show',
                  jobPostId,
                  scoreRec.id,
                );
              },
              onFailed: () => {
                this.flashMessages.danger('Scoring failed.', { sticky: true });
                fallbackTransition();
              },
              onError: (err) => {
                const detail = err?.message ? ` — ${err.message}` : '';
                this.flashMessages.danger(
                  `Lost connection while waiting for score${detail}.`,
                  { sticky: true },
                );
                fallbackTransition();
              },
            });
          })
          .catch((e) => {
            this.spinner.end();
            newScore.unloadRecord();
            this.flashMessages.danger(
              e?.errors?.[0]?.detail ?? 'Failed to create score.',
              { sticky: true },
            );
            fallbackTransition();
          });
      })
      .catch((e) => {
        this.flashMessages.danger(
          `Could not load the job post to chain scoring${e?.message ? ` — ${e.message}` : ''}.`,
          { sticky: true },
        );
        fallbackTransition();
      });
  }

  _reset() {
    this.text = '';
    this.url = '';
    this.submitting = false;
    this.duplicate = null;
  }

  @action
  openExistingDuplicate() {
    if (!this.duplicate?.id) return;
    const id = this.duplicate.id;
    this._reset();
    this.flashMessages.clearMessages();
    this.router.transitionTo('job-posts.show', id);
  }

  @action
  forceReparseDuplicate() {
    if (!this.duplicate) return;
    this.duplicate = null;
    this.flashMessages.clearMessages();
    this.submitPaste(undefined, { force: true });
  }
}
