import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { apiAction } from 'career-caddy-frontend/utils/api-action';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

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
  // Explicit "needs (re-)scraping" flag. Three sources flip to false:
  // cc_auto email-stub creation, the user clicking "Mark incomplete"
  // on this page, and the scrape-graph's CompletenessReviewer
  // rejecting the persisted output. One source flips back to true:
  // a successful scrape attach via parse_scrape. The extension popup
  // branches on this — complete=true posts get an Open link only;
  // complete=false posts get a Send button.
  @attr('boolean', { defaultValue: true }) complete;
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
  // Possible-duplicate candidates surfaced as the amber banner above
  // jp.show's description. inverse: null because the candidate side is
  // a thin read-only view, not a real bi-directional FK. The custom
  // adapter (urlForFindHasMany) routes loads to the sub-collection
  // endpoint /job-posts/:id/duplicate-candidates/. Loaded by the
  // jp.show route's model() via .hasMany('duplicateCandidates').load()
  // so a route-param change (clicking a candidate's LinkTo to navigate)
  // re-runs the query as part of the model resolution.
  @hasMany('job-post-duplicate-candidate', { async: true, inverse: null })
  duplicateCandidates;

  // Synchronous materialized view of the async hasMany above. The
  // route's model() awaits .reload() so by first paint the relationship
  // is loaded; this getter unwraps the PromiseManyArray (which isn't
  // JS-iterable) into the underlying record array consumers can
  // for...of over. Mirrors the activeScrape / activeScore pattern below
  // and matches the project's "hasMany('rel').value() + for...of" rule
  // for async hasMany access in JS.
  get duplicateCandidatesList() {
    return this.hasMany('duplicateCandidates').value() || [];
  }

  get needsScrape() {
    return !this.description?.trim();
  }

  // Reads the explicit `complete` flag from the api. Replaces the old
  // word-count heuristic — the api now drives this signal via cc_auto
  // email-stub creation, the user's "Mark incomplete" button, and the
  // CompletenessReviewer's verdict on each scrape attach. Kept as
  // `isStub` rather than `isIncomplete` so existing template consumers
  // don't need to change.
  get isStub() {
    return !this.complete;
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
    if (this.canonicalLink && this.canonicalLink !== this.link) {
      push(this.link, 'Link');
      push(this.canonicalLink, 'Canonical');
    } else {
      push(this.link, 'Canonical');
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

  resolveAndDedupe() {
    return apiAction(this, { method: 'POST', path: 'resolve-and-dedupe' });
  }

  nuclearDelete() {
    return apiAction(this, { method: 'DELETE', path: 'nuclear' });
  }

  submitTriage(payload) {
    return apiAction(this, { method: 'POST', path: 'triage', data: payload });
  }

  reextract(payload) {
    return apiAction(this, {
      method: 'POST',
      path: 'reextract',
      data: payload,
    });
  }
}
