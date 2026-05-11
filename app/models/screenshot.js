import Model, { attr, belongsTo } from '@ember-data/model';

// Virtual model: no DB row backing it on the api side. The id is a
// composite "<scrape_id>/<filename>" — see the api's
// screenshots action for why. Loaded only via store.query against
// the ScrapeStatusAdapter — there is no /screenshots/:id/ list
// endpoint, only the per-scrape sub-collection at
// /scrapes/:scrape_id/screenshots/.
export default class ScreenshotModel extends Model {
  @attr('string') filename;
  @attr('number') size;
  @attr('date') takenAt;
  @belongsTo('scrape', { async: true, inverse: null }) scrape;
}
