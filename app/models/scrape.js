import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import {
  apiAction,
  collectionAction,
} from 'career-caddy-frontend/utils/api-action';
import { TERMINAL } from 'career-caddy-frontend/services/pollable';

export default class ScrapeModel extends Model {
  @attr('string') url;
  @attr('string') sourceLink;
  @attr('string') cssSelectors;
  @attr('string') jobContent;
  @attr('string') externalLink;
  @attr('string') parseMethod;
  @attr('date') scrapedAt;
  @attr('string') status;
  @attr('string') html;
  @attr('string') latestStatusNote;
  @attr('boolean', { defaultValue: false }) skipExtract;
  @belongsTo('job-post', { async: true, inverse: 'scrapes' }) jobPost;
  @belongsTo('company', { async: true, inverse: 'scrapes' }) company;
  @hasMany('scrape', { async: true, inverse: 'sourceScrape' }) scrapes;
  @belongsTo('scrape', { async: true, inverse: 'scrapes' }) sourceScrape;
  @hasMany('scrape-status', { async: true, inverse: 'scrape' }) scrapeStatuses;

  parse() {
    return apiAction(this, { method: 'POST', path: 'parse' });
  }

  redo() {
    return apiAction(this, { method: 'POST', path: 'redo' });
  }

  static fromText(store, payload) {
    return collectionAction(store, 'scrape', {
      method: 'POST',
      path: 'from-text',
      data: payload,
    });
  }

  // Server-derived "in flight" gate; F5-survivable. See ScoreModel.isPending.
  // Note: Scrape uses a richer status vocabulary than the AI resources
  // (extracting, updating_profile, hold, …); anything not in TERMINAL is
  // treated as in-flight.
  get isPending() {
    return this.status && !TERMINAL.has(this.status);
  }
}
