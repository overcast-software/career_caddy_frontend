import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';

class SessionStub extends Service {
  invalidateCalled = 0;
  invalidate() {
    this.invalidateCalled += 1;
    return Promise.resolve();
  }
}

module('Unit | Route | logout', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let route = this.owner.lookup('route:logout');
    assert.ok(route);
  });

  test('beforeModel calls session.invalidate', async function (assert) {
    this.owner.register('service:session', SessionStub);

    const route = this.owner.lookup('route:logout');
    const session = this.owner.lookup('service:session');

    await route.beforeModel();
    assert.strictEqual(
      session.invalidateCalled,
      1,
      'session.invalidate() called once — handleInvalidation drives the rest',
    );
  });
});
