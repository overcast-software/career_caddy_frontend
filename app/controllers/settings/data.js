import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class SettingsDataController extends Controller {
  @service api;
  @service flashMessages;
  @tracked isExporting = false;
  @tracked isImporting = false;

  @action
  async exportData() {
    this.isExporting = true;
    try {
      // KEEP raw fetch: xlsx file download, not JSON:API. The
      // response is a binary Blob handed to the browser as a
      // download — no model + adapter path applies.
      const response = await fetch(`${this.api.baseUrl}career-data/export/`, {
        headers: this.api.headers(),
      });
      if (!response.ok) {
        this.flashMessages.danger('Export failed.');
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'career-caddy-export.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      this.flashMessages.success('Export downloaded.');
    } catch {
      this.flashMessages.danger('Export failed.');
    } finally {
      this.isExporting = false;
    }
  }

  @action
  async importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.isImporting = true;
    const formData = new FormData();
    formData.append('file', file);

    try {
      // KEEP raw fetch: multipart upload of an xlsx file. Not
      // JSON:API; the adapter path would need a FormData escape
      // hatch we don't otherwise need.
      const response = await fetch(`${this.api.baseUrl}career-data/import/`, {
        method: 'POST',
        headers: this.api.headers(),
        body: formData,
      });
      if (response.ok) {
        this.flashMessages.success('Import complete.');
      } else {
        const result = await response.json();
        const detail = result.errors?.[0]?.detail ?? 'Import failed.';
        this.flashMessages.danger(detail);
      }
    } catch {
      this.flashMessages.danger('Import failed.');
    } finally {
      this.isImporting = false;
      event.target.value = '';
    }
  }
}
