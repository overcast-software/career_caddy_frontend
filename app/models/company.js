import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { apiAction } from 'career-caddy-frontend/utils/api-action';
export default class CompanyModel extends Model {
  @attr('string') name;
  @attr('string') displayName;
  @attr('string') note;
  // Phase 6a — federation handle + opt-in toggle. ``slug`` is the
  // public WebFinger handle (nullable until backfilled, staff can
  // edit). ``federationEnabled`` is the operator-visible toggle that
  // controls whether the AS2 actor + Subscribe affordance light up.
  // Both surface on the JSON:API read path; PATCH flows through the
  // standard CompanyViewSet.update.
  @attr('string') slug;
  @attr('boolean', { defaultValue: false }) federationEnabled;
  @attr('number') jobPostsCount;
  @attr('number') jobApplicationsCount;
  @attr('number') scrapesCount;
  @attr('number') questionsCount;
  @attr('number') scoresCount;
  @hasMany('job-post', { async: true, inverse: 'company' }) jobPosts;

  get sortedJobPosts() {
    const posts = this.hasMany('jobPosts').value();
    if (!posts) return [];
    const arr = [];
    for (const p of posts) arr.push(p);
    // postedDate is a calendar string ("YYYY-MM-DD"); createdAt is an ISO
    // instant. Both sort correctly as strings (ISO 8601 is lexicographic),
    // and mixing them via `new Date(calendar_string)` would parse as UTC
    // midnight and drift under PST — avoid Date construction entirely.
    const key = (p) => p.postedDate || p.createdAt || '';
    return arr.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) return 0;
      return ka < kb ? 1 : -1;
    });
  }
  @hasMany('scrape', { async: true, inverse: 'company' }) scrapes;
  @hasMany('question', { async: true, inverse: 'company' }) questions;
  @hasMany('experience', { async: true, inverse: 'company' }) experiences;
  @hasMany('job-application', { async: true, inverse: 'company' })
  jobApplications;

  get sortedJobApplications() {
    const apps = this.hasMany('jobApplications').value();
    if (!apps) return [];
    const arr = [];
    for (const a of apps) arr.push(a);
    // Both appliedAt and createdAt are ISO instants from the API. Lexical
    // string compare = chronological (ISO 8601 property).
    const key = (a) => a.appliedAt || a.createdAt || '';
    return arr.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      if (ka === kb) return 0;
      return ka < kb ? 1 : -1;
    });
  }
  @hasMany('score', { async: true, inverse: 'company' }) scores;
  @hasMany('project', { async: true, inverse: null }) projects;
  // Phase A self-FK dedupe shape (api PR #176):
  //   `canonical` (belongsTo Company) — NULL when this row IS canonical.
  //   `aliases` (hasMany Company, inverse: 'canonical') — every Company
  //   whose `canonical_id == self.id` (one-level deep by invariant).
  // Sub-collection: GET /api/v1/companies/:id/aliases/ returns Company
  // resources; the admin/companies/show route requests
  // ``include=aliases,canonical`` so the relationship is materialized
  // synchronously by first paint.
  @hasMany('company', { async: true, inverse: 'canonical' }) aliases;
  @belongsTo('company', { async: true, inverse: 'aliases' }) canonical;

  // Staff-only verb: POST /api/v1/companies/:id/mark-as-alias-of/
  // Sets ``self.canonical_id = target_id``, flattening alias chains
  // (api walks to root + repoints any rows currently aliased at self).
  // Body shape: { target_id: <int> }. Returns the updated source
  // Company resource — auto-pushed through apiAction so the resolved
  // value is the live store-backed record.
  //
  // No companion "unmark" verb exists on the api yet; promoting an
  // alias back to canonical is not supported in Phase A.
  markAsAliasOf(targetId) {
    return apiAction(this, {
      method: 'POST',
      path: 'mark-as-alias-of',
      data: { target_id: targetId },
    });
  }

  // Staff-only verb: POST /api/v1/companies/:id/merge-into/
  // Moves all FKs (JobPost, Scrape, JobApplication, CompanyAlias)
  // from this Company into ``targetId`` and deletes the source.
  // Returns the target Company resource — the response is auto-pushed
  // through apiAction so the resolved record is the live store-backed
  // target. Caller should transitionTo the target after success.
  mergeInto(targetId) {
    return apiAction(this, {
      method: 'POST',
      path: 'merge-into',
      data: { target_id: targetId },
    });
  }
}
