import ApplicationAdapter from './application';

export default class JobPostAdapter extends ApplicationAdapter {
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
