import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// Build a fetch() stand-in returning a Response-like object. Pass
// `reject: true` to simulate an unreachable API (network/CORS/timeout) so
// the service's catch block runs.
function stubFetch({ ok = true, status = 200, body = {}, reject = false }) {
  return () => {
    if (reject) {
      return Promise.reject(new Error('Failed to fetch'));
    }
    return Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(body),
    });
  };
}

module('Unit | Service | health', function (hooks) {
  setupTest(hooks);

  let originalFetch;

  hooks.beforeEach(function () {
    originalFetch = window.fetch;
    // A stale success short-circuits ensureHealthy() before it ever
    // fetches; clear every cross-test storage key so each case starts
    // from a clean slate.
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
    sessionStorage.removeItem('cc:registration-open');
    localStorage.removeItem('cc:initialized');
  });

  hooks.afterEach(function () {
    window.fetch = originalFetch;
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
    sessionStorage.removeItem('cc:registration-open');
    localStorage.removeItem('cc:initialized');
  });

  test('successful check with bootstrap_open:false marks the system initialized', async function (assert) {
    window.fetch = stubFetch({
      body: { healthy: true, bootstrap_open: false, registration_open: false },
    });
    const health = this.owner.lookup('service:health');

    const result = await health.ensureHealthy();

    assert.true(result, 'reports healthy');
    assert.false(health.bootstrapOpen, 'bootstrap stays closed');
    assert.strictEqual(
      localStorage.getItem('cc:initialized'),
      'true',
      'persists the sticky initialized marker',
    );
  });

  test('successful check with bootstrap_open:true clears the initialized marker', async function (assert) {
    // A self-hoster who wiped the DB: previously initialized, now genuinely
    // first-run again. The affirmative signal must reopen the wizard.
    localStorage.setItem('cc:initialized', 'true');
    window.fetch = stubFetch({
      body: { healthy: true, bootstrap_open: true, registration_open: false },
    });
    const health = this.owner.lookup('service:health');

    await health.ensureHealthy();

    assert.true(health.bootstrapOpen, 'bootstrap reported open');
    assert.strictEqual(
      localStorage.getItem('cc:initialized'),
      null,
      'clears the stale initialized marker so first-run can re-run',
    );
  });

  test('unreachable API on a true first-run (no marker) fails open to bootstrap', async function (assert) {
    window.fetch = stubFetch({ reject: true });
    const health = this.owner.lookup('service:health');

    const result = await health.ensureHealthy();

    assert.false(result, 'reports not-healthy');
    assert.true(
      health.bootstrapOpen,
      'fails open so a genuine first-run reaches /setup',
    );
    assert.strictEqual(
      sessionStorage.getItem('cc:bootstrap-open'),
      'true',
      'caches the fail-open decision',
    );
  });

  test('unreachable API on an initialized system (marker set) does NOT fail open', async function (assert) {
    localStorage.setItem('cc:initialized', 'true');
    window.fetch = stubFetch({ reject: true });
    const health = this.owner.lookup('service:health');

    const result = await health.ensureHealthy();

    assert.false(result, 'reports not-healthy');
    assert.false(
      health.bootstrapOpen,
      'never re-exposes /setup on an initialized system blip',
    );
    assert.notStrictEqual(
      sessionStorage.getItem('cc:bootstrap-open'),
      'true',
      'does not cache a fail-open bootstrap',
    );
  });

  test('non-200 response never sets bootstrapOpen (the prod 504 case)', async function (assert) {
    // The observed trigger: a transient gateway error on cold start. A
    // non-200 must return not-healthy WITHOUT flipping bootstrapOpen, so
    // the route gate can no longer route an initialized system to /setup.
    window.fetch = stubFetch({ ok: false, status: 504 });
    const health = this.owner.lookup('service:health');

    const result = await health.ensureHealthy();

    assert.false(result, 'reports not-healthy on 504');
    assert.false(health.bootstrapOpen, 'bootstrap stays closed on a 504');
  });
});
