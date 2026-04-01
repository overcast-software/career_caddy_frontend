import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

const TERMINAL_STATUSES = ['completed', 'done', 'failed', 'error'];
const POLL_INTERVAL_MS = 3000;

export default class CoverLettersShowController extends Controller {
  @service flashMessages;
  @service store;
  @service session;
  isExporting = false;

  _pollTimeout = null;

  willDestroy() {
    super.willDestroy(...arguments);
    this._stopPolling();
  }

  _stopPolling() {
    if (this._pollTimeout) {
      clearTimeout(this._pollTimeout);
      this._pollTimeout = null;
    }
  }

  async _pollCoverLetter(coverLetter) {
    try {
      await coverLetter.reload();
    } catch {
      this.flashMessages.danger('Lost connection while waiting for cover letter.');
      return;
    }

    if (TERMINAL_STATUSES.includes(coverLetter.status)) {
      if (coverLetter.status === 'failed' || coverLetter.status === 'error') {
        this.flashMessages.danger('Cover letter generation failed.');
      }
      return;
    }

    this._pollTimeout = setTimeout(() => this._pollCoverLetter(coverLetter), POLL_INTERVAL_MS);
  }

  startPollingIfNeeded(coverLetter) {
    this._stopPolling();
    if (coverLetter.status && !TERMINAL_STATUSES.includes(coverLetter.status)) {
      this.flashMessages.info('Generating cover letter — waiting for results…');
      this._pollCoverLetter(coverLetter);
    }
  }
  @action async toggleFavorite() {
    this.model.favorite = !this.model.favorite;
    try {
      await this.model.save();
      const status = this.model.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Cover letter ${status} favorites`);
    } catch {
      this.model.favorite = !this.model.favorite;
      this.flashMessages.danger('Failed to update favorite status');
    }
  }

  @action async exportToDocx() {
    if (this.isExporting) {
      this.flashMessages.warn('already exporting. calm down.');
      return;
    }
    this.isExporting = true;
    try {
      const id = this.model.id;
      const adapter = this.store.adapterFor('cover-letter');
      // buildURL returns a trailing slash; append 'export'
      const base = adapter.buildURL('cover-letter', id); // e.g. /api/v1/cover-letters/1/
      const url = `${base}export`; // -> /api/v1/cover-letters/1/export

      const headers = {};
      if (this.session.authorizationHeader) {
        headers['Authorization'] = this.session.authorizationHeader;
      }
      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers,
      });
      if (!resp.ok) throw new Error(`Export failed (${resp.status})`);

      // If the API returns the docx file, trigger a download
      const ct = resp.headers.get('content-type') || '';
      if (
        ct.includes(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ) ||
        ct.includes('application/octet-stream')
      ) {
        const blob = await resp.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `cover-letter-${id}.docx`;
        document.body.appendChild(link);
        link.click();
        URL.revokeObjectURL(link.href);
        link.remove();
      } else {
        // If API returns JSON with a URL, follow it (optional fallback)
        try {
          const data = await resp.json();
          if (data?.url) window.location.assign(data.url);
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      this.flashMessages.danger(e);
    } finally {
      this.isExporting = false;
    }
  }
}
