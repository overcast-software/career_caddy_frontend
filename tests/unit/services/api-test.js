import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import config from 'career-caddy-frontend/config/environment';

module('Unit | Service | api', function (hooks) {
  setupTest(hooks);

  let originalApiHost;

  hooks.beforeEach(function () {
    originalApiHost = config.APP.API_HOST;
  });

  hooks.afterEach(function () {
    config.APP.API_HOST = originalApiHost;
  });

  test('url() prepends the configured API host to absolute paths', function (assert) {
    config.APP.API_HOST = 'https://api.careercaddy.online';
    const api = this.owner.lookup('service:api');

    assert.strictEqual(
      api.url('/api/v1/scrapes/162/graph-trace/'),
      'https://api.careercaddy.online/api/v1/scrapes/162/graph-trace/',
    );
    assert.strictEqual(
      api.url('/api/v1/admin/graph-structure/'),
      'https://api.careercaddy.online/api/v1/admin/graph-structure/',
    );
  });

  test('url() inserts a separator for paths without leading slash', function (assert) {
    config.APP.API_HOST = 'https://api.careercaddy.online';
    const api = this.owner.lookup('service:api');
    assert.strictEqual(
      api.url('api/v1/scrapes/'),
      'https://api.careercaddy.online/api/v1/scrapes/',
    );
  });

  test('url() trims trailing slashes off the configured host', function (assert) {
    config.APP.API_HOST = 'https://api.careercaddy.online///';
    const api = this.owner.lookup('service:api');
    assert.strictEqual(
      api.url('/api/v1/x/'),
      'https://api.careercaddy.online/api/v1/x/',
    );
  });

  test('url() handles an empty/missing API_HOST gracefully', function (assert) {
    config.APP.API_HOST = '';
    const api = this.owner.lookup('service:api');
    assert.strictEqual(api.url('/api/v1/x/'), '/api/v1/x/');
  });
});
