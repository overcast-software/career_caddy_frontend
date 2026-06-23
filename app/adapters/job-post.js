import ApplicationAdapter from './application';

export default class JobPostAdapter extends ApplicationAdapter {
  /** Public profile feed (CC #51): map
   *    store.query('job-post', { username, page })
   *  onto GET /api/v1/users/:username/job-posts/federated/ (api PR #195,
   *  AllowAny, KEYSET pagination — page[after]=<cursor> + meta.next_cursor).
   *  Branch ONLY when `username` is present so the regular /job-posts list
   *  query (search/filter/sort/infinity paging) is completely untouched.
   *  `username` builds the path; the `page` params ride through as the query
   *  string. The application adapter whitelists this endpoint so a logged-out
   *  visitor reaches it without the unauthenticated short-circuit. */
  urlForQuery(query) {
    if (query.username) {
      const username = encodeURIComponent(query.username);
      delete query.username;
      // buildURL('user') → ".../users/" (trailing slash via the application
      // adapter's buildURL override); append the sub-collection path.
      return `${this.buildURL('user')}${username}/job-posts/federated/`;
    }
    return super.urlForQuery(...arguments);
  }

  /** Staff-only: kick off a browser-driven scrape that resolves
   * redirects + captures the apply URL but skips LLM extraction.
   * Resolves to the new Scrape resource; the application adapter's
   * `ajax` chain handles auth + JSON:API error normalization on
   * non-2xx so callers can simply chain .catch(). */
  resolveAndDedupe(jobPost) {
    const url = this.buildURL('job-post', jobPost.id) + 'resolve-and-dedupe/';
    return this.ajax(url, 'POST');
  }

  /** Staff-only: server-side cascade-delete of the JobPost and every
   * child relation (scrapes, scores, applications, questions, etc.).
   * Returns the promise from ApplicationAdapter.ajax — caller is
   * responsible for clearing the record from the local store via
   * deleteRecord() + unloadRecord() so any live tracked arrays
   * (ember-infinity lists, peekAll consumers) drop their reference
   * before next render.
   */
  nuclearDelete(jobPost) {
    const url = this.buildURL('job-post', jobPost.id) + 'nuclear/';
    return this.ajax(url, 'DELETE');
  }
}
