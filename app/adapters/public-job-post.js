import JSONAPIAdapter from '@ember-data/adapter/json-api';
import config from 'career-caddy-frontend/config/environment';

// Adapter for the PUBLIC `/<username>` profile page (CC #51).
//
// Deliberately extends the base JSONAPIAdapter, NOT app/adapters/application.js,
// because GET /api/v1/u/:username/job-posts/ is AllowAny / no-auth and must
// work for a LOGGED-OUT visitor. The application adapter would defeat both
// requirements: (1) its `headers` getter injects the JWT Authorization
// header, and (2) its `ajax` short-circuits every request when the session
// is unauthenticated — returning `{ data: [] }` and redirecting to /login or
// /docs, so the api would never be reached while logged out. Starting from
// the base adapter and adding only host/namespace + the sub-collection URL
// gives a clean public access path (canonical pattern #3: sub-collection
// read via urlForQuery + store.query).
export default class PublicJobPostAdapter extends JSONAPIAdapter {
  get host() {
    return config.APP.API_HOST || undefined;
  }
  namespace = config.APP.API_NAMESPACE;

  // No Authorization header — this endpoint is public by contract.
  get headers() {
    return {};
  }

  // Mirror the application adapter's trailing-slash contract. The Django
  // router accepts both `/endpoint` and `/endpoint/`; matching the trailing
  // slash avoids an extra 301 round-trip.
  buildURL(...args) {
    const url = super.buildURL(...args);
    if (url.endsWith('/')) return url;
    if (url.includes('?')) {
      const [base, query] = url.split('?');
      return `${base.endsWith('/') ? base : base + '/'}?${query}`;
    }
    return `${url}/`;
  }

  // Sub-collection read: GET /api/v1/u/:username/job-posts/. The route calls
  // store.query('public-job-post', { username }); `username` is consumed to
  // build the path and is never forwarded as a query param.
  urlForQuery(query) {
    const username = encodeURIComponent(query.username);
    delete query.username;
    const host = this.host || '';
    const namespace = this.namespace ? `/${this.namespace}` : '';
    return `${host}${namespace}/u/${username}/job-posts/`;
  }
}
