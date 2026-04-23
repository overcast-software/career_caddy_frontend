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
  @service flashMessages;

  @tracked text = '';
  @tracked url = '';
  @tracked submitting = false;

  _bookmarkletListener = null;

  @action
  installBookmarkletListener() {
    this._drainPendingPaste();
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
      this.flashMessages.info('Filled from bookmarklet — review and submit.');
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
    if (!raw) return;
    try {
      const payload = JSON.parse(raw);
      if (typeof payload.text === 'string' && payload.text) {
        this.text = payload.text;
      }
      if (typeof payload.url === 'string' && payload.url) {
        this.url = payload.url;
      }
      this.flashMessages.info('Filled from bookmarklet — review and submit.');
    } catch {
      /* malformed stash — drop it */
    }
    try {
      window.sessionStorage.removeItem('cc-pending-paste');
    } catch {
      /* ignore */
    }
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
  submitPaste(event) {
    event?.preventDefault?.();
    if (this.submitting) return;
    if (!this.canSubmit) {
      this.flashMessages.info('Paste the job-posting text before submitting.');
      return;
    }

    this.submitting = true;
    this.flashMessages.info('Parsing the pasted content…');

    const refreshIfNeeded =
      !this.session.accessToken && this.session.refreshToken
        ? this.session.refresh().catch(() => {})
        : Promise.resolve();

    const body = { text: this.text };
    const link = this.url.trim();
    if (link) body.link = link;

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
