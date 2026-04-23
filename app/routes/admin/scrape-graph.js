import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AdminScrapeGraphRoute extends Route {
  @service api;

  async model() {
    const [mermaid, aggregate] = await Promise.all([
      this._fetch('/api/v1/admin/graph-mermaid/').catch(() => ({})),
      this._fetch('/api/v1/admin/graph-aggregate/?since=7d').catch(() => ({})),
    ]);
    return {
      mermaid: mermaid?.data?.mermaid || '',
      aggregate: aggregate?.data?.edges || [],
      meta: aggregate?.meta || {},
    };
  }

  _fetch(path) {
    return fetch(path, {
      headers: this.api.headers(),
    }).then((r) =>
      r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
    );
  }
}
