import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class ScrapesGraphRoute extends Route {
  @service api;
  @service store;

  async model({ scrape_id }) {
    const [traceResult, structure] = await Promise.all([
      this.store
        .query('scrape-status', { scrape_id })
        .catch(() => ({ meta: { chain: [] } })),
      // Bucket 4 (non-resource GET). This carried a `KEEP raw fetch:`
      // note saying a typed report client would be needed — that client
      // shipped as reportFetch the same day the note was written, and
      // app/routes/admin/scrape-graph.js:10 has been calling THIS EXACT
      // endpoint through it ever since. The exception documented history,
      // not a constraint.
      //
      // The .catch stays: reportFetch maps a non-ok response to
      // {error:'failed', data:null} but lets a network-level rejection
      // through, and this panel degrades to an empty graph rather than
      // failing the whole route.
      reportFetch(this.api, 'admin/graph-structure').catch(() => ({
        data: null,
      })),
    ]);
    // Trace consumer (ScrapeGraph::Dagre) wants flat dicts shaped like
    // {scrape_id, graph_node, graph_payload, note, created_at}. Compose
    // them from the live ScrapeStatus records so the template stays
    // unchanged and the records can still be inspected via the store.
    //
    // store.query() returns an AdapterPopulatedRecordArray which is
    // iterable in Ember Data 5+ but no longer exposes .toArray(). The
    // old `traceResult.toArray?.() ?? []` silently returned [] and the
    // graph rendered with no visited path. Array.from is correct here
    // because the result feeds a one-shot snake_case composition for
    // a non-reactive d3 render — not a tracked template consumer.
    const traceRows = traceResult ? Array.from(traceResult) : [];
    const trace = traceRows.map((row) => ({
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
