import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScrapesGraphRoute extends Route {
  @service api;
  @service store;

  async model({ scrape_id }) {
    const [traceResult, structure] = await Promise.all([
      this.store
        .query('scrape-status', { scrape_id })
        .catch(() => ({ meta: { chain: [] } })),
      // KEEP raw fetch: /admin/graph-structure/ is a non-resource admin
      // endpoint with no underlying Ember Data model. Migrating it would
      // need a typed report client (separate plan).
      fetch(this.api.url('/api/v1/admin/graph-structure/'), {
        headers: this.api.headers(),
      })
        .then((r) => (r.ok ? r.json() : { data: { nodes: [], edges: [] } }))
        .catch(() => ({ data: { nodes: [], edges: [] } })),
    ]);
    // Trace consumer (ScrapeGraph::Dagre) wants flat dicts shaped like
    // {scrape_id, graph_node, graph_payload, note, created_at}. Compose
    // them from the live ScrapeStatus records so the template stays
    // unchanged and the records can still be inspected via the store.
    const trace = (traceResult.toArray?.() ?? []).map((row) => ({
      scrape_id: row.belongsTo('scrape')?.id?.(),
      graph_node: row.graphNode,
      graph_payload: row.graphPayload,
      note: row.note,
      created_at: row.createdAt?.toISOString?.() ?? row.createdAt,
    }));
    return {
      scrapeId: scrape_id,
      trace,
      chain: traceResult?.meta?.chain || [],
      structure: structure?.data || { nodes: [], edges: [] },
    };
  }
}
