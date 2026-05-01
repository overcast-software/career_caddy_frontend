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

const HOST_RE = /^https?:\/\/([^/]+)/i;
function _hostnameOf(u) {
  if (!u) return '';
  const m = HOST_RE.exec(u);
  return m ? m[1] : u;
}

export default class JobPostModel extends Model {
  @attr('date') createdAt;
  @attr('string') description;
  @attr('string') title;
  @attr('date') postedDate;
  @attr('date') extractionDate;
  @attr('string') link;
  @attr('string') canonicalLink;
  @attr('number') duplicateOfId;
  // Apply-destination resolver fields. Populated by the scrape-graph
  // ResolveApplyUrl node via PATCH /scrapes/:id/apply-url/. See
  // notes.org::*Apply-destination resolution.
  @attr('string') applyUrl;
  @attr('string') applyUrlStatus;
  @attr('date') applyUrlResolvedAt;
  // 'open' / 'closed' / null. null = unknown — historical posts and
  // anything the extractor's text-signals didn't fire on. List view
  // hides 'closed' by default; jp.show surfaces a chip only on closed.
  // Named `postingStatus` (not `applicationStatus`) to avoid
  // collision with `JobApplication.status`, the user's per-application
  // state (Applied / Interview Scheduled / ...).
  @attr('string') postingStatus;
  // `triage` is sourced from JSON:API `meta.triage` on the server response,
  // NOT from a column on the JobPost row. It carries the CALLING USER's
  // latest triage state for this (shared) post: status + reason_code +
  // free-text note. Different users will receive different `triage`
  // objects for the same post. It lands here as an attr because the
  // application serializer flattens resource-level `meta` into
  // `attributes` (see app/serializers/application.js), which lets us read
  // it off the record like any other field while keeping the server
  // response honest about where the data lives.
  //
  // Shape: { status: string|null, reason_code: string|null, note: string|null }
  //
  // Do NOT PATCH this back to the server — the API ignores it on writes.
  // Per-user triage mutations go through POST /job-posts/:id/triage/.
  @attr() triage;
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

  // Distinct URLs that reach this posting: canonical, apply destination,
  // plus each scrape's url + sourceLink (the tracker / aggregator URL the
  // scrape was created from). Used by <JobPosts::AliasesPanel> on the
  // show page so the user can see that an email-tracker URL, a Dice
  // mirror, and the employer apply page all point at the same record.
  get urlAliases() {
    const seen = new Map();
    const push = (url, label) => {
      if (!url) return;
      if (!seen.has(url)) {
        seen.set(url, { url, label, hostname: _hostnameOf(url) });
      }
    };
    push(this.link, 'Canonical');
    if (this.canonicalLink && this.canonicalLink !== this.link) {
      push(this.canonicalLink, 'Canonical');
    }
    if (this.applyUrlStatus === 'resolved') push(this.applyUrl, 'Apply');
    const scrapes = this.hasMany('scrapes').value() || [];
    for (const s of scrapes) {
      push(s.url, 'Scraped');
      push(s.sourceLink, 'Tracker');
    }
    return [...seen.values()];
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
