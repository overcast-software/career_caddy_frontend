import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import cloneResume from 'career-caddy-frontend/utils/clone-resume';

export default class ResumesEditController extends Controller {
  @service store;
  @service router;
  @service flashMessages;

  @action
  async cloneResume() {
    await cloneResume(this.store, this.router, this.flashMessages, this.model.id);
  }

  @action
  async saveResume() {
    try {
      await this.model.save();
    } catch (e) {
      console.error('Failed to save resume', e);
    }
  }

  @action
  async deleteResume() {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    await this.model.destroyRecord();
    this.router.transitionTo('resumes').then(() => {
      this.flashMessages.success('successfully deleted resume.');
    });
  }

  @action
  async exportToWord() {
    if (this.isExporting) return;
    this.isExporting = true;
    try {
      const id = this.model.id;
      const adapter = this.store.adapterFor('resume');
      const base = adapter.buildURL('resume', id);
      const url = `${base}export`;

      const resp = await fetch(url, { method: 'GET', credentials: 'include' });
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
        link.download = `resume-${id}.docx`;
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
      alert?.(e?.message ?? 'Export failed');
    } finally {
      this.isExporting = false;
    }
  }

  addEducation = async () => {
    const edu = this.store.createRecord('education', { resume: this.model });
    const rel = await this.model.educations;
    if (!rel.includes(edu)) rel.unshiftObject(edu);
  };

  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.unshiftObject(exp);
  };

  addProject = async () => {
    const proj = this.store.createRecord('project', { resume: this.model });
    const rel = await this.model.projects;
    if (!rel.includes(proj)) rel.unshiftObject(proj);
  };

  get resumeSummaries() {
    return this.model.summaries;
  }

  get isDirty() {
    return this.model?.isNew || this.model?.hasDirtyAttributes;
  }
}
