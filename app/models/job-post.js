import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

// Keep in sync with STUB_MIN_WORDS in
// api/job_hunting/lib/services/application_flow.py. A post is a "stub"
// when its description is too thin to be useful — typically email-pipeline
// junk that never got an enriched scrape.
export const STUB_MIN_WORDS = 60;

function _firstNonTerminal(records) {
  if (!records) return null;
  for (const r of records) {
    if (r?.status && !TERMINAL.has(r.status)) return r;
  }
  return null;
}

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

  // Active work derived from scrapes / scores relationships — any record
  // whose `status` isn't in the shared TERMINAL set counts as in-flight.
  // Callers that want these live across a page reload should include
  // `scrapes,scores` on the list fetch so the inverses populate from
  // server state rather than only session-created records.
  get activeScrape() {
    return _firstNonTerminal(this.hasMany('scrapes').value());
  }

  get activeScore() {
    return _firstNonTerminal(this.hasMany('scores').value());
  }

  get busyPhase() {
    if (this.activeScrape) return 'Scraping…';
    if (this.activeScore) return 'Scoring…';
    return null;
  }

  get isWorking() {
    return this.busyPhase !== null;
  }

  // Has the user already produced at least one score for this post?
  // Used on the /job-posts list so a thin-description post that's
  // nonetheless been scored doesn't keep nagging 'Scrape & Score' —
  // the work is done, flip to the plain Score link.
  get hasAnyScore() {
    const scores = this.hasMany('scores').value();
    return (scores?.length || 0) > 0;
  }
}
