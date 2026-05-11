import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { reportFetch } from 'career-caddy-frontend/utils/report-fetch';

export default class AdminScrapeGraphRoute extends Route {
  @service api;

  async model() {
    const [structure, mermaid, aggregate] = await Promise.all([
      reportFetch(this.api, 'admin/graph-structure'),
      reportFetch(this.api, 'admin/graph-mermaid'),
      reportFetch(this.api, 'admin/graph-aggregate', { since: '7d' }),
    ]);
    return {
      structure: structure.data || { nodes: [], edges: [] },
      mermaid: mermaid.data?.mermaid || '',
      aggregate: aggregate.data?.edges || [],
      meta: aggregate.meta || {},
    };
  }
}
