import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
export default class CoverLettersShowController extends Controller {
  @service flashMessages;
  @service store;
  @service session;
  isExporting = false;
  @action async exportToDocx() {
    if (this.isExporting){
      this.flashMessages.warn('already exporting. calm down.');
      return
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
