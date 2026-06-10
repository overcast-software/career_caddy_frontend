import { module, test } from 'qunit';
import { infinityModel } from 'career-caddy-frontend/utils/list-model';

// Builds an InfinityModel-shaped stub. The cache discards entries
// when any record is stale (isDestroyed | isDestroying | isDeleted),
// so the stub mirrors the real shape: a `.content` array that
// is NOT itself a JS Array (InfinityModel is an object that exposes
// a tracked .content). The `for..of` fallback in _hasDestroyedRecord
// has to walk `.content` because the wrapper is not iterable.
function makeInfinityModel(records) {
  return {
    content: records,
    // Marker so tests can confirm we returned the cached reference.
    __id: Math.random(),
  };
}

function makeRoute(records) {
  const calls = [];
  const route = {
    infinity: {
      model(modelName, options) {
        calls.push({ modelName, options });
        return makeInfinityModel(records);
      },
    },
    _infinityCalls: calls,
  };
  return route;
}

module('Unit | Utility | list-model', function () {
  test('returns cached model when modelName + options identical', function (assert) {
    const route = makeRoute([{ id: '1' }, { id: '2' }]);
    const first = infinityModel(route, 'job-post', { perPage: 25 });
    const second = infinityModel(route, 'job-post', { perPage: 25 });
    assert.strictEqual(
      route._infinityCalls.length,
      1,
      'infinity.model() called only once across two list-model calls',
    );
    assert.strictEqual(first, second, 'second call returned cached reference');
  });

  test('cache miss when options change', function (assert) {
    const route = makeRoute([{ id: '1' }]);
    infinityModel(route, 'job-post', { perPage: 25 });
    infinityModel(route, 'job-post', { perPage: 50 });
    assert.strictEqual(
      route._infinityCalls.length,
      2,
      'param change forces a fresh infinity.model() call',
    );
  });

  test('cache miss when modelName changes', function (assert) {
    const route = makeRoute([{ id: '1' }]);
    infinityModel(route, 'job-post', { perPage: 25 });
    infinityModel(route, 'company', { perPage: 25 });
    assert.strictEqual(
      route._infinityCalls.length,
      2,
      'different modelName forces a fresh call',
    );
  });

  test('cache discarded when any cached record is isDestroyed', function (assert) {
    const records = [{ id: '1' }, { id: '2', isDestroyed: true }];
    const route = makeRoute(records);
    // Seed the cache with the stale model.
    infinityModel(route, 'job-post', {});
    // Re-entry should detect the destroyed record and re-fetch.
    infinityModel(route, 'job-post', {});
    assert.strictEqual(
      route._infinityCalls.length,
      2,
      'isDestroyed record forced re-fetch',
    );
  });

  test('cache discarded when any cached record is isDestroying', function (assert) {
    const records = [{ id: '1', isDestroying: true }];
    const route = makeRoute(records);
    infinityModel(route, 'job-post', {});
    infinityModel(route, 'job-post', {});
    assert.strictEqual(
      route._infinityCalls.length,
      2,
      'isDestroying record forced re-fetch',
    );
  });

  test('cache discarded when any cached record is isDeleted (verb-DELETE path)', function (assert) {
    // Regression for the jp.index "missing company" symptom: nuclearDelete
    // (apiAction → deleteRecord, no unloadRecord) leaves the row with
    // isDeleted=true but isDestroyed=false. Without this check, the
    // cached InfinityModel re-renders the dead row on jp.index re-entry.
    const records = [{ id: '1' }, { id: '2', isDeleted: true }];
    const route = makeRoute(records);
    infinityModel(route, 'job-post', {});
    infinityModel(route, 'job-post', {});
    assert.strictEqual(
      route._infinityCalls.length,
      2,
      'isDeleted record forced re-fetch — covers verb-DELETE paths',
    );
  });

  test('iterates via .content when model wrapper is not a JS Array', function (assert) {
    // Reproduces the InfinityModel shape: the cached object is the
    // wrapper itself, not its `.content`. _hasDestroyedRecord has to
    // walk `.content`; if it short-circuits on Array.isArray(model)
    // alone, stale rows leak.
    const records = [{ id: '1', isDeleted: true }];
    const wrapper = { content: records, foo: 'bar' };
    const route = {
      infinity: {
        called: 0,
        model() {
          this.called += 1;
          return wrapper;
        },
      },
    };
    infinityModel(route, 'job-post', {});
    infinityModel(route, 'job-post', {});
    assert.strictEqual(
      route.infinity.called,
      2,
      'wrapper.content was scanned and the stale record triggered invalidation',
    );
  });

  test('skips stale check when model is an empty array', function (assert) {
    const route = makeRoute([]);
    infinityModel(route, 'job-post', {});
    infinityModel(route, 'job-post', {});
    assert.strictEqual(
      route._infinityCalls.length,
      1,
      'empty array preserves cache (no records to be stale)',
    );
  });
});
