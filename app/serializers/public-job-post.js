import ApplicationSerializer from './application';

// Serializer for the public `/<username>` profile page (CC #51).
//
// The endpoint (GET /api/v1/users/:username/job-posts/federated/) returns
// JobPost resources, so each record's JSON:API `type` is "job-post". Coerce
// that onto the dedicated read-only `public-job-post` model so
// store.query('public-job-post', ...) resolves to these records — and never
// bleeds into the authenticated `job-post` identity map (whose adapter injects
// auth + short-circuits when logged out).
//
// Inherits everything else from ApplicationSerializer: `keyForAttribute`
// snake_cases attrs (company_name → companyName, created_at → createdAt) and
// `normalize` merges resource-level JSON:API `meta` into attributes.
export default class PublicJobPostSerializer extends ApplicationSerializer {
  modelNameFromPayloadType(payloadType) {
    const normalized = super.modelNameFromPayloadType(payloadType);
    return normalized === 'job-post' ? 'public-job-post' : normalized;
  }
}
