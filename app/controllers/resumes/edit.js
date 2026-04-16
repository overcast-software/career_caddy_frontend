import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import cloneResume from 'career-caddy-frontend/utils/clone-resume';
import exportResumeToWord from 'career-caddy-frontend/utils/export-resume-to-word';

export default class ResumesEditController extends Controller {
  @service store;
  @service router;
  @service flashMessages;
  @service session;

  @tracked sideBySide = (() => {
    const stored = localStorage.getItem('cc:builder-layout');
    if (stored !== null) return stored === 'split';
    return typeof window !== 'undefined' && window.innerWidth >= 1024;
  })();

  @action toggleLayout() {
    this.sideBySide = !this.sideBySide;
    localStorage.setItem(
      'cc:builder-layout',
      this.sideBySide ? 'split' : 'stack',
    );
  }

  @action
  async cloneResume() {
    await cloneResume(
      this.store,
      this.router,
      this.flashMessages,
      this.model.id,
    );
  }

  @action
  async saveResume() {
    try {
      await this.model.save();
    } catch (e) {
      console.error('Failed to save resume', e);
    }
  }

  @action cancel() {
    this.model.rollbackAttributes();
    this.router.transitionTo('resumes.show', this.model);
  }

  @action deleteResume() {
    if (!confirm('Delete this resume? This cannot be undone.')) return;
    this.model
      .destroyRecord()
      .then(() => {
        this.flashMessages.success('Resume deleted.');
        this.router.transitionTo('resumes');
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete resume.');
        }
      });
  }

  isExporting = false;

  @action
  async exportToWord() {
    if (this.isExporting) return;
    this.isExporting = true;
    try {
      await exportResumeToWord(this.store, this.session, this.model.id);
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

  addCertification = async () => {
    const cert = this.store.createRecord('certification', {
      resume: this.model,
    });
    const rel = await this.model.certifications;
    if (!rel.includes(cert)) rel.unshiftObject(cert);
  };

  @tracked _activeSummary = null;

  get resumeSummaries() {
    return this.store.peekAll('summary');
  }

  get activeSummary() {
    return this._activeSummary ?? this.model?.activeSummary;
  }

  @action onSummaryChange(summary) {
    this._activeSummary = summary;
  }

  get isDirty() {
    return this.model?.isNew || this.model?.hasDirtyAttributes;
  }
}
