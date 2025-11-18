import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';

export default class ResumesEditController extends Controller {
  @service store;
  @service router;
  @service flashMessages;
  @tracked summaryIndex = 0;

  @action
  async cloneResume() {
    const source = this.model;
    const user = await source.user;
    this.store
      .createRecord('resume', {
        user,
        title: source.title ? `${source.title} (Copy)` : source.title,
        filePath: source.filePath ?? null,
        skills: source.skills.content,
        educations: source.educations.content,
        experiences: source.experiences.content,
        certifications: source.certifications.content,
        summaries: source.summaries.content
      })
      .save()
      .then((clone) => {
        this.router.transitionTo('resumes.show', clone.id);
      })
      .then(() => this.flashMessages.success('resume successfully cloned'))
      .catch( (error) => {debugger ; this.flashMessages.warning(error)})
  }

  @action
  async saveResume() {
    try {
      await this.model.save();
    } catch (e) {
      // Optional: surface error to the user

      console.error('Failed to save resume', e);
    }
  }

  @action
  async deleteResume() {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    await this.model.destroyRecord();
    this.router.transitionTo('resumes')
        .then(()=>{this.flashMessages.success("successfully deleted resume.")});
  }
  @action
  async exportToWord() {
    if (this.isExporting) return;
    this.isExporting = true;
    try {
      const id = this.model.id;
      const adapter = this.store.adapterFor('resume');
      // buildURL returns a trailing slash; append 'export'
      const base = adapter.buildURL('resume', id); // e.g. /api/v1/resume/1/
      const url = `${base}export`; // -> /api/v1/resume/1/export

      const resp = await fetch(url, { method: 'GET', credentials: 'include' });
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
        link.download = `resume-${id}.docx`;
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
      alert?.(e?.message ?? 'Export failed');
    } finally {
      this.isExporting = false;
    }
  }

  addExperience = async () => {
    const exp = this.store.createRecord('experience', { resume: this.model });
    const rel = await this.model.experiences;
    if (!rel.includes(exp)) rel.unshiftObject(exp);
  };

  get isDirty() {
    return this.model?.isNew || this.model?.hasDirtyAttributes;
  }

  @action
  updateSummaryIndex(newIndex) {
    this.summaryIndex = newIndex;
  }

  @action
  onSummaryDirection(dir) {
    const list =
      this.model.summaries?.toArray?.() ??
      Array.from(this.model.summaries ?? []);
    const count = list.length;

    if (count < 2) return;

    if (dir === 'left') {
      this.summaryIndex = (this.summaryIndex - 1 + count) % count;
    } else if (dir === 'right') {
      this.summaryIndex = (this.summaryIndex + 1) % count;
    }
  }
}
