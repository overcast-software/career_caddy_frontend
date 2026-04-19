import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

// Keep in sync with STUB_MIN_WORDS in
// api/job_hunting/lib/services/application_flow.py. A post is a "stub"
// when its description is too thin to be useful — typically email-pipeline
// junk that never got an enriched scrape.
export const STUB_MIN_WORDS = 20;

export default class JobPostModel extends Model {
  @attr('date') createdAt;
  @attr('string') description;
  @attr('string') title;
  @attr('date') postedDate;
  @attr('date') extractionDate;
  @attr('string') link;
  @attr('string') activeApplicationStatus;
  @attr('string', { defaultValue: 'manual' }) source;
  @belongsTo('score', { async: true, inverse: null }) topScore;
  @belongsTo('company', { async: true, inverse: 'jobPosts' }) company;
  @hasMany('score', { async: true, inverse: 'jobPost' }) scores;
  @hasMany('scrape', { async: true, inverse: 'jobPost' }) scrapes;
  @hasMany('cover-letter', { async: true, inverse: 'jobPost' }) coverLetters;
  @hasMany('job-application', { async: true, inverse: 'jobPost' })
  jobApplications;
  @hasMany('question', { async: true, inverse: 'jobPost' }) questions;
  @hasMany('summary', { async: true, inverse: 'jobPost' }) summaries;

  get needsScrape() {
    return !this.description?.trim();
  }

  get isStub() {
    const desc = (this.description || '').trim();
    if (!desc) return true;
    return desc.split(/\s+/).length < STUB_MIN_WORDS;
  }
}
