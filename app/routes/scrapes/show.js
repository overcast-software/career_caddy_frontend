import Route from '@ember/routing/route';
import { service } from '@ember/service';

// Max depth for the redirect-chain walk. Real chains are 1–2 hops
// (tracker URL -> canonical with jobId param). Cap defends against
// any future pathological cycle the dedupe pipeline might emit.
const MAX_CHAIN_DEPTH = 10;

export default class ScrapesShowRoute extends Route {
  @service store;

  async model({ scrape_id }) {
    // Sparse fieldsets — drop `html` (multi-MB raw page) and `css_selectors`.
    // Without this the show endpoint ships ~8MB per scrape.
    const scrape = await this.store.findRecord('scrape', scrape_id, {
      include: 'company,job-post,scrape-statuses',
      adapterOptions: {
        fields: {
          scrape:
            'url,source_link,status,scraped_at,parse_method,external_link,job_content,latest_status_note',
        },
      },
    });
    const { canonicalScrape, jobPost } = await this._walkToCanonical(scrape);
    return { scrape, canonicalScrape, jobPost };
  }

  // Descend the child-scrape chain looking for the scrape that owns the
  // JobPost. Tracker URLs (e.g. governmentjobs.com search redirect) create
  // a parent Scrape with no JobPost; the canonical child gets the
  // JobPost during PersistJobPost. Mirrors the source_scrape walk on the
  // api `/scrapes/:id/graph-trace/` endpoint but in the opposite
  // direction: graph-trace walks up from the requested scrape to the
  // root; here we walk down from the requested scrape to the leaf so
  // the show page surfaces the canonical JobPost.
  async _walkToCanonical(rootScrape) {
    let cursor = rootScrape;
    const visited = new Set([cursor.id]);
    for (let i = 0; i < MAX_CHAIN_DEPTH; i++) {
      const jobPost = await cursor.jobPost;
      if (jobPost) {
        return { canonicalScrape: cursor, jobPost };
      }
      const children = await cursor.scrapes;
      let next = null;
      // Iterate the ManyArray with for...of — never .slice()/.toArray()
      // an Ember Data record array (memory: no_slice_on_ember_data_arrays).
      for (const child of children) {
        if (!visited.has(child.id)) {
          next = child;
          break;
        }
      }
      if (!next) {
        return { canonicalScrape: null, jobPost: null };
      }
      visited.add(next.id);
      cursor = next;
    }
    return { canonicalScrape: null, jobPost: null };
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    controller.startPollingIfPending();
  }
}
