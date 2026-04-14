import Model, { attr, belongsTo } from '@ember-data/model';

export default class ScrapeStatusModel extends Model {
  @attr('date') loggedAt;
  @attr('string') note;
  @attr('date') createdAt;
  @belongsTo('scrape', { async: true, inverse: 'scrapeStatuses' }) scrape;
  @belongsTo('status', { async: true, inverse: null }) status;
}
