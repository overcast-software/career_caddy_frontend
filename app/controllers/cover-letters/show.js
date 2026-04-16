import PollableController from 'career-caddy-frontend/controllers/pollable';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class CoverLettersShowController extends PollableController {
  @service store;
  @service session;
  isExporting = false;

  get spinnerLabel() {
    return 'Generating cover letter…';
  }

  onPollStart() {
    this.flashMessages.info('Generating cover letter — waiting for results…');
  }

  onPollFailed() {
    this.flashMessages.danger('Cover letter generation failed.');
  }

  onPollError() {
    this.flashMessages.danger(
      'Lost connection while waiting for cover letter.',
    );
  }

  @action async toggleFavorite() {
    this.model.favorite = !this.model.favorite;
    try {
      await this.model.save();
      this.store.peekRecord('career-data', '1')?.markDirty();
      const status = this.model.favorite ? 'added to' : 'removed from';
      this.flashMessages.success(`Cover letter ${status} favorites`);
    } catch {
      this.model.favorite = !this.model.favorite;
      this.flashMessages.danger('Failed to update favorite status');
    }
  }

  @action async exportToDocx() {
    if (this.isExporting) {
      this.flashMessages.warning('Export already in progress.');
      return;
    }
    this.isExporting = true;
    try {
      const id = this.model.id;
      const adapter = this.store.adapterFor('cover-letter');
      const base = adapter.buildURL('cover-letter', id);
      const url = `${base}export`;

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
