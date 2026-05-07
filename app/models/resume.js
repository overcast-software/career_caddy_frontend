import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ResumeModel extends Model {
  @attr('string') content;
  @attr('string') filePath;
  @attr('string') title;
  @attr('string') name;
  @attr('string') notes;
  @attr('boolean') favorite;
  @attr('string') status;
  @attr('string') profession;
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
}
