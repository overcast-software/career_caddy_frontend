import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ScrapesGraphRoute extends Route {
  @service api;

  async model({ scrape_id }) {
    const [trace, mermaid] = await Promise.all([
      fetch(`/api/v1/scrapes/${scrape_id}/graph-trace/`, {
        headers: this.api.headers(),
      })
        .then((r) => (r.ok ? r.json() : { data: [], meta: { chain: [] } }))
        .catch(() => ({ data: [], meta: { chain: [] } })),
      fetch('/api/v1/admin/graph-mermaid/', {
        headers: this.api.headers(),
      })
        .then((r) => (r.ok ? r.json() : { data: { mermaid: '' } }))
        .catch(() => ({ data: { mermaid: '' } })),
    ]);
    return {
      scrapeId: scrape_id,
      trace: trace?.data || [],
      chain: trace?.meta?.chain || [],
      mermaid: mermaid?.data?.mermaid || '',
    };
  }
}
