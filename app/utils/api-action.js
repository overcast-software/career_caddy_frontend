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
// Reads of a sub-collection (e.g. graph-trace) belong in a model +
// adapter with `urlForQuery`, not here — apiAction is for *verbs*.
export async function apiAction(record, { method, path, data } = {}) {
  const store = record.store;
  const identifier = recordIdentifierFor(record);
  const modelName = identifier.type;
  const adapter = store.adapterFor(modelName);
  const url = adapter.buildURL(modelName, identifier.id) + path + '/';
  const payload = await adapter.ajax(url, method, data ? { data } : undefined);
  if (!payload || typeof payload !== 'object' || payload.data == null) {
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

// Collection-level counterpart: POST /api/v1/<resource>/<path>/ (no :id).
// Same response handling as apiAction — JSON:API single resources are
// auto-pushed and the live record is returned; arrays / non-resource
// shapes come back raw. Use from a model static:
//
//   static fromText(store, payload) {
//     return collectionAction(store, 'scrape', {
//       method: 'POST', path: 'from-text', data: payload,
//     });
//   }
export async function collectionAction(
  store,
  modelName,
  { method, path, data } = {},
) {
  const adapter = store.adapterFor(modelName);
  const url = adapter.buildURL(modelName) + path + '/';
  const payload = await adapter.ajax(url, method, data ? { data } : undefined);
  if (!payload || typeof payload !== 'object' || payload.data == null) {
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
    null,
    method === 'DELETE' ? 'deleteRecord' : 'updateRecord',
  );
  store.push(normalized);
  const responseId = Array.isArray(payload.data) ? null : payload.data?.id;
  if (!responseId) return payload;
  return store.peekRecord(responseType, responseId);
}
