import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Adapter | score', function (hooks) {
  setupTest(hooks);

  test('urlForQuery routes jobPostId to /job-posts/:id/scores/', function (assert) {
    const adapter = this.owner.lookup('adapter:score');
    const url = adapter.urlForQuery({ jobPostId: 'kR7iSUXZyY' });
    assert.true(
      url.endsWith('/job-posts/kR7iSUXZyY/scores/'),
      `URL ${url} routes to the nested scores sub-collection`,
    );
  });

  test('urlForQuery deletes jobPostId from the query after routing', function (assert) {
    const adapter = this.owner.lookup('adapter:score');
    const query = { jobPostId: 'kR7iSUXZyY', other: 'keep-me' };
    adapter.urlForQuery(query);
    assert.notOk(
      'jobPostId' in query,
      'jobPostId is consumed so it does not leak into query params',
    );
    assert.strictEqual(query.other, 'keep-me');
  });

  test('urlForQuery falls back to the flat collection when no jobPostId', function (assert) {
    const adapter = this.owner.lookup('adapter:score');
    // urlForQuery(query, modelName) — Ember Data always passes modelName;
    // without it the super fallback builds only the namespace root.
    const url = adapter.urlForQuery({}, 'score');
    // The stock JSONAPIAdapter builds the flat URL without a trailing
    // slash (the api router accepts both forms).
    assert.true(
      url.endsWith('/scores'),
      `URL ${url} falls back to the flat scores collection`,
    );
    assert.notOk(
      url.includes('/job-posts/'),
      'no parent segment when jobPostId is absent',
    );
  });
});
