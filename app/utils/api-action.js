import { recordIdentifierFor } from '@ember-data/store';

// Invoke a non-CRUD verb on a model record through the application
// adapter. Inherits JWT auth + 401 retry + buildURL's trailing-slash
// convention. JSON:API responses are normalized via the model
// serializer and pushed into the store, so the resolved value is a
// live store-backed record (same identity-mapped instance the
// template is already rendering).
//
// Use from model methods:
//
//   resolveAndDedupe() {
//     return apiAction(this, { method: 'POST', path: 'resolve-and-dedupe' });
//   }
//
// For verbs whose response shape isn't JSON:API (e.g. /graph-trace
// returns a flat list), pass `raw: true` to bypass normalization and
// get the parsed JSON body back unchanged.
export async function apiAction(
  record,
  { method, path, data, raw = false } = {},
) {
  const store = record.store;
  const identifier = recordIdentifierFor(record);
  const modelName = identifier.type;
  const adapter = store.adapterFor(modelName);
  const url = adapter.buildURL(modelName, identifier.id) + path + '/';
  const payload = await adapter.ajax(url, method, data ? { data } : undefined);
  if (raw || !payload || typeof payload !== 'object' || payload.data == null) {
    return payload;
  }
  const responseType =
    (Array.isArray(payload.data)
      ? payload.data[0]?.type
      : payload.data?.type) || modelName;
  const modelClass = store.modelFor(responseType);
  const serializer = store.serializerFor(responseType);
  const normalized = serializer.normalizeResponse(
    store,
    modelClass,
    payload,
    identifier.id,
    method === 'DELETE' ? 'deleteRecord' : 'updateRecord',
  );
  store.push(normalized);
  const responseId = Array.isArray(payload.data) ? null : payload.data?.id;
  if (!responseId) return payload;
  return store.peekRecord(responseType, responseId);
}
