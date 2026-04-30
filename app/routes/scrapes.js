import Route from '@ember/routing/route';
import { service } from '@ember/service';
export default class ScrapesRoute extends Route {
  @service store;
  async model() {
    // Sparse fieldsets — drop `html` (multi-MB raw page) and `css_selectors`.
    // Without this the index ships ~8MB across the list.
    return this.store.findAll('scrape', {
      include: 'company,job-post',
      adapterOptions: {
        fields: {
          scrape:
            'url,source_link,status,scraped_at,parse_method,external_link,job_content,latest_status_note',
        },
      },
    });
  }
}
