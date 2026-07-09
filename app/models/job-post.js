import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { apiAction } from 'career-caddy-frontend/utils/api-action';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

// AS2 (ActivityStreams 2.0) Public collection URI. Mirrored from the
// api's job_post.AS2_PUBLIC — Phase 3.5 prep for Phase 4 ActivityPub
// readiness. Posts whose `audience` list contains this string are
// public. Phase 4 federation dispatch will consult the same field on
// the server; today this drives the jp.edit Visibility selector and the
// jp.show "Private" badge.
export const AS2_PUBLIC = 'https://www.w3.org/ns/activitystreams#Public';

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
  // Phase C dedupe redesign — repost relation FK. Distinct from
  // `duplicateOfId`: a repost is a *new* posting of the same role at
  // a later date (often after a >14-day gap); both rows stay
  // independently queryable. Read-only here; writes flow through the
  // markDuplicateOf verb with payload `{ relation: "repost" }`.
  @attr('number') repostedFromId;
  // Self-referential FK rendered by the api as a `duplicate-of` JSON:API
  // relationship. Reads only — writes go through the markDuplicateOf /
  // unlinkDuplicate / promoteCanonical verb methods so the api can enforce
  // visibility + cycle protection. inverse: null because the reverse
  // (duplicates) is fetched separately via a sub-collection endpoint and
  // we manage cross-side state by reloading post-mutation.
  @belongsTo('job-post', { async: true, inverse: null }) duplicateOf;
  // Self-referential FK for the "this is a repost of an older posting"
  // signal. Set server-side when markDuplicateOf is called with
  // relation="repost"; the bi-directional `reposts` hasMany below is the
  // reverse. Used by jp.show to render the "Reposted from #X" and
  // "X reposts of this" pills. Writes flow through markDuplicateOf with
  // relation="repost", same as duplicateOf.
  @belongsTo('job-post', { async: true, inverse: 'reposts' }) repostedFrom;
  @hasMany('job-post', { async: true, inverse: 'repostedFrom' }) reposts;
  // Apply-destination resolver fields. Populated by the scrape-graph
  // ResolveApplyUrl node via PATCH /scrapes/:id/apply-url/. See
  // notes.org::*Apply-destination resolution.
  @attr('string') applyUrl;
  @attr('string') applyUrlStatus;
  @attr('date') applyUrlResolvedAt;
  @attr('string') location;
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
  // Phase 4 ActivityPub federation — `sourceInstance` is the originating
  // instance hostname (local rows default to env `CAREER_CADDY_INSTANCE`
  // server-side; federated rows carry the remote host). Read-only on the
  // api. `sourceDeletedAt` is non-null only when the origin instance has
  // broadcast an inbound ActivityPub `Delete` for the row — i.e. the
  // original posting has been withdrawn at the source. jp.show keys the
  // "Original posting withdrawn" banner off this field. Read-only; no
  // input flow.
  @attr('string') sourceInstance;
  @attr('date') sourceDeletedAt;
  // ActivityPub-aligned per-post visibility. JSON array of AS2 audience
  // URI strings. Default on the api side is `[AS2_PUBLIC]`; defaulting
  // here mirrors that so optimistic-create rows render with the right
  // badge before the api response lands. Phase 4 will consume this
  // server-side for /as-object/ + Outbox dispatch; today only the
  // jp.edit Visibility selector and the jp.show badge read it.
  @attr('array', { defaultValue: () => [AS2_PUBLIC] }) audience;
  @belongsTo('score', { async: true, inverse: null }) topScore;
  @belongsTo('company', { async: true, inverse: 'jobPosts' }) company;
  // Denormalized company label. Two sources, never both: the authed app payload
  // ships the full `company` relationship above (so `companyName` stays empty
  // and templates read `company.name`); the PUBLIC profile feed
  // (GET /users/:username/job-posts/federated/, api PR #195) has no `company`
  // relationship and instead flattens the name into this attr (`company_name`,
  // snake-cased by app/serializers/application.js). Declaring it as a plain
  // attr — not a second belongsTo — keeps the public page loop-proof: no async
  // relationship the federated endpoint won't emit (see frontend memory
  // fe-aliases-hasmany-runaway-fetch).
  @attr('string') companyName;
  // ── Public federated projection — RICH /@dough card (FRON-121) ──────────
  // Emitted ONLY by GET /users/:username/job-posts/federated/ when the
  // profile owner has opted into the RICH personalized projection. They are
  // denormalized, PUBLIC-SAFE, and OWNER-SCOPED (computed for the profile
  // owner, never the logged-out viewer). All three are ABSENT on the
  // authenticated app payload — those surfaces carry the same signals via the
  // real `scores` / `jobApplications` relationships and `meta.triage`. The
  // <Profile::PostCard> getters read every one null-safe (a missing value
  // drops its pill, never renders "None"). Mirrors the `companyName`
  // denormalization precedent (frontend memory fe-aliases-hasmany-runaway-fetch).
  //
  // `score`: the owner's overall match score (0-100) for THIS post — the
  // public twin of `topScore.score`. NOT the `scores` hasMany / `topScore`
  // belongsTo (both empty on the public projection). Null on authed payloads;
  // do not consume it outside the public card.
  @attr('number') score;
  // `applied`: whether the owner has actually applied (JobApplication.applied_at
  // is non-null) — a bare triage-created JobApplication row does NOT count.
  @attr('boolean') applied;
  // `verdict`: optional flat fallback for the vetting verdict when cc-api emits
  // it as a top-level attribute rather than reusing the `meta.triage` channel
  // (which lands on the `triage` attr above). Shape: a 'Vetted Good'/'Vetted
  // Bad' string OR { status, reason_code }. The free-text vetting note is NEVER
  // emitted on the public projection. The card reads `triage` first, then this.
  @attr() verdict;
  // `federation`: the owner's federation annotations from the public
  // projection's per-resource `meta.federation` (CC-104 / BACK-103). Emitted by
  // GET /users/:username/job-posts/federated/ when the profile owner has
  // `federate_rich=True` (or the requester IS the owner). The application
  // serializer lifts per-resource `meta` onto attributes
  // (app/serializers/application.js), so `meta.federation` lands here as a
  // plain object — the PRIMARY rich-card source, preferred over the flat
  // `score`/`applied`/`verdict`/`triage` fallbacks above. Shape (frozen wire
  // contract): { verdict: 'Vetted Good'|'Vetted Bad'|null,
  // verdict_reason_code: string|null, score: number|null, applied: boolean }.
  // ABSENT on the authenticated app payload (those surfaces use the real
  // relationships + `meta.triage`). <Profile::PostCard> reads every field
  // null-safe so a missing value drops its pill rather than rendering "None".
  @attr() federation;
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

  // Synchronous count of `reposts` for the "X reposts of this" pill on
  // jp.show. Reads the live ManyArray (no .slice() / .toArray()) and
  // falls back to 0 when the relationship hasn't been materialized
  // (e.g. mid-load proxy on first render). jp.show's route may opt to
  // include=reposts on its findRecord so the count renders without a
  // follow-up fetch; absent the include the pill stays hidden, which
  // is the correct "unknown" presentation.
  get repostsCount() {
    const live = this.hasMany('reposts').value();
    return live?.length || 0;
  }

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

  // Mirror of the api's JobPost.is_public() — true iff the AS2 Public
  // URI is in the audience list. Defensive against a missing / non-list
  // audience so the show-page badge renders cleanly on legacy fixtures
  // or mid-load proxies.
  get isPublic() {
    const audience = this.audience;
    if (!Array.isArray(audience)) return false;
    return audience.includes(AS2_PUBLIC);
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

  // Presence of at least one JobApplication for this post — a "peek"
  // signal for the /curate row (CC-64). Reads the live ManyArray
  // (no .slice()/.toArray()); falls back to false when the relationship
  // hasn't materialized (mid-load proxy). Mirrors hasAnyScore. The
  // curate route include=job-applications so the count is real on first
  // paint; absent the include it reads as "none", the correct unknown
  // presentation.
  get hasJobApplications() {
    const applications = this.hasMany('jobApplications').value();
    return (applications?.length || 0) > 0;
  }

  // Presence of at least one Question for this post — the "vetted / has
  // prep" peek signal for the /curate row (CC-64). Same live-array,
  // null-safe shape as hasAnyScore / hasJobApplications.
  get hasQuestions() {
    const questions = this.hasMany('questions').value();
    return (questions?.length || 0) > 0;
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

  // POST /job-posts/:id/mark-duplicate-of/. Payload shape (server-side,
  // see api/job_posts/views.py::mark_duplicate_of):
  //   { target_id: NanoID string (required) — CC-77 #79,
  //     field_overrides?: { title|description|apply_url|location|company: "A"|"B" },
  //     relation?: "duplicate" | "repost" }
  // - field_overrides keys are independent; subset is fine. "A" copies
  //   the *from* (this) JP's value onto the target; "B" keeps the
  //   target's existing value. Omitted keys default to keeping target.
  // - relation="duplicate" (default) sets duplicate_of_id on this JP.
  //   relation="repost" sets reposted_from_id instead; both rows remain
  //   independently queryable.
  markDuplicateOf(payload) {
    return apiAction(this, {
      method: 'POST',
      path: 'mark-duplicate-of',
      data: payload,
    });
  }

  unlinkDuplicate() {
    return apiAction(this, { method: 'POST', path: 'unlink-duplicate' });
  }

  promoteCanonical() {
    return apiAction(this, { method: 'POST', path: 'promote-canonical' });
  }

  // CC-56 C1 — one-click visibility verbs. POST /job-posts/:id/publish/
  // adds the AS2 Public URI to `audience`; /unpublish/ removes it. Both
  // are owner-only on the api and return the updated job-post with
  // `audience` flipped, so apiAction's auto-push reconciles the live
  // record (and thus the `isPublic` getter + show-page badge) without a
  // manual reload. Driven by <JobPosts::PublishToggle>.
  publish() {
    return apiAction(this, { method: 'POST', path: 'publish' });
  }

  unpublish() {
    return apiAction(this, { method: 'POST', path: 'unpublish' });
  }
}
