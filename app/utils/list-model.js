// Returns a cached infinity model when the route is re-entered with the
// same params. Suppresses the loading skeleton on return visits — the
// previous InfinityModel resolves synchronously, so Ember never enters
// the loading substate. New records pushed to the store still appear
// (InfinityModel is reactive). Cache invalidates on any param change.
//
// Cache is also discarded if any cached record was destroyed — routes
// are singletons that outlive sessions, so a store.unloadAll (logout)
// or per-record destroyRecord (delete, dedupe-merge) leaves stale
// references that throw Glimmer "tag … destroyed" / Ember Data
// "_graph undefined" assertions when the template walks the proxy.
function _hasDestroyedRecord(model) {
  if (!model) return false;
  let records = null;
  if (Array.isArray(model)) records = model;
  else if (Array.isArray(model.content)) records = model.content;
  else if (typeof model[Symbol.iterator] === 'function') records = model;
  if (!records) return false;
  for (const r of records) {
    if (r?.isDestroyed || r?.isDestroying) return true;
  }
  return false;
}

export function infinityModel(route, modelName, options) {
  const key = `${modelName}:${JSON.stringify(options)}`;
  if (
    route._listCacheKey === key &&
    route._listCacheModel &&
    !_hasDestroyedRecord(route._listCacheModel)
  ) {
    return route._listCacheModel;
  }
  const model = route.infinity.model(modelName, options);
  route._listCacheKey = key;
  route._listCacheModel = model;
  return model;
}
