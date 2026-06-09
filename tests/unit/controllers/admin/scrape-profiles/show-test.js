import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// /admin/scrape-profiles/:id show controller. Locks down the
// sharpenProfile action — model verb call, flash messages, and the
// in-flight `sharpening` tracked state. v1 ships without polling; the
// success flash tells the operator to refresh manually.
module('Unit | Controller | admin/scrape-profiles/show', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    assert.ok(controller, 'controller resolves');
  });

  test('canSharpen is false when model.lastSuccessAt is null', function (assert) {
    const store = this.owner.lookup('service:store');
    const profile = store.createRecord('scrape-profile', {
      hostname: 'example.com',
      lastSuccessAt: null,
    });
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    controller.set('model', profile);
    assert.false(controller.canSharpen);
    assert.strictEqual(
      controller.sharpenDisabledHint,
      'Capture a successful scrape for this hostname first.',
    );
  });

  test('canSharpen is true when model.lastSuccessAt is present', function (assert) {
    const store = this.owner.lookup('service:store');
    const profile = store.createRecord('scrape-profile', {
      hostname: 'example.com',
      lastSuccessAt: new Date('2026-01-01T00:00:00Z'),
    });
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    controller.set('model', profile);
    assert.true(controller.canSharpen);
    assert.strictEqual(controller.sharpenDisabledHint, null);
  });

  test('sharpenProfile calls model.sharpen and flashes success on resolve', async function (assert) {
    const store = this.owner.lookup('service:store');
    const profile = store.createRecord('scrape-profile', {
      hostname: 'example.com',
      lastSuccessAt: new Date('2026-01-01T00:00:00Z'),
    });
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    controller.set('model', profile);

    // Stub model.sharpen and flashMessages — track calls + capture
    // the message argument so we lock down the success copy.
    let sharpenCalled = false;
    profile.sharpen = () => {
      sharpenCalled = true;
      return Promise.resolve({});
    };
    const flashes = [];
    controller.flashMessages = {
      success: (msg) => flashes.push({ level: 'success', msg }),
      danger: (msg) => flashes.push({ level: 'danger', msg }),
    };

    controller.sharpenProfile();
    // Action is fire-and-forget — the .finally() arm flips sharpening
    // false. Defer past the microtask + macrotask boundary so both the
    // then/catch and the finally arms have drained before assertions.
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.true(sharpenCalled, 'model.sharpen invoked');
    assert.false(controller.sharpening, 'sharpening reset in finally');
    assert.strictEqual(flashes.length, 1);
    assert.strictEqual(flashes[0].level, 'success');
    assert.true(
      flashes[0].msg.includes('Browser sharpen queued'),
      'success message mentions the queue',
    );
  });

  test('sharpenProfile flashes 422 hint when api returns 422', async function (assert) {
    const store = this.owner.lookup('service:store');
    const profile = store.createRecord('scrape-profile', {
      hostname: 'example.com',
      lastSuccessAt: new Date('2026-01-01T00:00:00Z'),
    });
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    controller.set('model', profile);

    profile.sharpen = () =>
      Promise.reject({
        errors: [
          { status: '422', detail: 'No successful scrape found for hostname.' },
        ],
      });
    const flashes = [];
    controller.flashMessages = {
      success: (msg) => flashes.push({ level: 'success', msg }),
      danger: (msg) => flashes.push({ level: 'danger', msg }),
    };

    controller.sharpenProfile();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.false(controller.sharpening, 'sharpening reset in finally');
    assert.strictEqual(flashes.length, 1);
    assert.strictEqual(flashes[0].level, 'danger');
    assert.strictEqual(
      flashes[0].msg,
      'No successful scrape found for this hostname yet.',
    );
  });

  test('sharpenProfile flashes server detail on other errors', async function (assert) {
    const store = this.owner.lookup('service:store');
    const profile = store.createRecord('scrape-profile', {
      hostname: 'example.com',
      lastSuccessAt: new Date('2026-01-01T00:00:00Z'),
    });
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    controller.set('model', profile);

    profile.sharpen = () =>
      Promise.reject({
        errors: [{ status: '500', detail: 'Browser pool exhausted.' }],
      });
    const flashes = [];
    controller.flashMessages = {
      success: (msg) => flashes.push({ level: 'success', msg }),
      danger: (msg) => flashes.push({ level: 'danger', msg }),
    };

    controller.sharpenProfile();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.strictEqual(flashes.length, 1);
    assert.strictEqual(flashes[0].level, 'danger');
    assert.true(
      flashes[0].msg.includes('Browser pool exhausted.'),
      'danger message surfaces server detail',
    );
  });

  test('sharpenProfile is a no-op while already sharpening', async function (assert) {
    const store = this.owner.lookup('service:store');
    const profile = store.createRecord('scrape-profile', {
      hostname: 'example.com',
      lastSuccessAt: new Date('2026-01-01T00:00:00Z'),
    });
    const controller = this.owner.lookup(
      'controller:admin/scrape-profiles/show',
    );
    controller.set('model', profile);

    let calls = 0;
    // Never-resolving promise so the in-flight state stays set.
    profile.sharpen = () => {
      calls += 1;
      return new Promise(() => {});
    };
    controller.flashMessages = {
      success: () => {},
      danger: () => {},
    };

    controller.sharpenProfile();
    controller.sharpenProfile();
    await Promise.resolve();
    assert.strictEqual(calls, 1, 're-entry guarded by this.sharpening');
  });
});
