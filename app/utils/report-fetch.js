// Parametric GET against a non-resource api endpoint (reports,
// admin tooling, denormalized summaries). These don't fit Ember
// Data — the response shapes vary per endpoint (sankey, heatmap,
// nested aggregates) and aren't tied to a model class.
//
// Returns a uniform { data, meta, error } envelope:
//   - data:  payload.data (whatever shape that is per endpoint),
//            or null if the request failed.
//   - meta:  payload.meta or null.
//   - error: null on success; 'forbidden' on 403; 'failed' otherwise.
//
// Usage:
//   const { data, meta, error } = await reportFetch(this.api,
//     'reports/sources', { scope: 'mine', source: 'email' });
//   if (error) return fallbackShape(error);
//   return data?.attributes || {};
//
// `path` is the segment under api.baseUrl (e.g. 'reports/sources'
// or 'admin/graph-structure') — no leading or trailing slash; this
// utility appends both.
export async function reportFetch(api, path, params = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    qs.set(k, String(v));
  }
  const query = qs.toString();
  const url = `${api.baseUrl}${path}/${query ? `?${query}` : ''}`;
  const res = await fetch(url, { headers: api.headers() });
  if (res.status === 403) return { data: null, meta: null, error: 'forbidden' };
  if (!res.ok) return { data: null, meta: null, error: 'failed' };
  const payload = await res.json();
  return {
    data: payload?.data ?? null,
    meta: payload?.meta ?? null,
    error: null,
  };
}
