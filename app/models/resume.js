import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

// Canonical section sequence — fallback when the API doesn't supply
// effectiveSectionOrder (older payloads, slim responses, partial loads).
const CANONICAL_SECTION_ORDER = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education',
  'certifications',
];

export default class ResumeModel extends Model {
  @attr('string') content;
  @attr('string') filePath;
  @attr('string') title;
  @attr('string') name;
  @attr('string') notes;
  @attr('boolean') favorite;
  @attr('string') status;
  @attr('string') profession;
  @attr('array') sectionOrder;
  @attr('array') effectiveSectionOrder;
  @attr('number') jobApplicationCount;
  @attr('number') scoreCount;
  @attr('number') experienceCount;
  @attr('number') skillCount;
  @belongsTo('user', { async: true, inverse: 'resumes' }) user;
  @hasMany('score', { async: true, inverse: 'resume' }) scores;
  @hasMany('cover-letter', { async: true, inverse: 'resume' }) coverLetters;
  @hasMany('job-application', { async: true, inverse: 'resume' })
  jobApplications;
  @hasMany('experience', { async: true, inverse: 'resume' }) experiences;
  @hasMany('education', { async: true, inverse: 'resume' }) educations;
  @hasMany('summary', { async: true, inverse: 'resume' }) summaries;
  @hasMany('certification', { async: true, inverse: 'resume' }) certifications;
  @hasMany('skill', { async: true, inverse: 'resume' }) skills;
  @hasMany('project', { async: true, inverse: 'resume' }) projects;

  get sortedExperiences() {
    // Server returns experiences ordered by ResumeExperience.order. Preserve
    // that order — it reflects either the import sequence or a drag-reorder
    // the user has since applied.
    const exps = this.hasMany('experiences').value();
    if (!exps) return [];
    const arr = [];
    for (const e of exps) arr.push(e);
    return arr;
  }

  get activeSummary() {
    const summaries = this.hasMany('summaries').value();
    if (!summaries) return null;
    for (const s of summaries) {
      if (s.active) return s;
    }
    return null;
  }

  get sectionRenderOrder() {
    // Prefer the API-computed effectiveSectionOrder so the frontend
    // never gets out of sync with archetype defaults defined server-side.
    // Fall back to CANONICAL_SECTION_ORDER for slim responses or older
    // payloads that don't include the attribute.
    const fromApi = this.effectiveSectionOrder;
    if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
    return CANONICAL_SECTION_ORDER;
  }
}
