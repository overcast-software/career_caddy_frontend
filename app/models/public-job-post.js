import Model, { attr } from '@ember-data/model';

// Read-only projection of a PUBLISHED (audience-public) JobPost, served by the
// public no-auth endpoint GET /api/v1/users/:username/job-posts/federated/
// (CC #51) — the human-readable twin of the ActivityPub actor outbox.
//
// This is a DEDICATED model, intentionally NOT the `job-post` model, so the
// public page is fully isolated from the authenticated app: its own adapter
// (no Authorization header, no unauthenticated short-circuit — see
// app/adapters/public-job-post.js) and its own identity map. Querying the
// real `job-post` model here would route through app/adapters/job-post.js →
// app/adapters/application.js, which injects JWT and returns `{ data: [] }`
// for logged-out visitors.
//
// No relationships are declared on purpose. The public serializer denormalizes
// `company_name` onto the resource rather than sideloading a `company`
// resource (the response carries NO relationships block and NO `included`),
// which keeps this loop-proof: declaring an async hasMany/belongsTo the api
// doesn't emit triggers the uninitialized-relationship runaway-fetch loop
// (frontend memory: fe-aliases-hasmany-runaway-fetch).
//
// Attributes mirror what the api/v1/users/:username/job-posts/federated/
// endpoint emits (api PR #195). The serializer deliberately omits private
// fields (scores/applications/triage). `keyForAttribute` in
// app/serializers/application.js snake_cases each attr, so `companyName` reads
// `company_name`, `postedDate` reads `posted_date`, `createdAt` reads
// `created_at`. Only the fields this page actually renders are declared; the
// remaining contract fields (description/apply_url/remote/salary_*/
// posting_status) are left off intentionally to keep the projection lean.
export default class PublicJobPostModel extends Model {
  @attr('string') title;
  @attr('string') link;
  @attr('string') companyName;
  @attr('string') location;
  @attr('date') postedDate;
  @attr('date') createdAt;
}
