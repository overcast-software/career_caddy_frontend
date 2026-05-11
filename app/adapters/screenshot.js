import ApplicationAdapter from './application';

// Sub-collection GET on a parent Scrape. The api endpoint is
// /api/v1/scrapes/:scrape_id/screenshots/ — staff-only, returns
// JSON:API screenshot resources. The poller writes screenshots
// mid-lifecycle, so the api sets Cache-Control: no-store; the
// browser revalidates on every visit.
//
// Mirrors the scrape-status adapter pattern from Phase 5.
export default class ScreenshotAdapter extends ApplicationAdapter {
  urlForQuery(query) {
    const scrapeId = query.scrape_id;
    if (scrapeId != null) {
      delete query.scrape_id;
      return this.buildURL('scrape', scrapeId) + 'screenshots/';
    }
    return super.urlForQuery(...arguments);
  }
}
