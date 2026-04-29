// Returns a cached infinity model when the route is re-entered with the
// same params. Suppresses the loading skeleton on return visits — the
// previous InfinityModel resolves synchronously, so Ember never enters
// the loading substate. New records pushed to the store still appear
// (InfinityModel is reactive). Cache invalidates on any param change.
export function infinityModel(route, modelName, options) {
  const key = `${modelName}:${JSON.stringify(options)}`;
  if (route._listCacheKey === key && route._listCacheModel) {
    return route._listCacheModel;
  }
  const model = route.infinity.model(modelName, options);
  route._listCacheKey = key;
  route._listCacheModel = model;
  return model;
}
