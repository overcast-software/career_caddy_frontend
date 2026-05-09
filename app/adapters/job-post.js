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
}
