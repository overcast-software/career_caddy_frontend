import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowScrapesShowRoute extends Route {
  @service store;

  model({ scrape_id }) {
    return this.store.findRecord('scrape', scrape_id, {
      include: 'company,job-post,scrape-statuses,scrapes,source-scrape',
    });
  }
}
