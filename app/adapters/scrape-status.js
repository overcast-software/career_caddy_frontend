import ApplicationAdapter from './application';

// Sub-collection GET on a parent Scrape. When the query carries
// `scrape_id`, route to `/api/v1/scrapes/:scrape_id/graph-trace/`,
// which returns ordered ScrapeStatus rows for the source-scrape
// chain plus `meta.chain` describing the redirect lineage. Falls
// back to the default JSONAPIAdapter URL when no scrape_id is
// present — but there is no canonical /scrape-statuses/ index
// today, so callers should always pass scrape_id.
export default class ScrapeStatusAdapter extends ApplicationAdapter {
  urlForQuery(query) {
    const scrapeId = query.scrape_id;
    if (scrapeId != null) {
      delete query.scrape_id;
      return this.buildURL('scrape', scrapeId) + 'graph-trace/';
    }
    return super.urlForQuery(...arguments);
  }
}
