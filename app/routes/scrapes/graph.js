import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScrapesGraphRoute extends Route {
  @service api;

  async model({ scrape_id }) {
    const [trace, structure] = await Promise.all([
      fetch(this.api.url(`/api/v1/scrapes/${scrape_id}/graph-trace/`), {
        headers: this.api.headers(),
      })
        .then((r) => (r.ok ? r.json() : { data: [], meta: { chain: [] } }))
        .catch(() => ({ data: [], meta: { chain: [] } })),
      fetch(this.api.url('/api/v1/admin/graph-structure/'), {
        headers: this.api.headers(),
      })
        .then((r) => (r.ok ? r.json() : { data: { nodes: [], edges: [] } }))
        .catch(() => ({ data: { nodes: [], edges: [] } })),
    ]);
    return {
      scrapeId: scrape_id,
      trace: trace?.data || [],
      chain: trace?.meta?.chain || [],
      structure: structure?.data || { nodes: [], edges: [] },
    };
  }
}
