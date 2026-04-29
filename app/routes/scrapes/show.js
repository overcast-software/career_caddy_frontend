import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScrapesShowRoute extends Route {
  @service store;

  model({ scrape_id }) {
    // Sparse fieldsets — drop `html` (multi-MB raw page) and `css_selectors`.
    // Without this the show endpoint ships ~8MB per scrape.
    return this.store.findRecord('scrape', scrape_id, {
      include: 'company,job-post,scrape-statuses',
      adapterOptions: {
        fields: {
          scrape:
            'url,source_link,status,scraped_at,parse_method,external_link,job_content,latest_status_note',
        },
      },
    });
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.startPollingIfPending();
  }
}
