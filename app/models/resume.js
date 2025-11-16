import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

export default class ResumeModel extends Model {
  @attr('string') content;
  @attr('string') filePath;
  @attr('string') title;
  @attr('string') name;
  @attr('string') notes;
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
  get activeSummary() {
    return this.summaries.content.find((summary) => summary.active)
  }
}
