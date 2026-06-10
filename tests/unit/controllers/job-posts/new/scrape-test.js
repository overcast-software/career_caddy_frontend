import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';

// Stub Scrape that mimics the bits the controller touches:
//   .save() — async, resolves to a record with a belongsTo('jobPost') accessor
//   .isDestroyed / .rollbackAttributes() — needed on the dedupe path
class FakeScrape {
  constructor({ id = 'scr-1', jobPostId = null } = {}) {
    this.id = id;
    this._jobPostId = jobPostId;
    this.isDestroyed = false;
    this.rolledBack = false;
  }

  belongsTo(name) {
    if (name === 'jobPost') {
      const jpId = this._jobPostId;
      return { id: () => jpId };
    }
    return { id: () => null };
  }

  rollbackAttributes() {
    this.rolledBack = true;
  }
}

class FakeStore extends Service {
  // The controller does createRecord('scrape', {...}) and then .save().
  // We return a scrape instance whose save() resolves with whatever the
  // test has staged in `this.saveResult`. The `attrs` argument is
  // ignored — the controller flow we exercise here depends on save's
  // resolved value, not on the un-saved create attrs.
  // eslint-disable-next-line no-unused-vars
  createRecord(modelName, attrs) {
    const created = this.createdScrape || new FakeScrape();
    const saveResult = this.saveResult;
    if (saveResult instanceof Error) {
      created.save = () => Promise.reject(saveResult);
    } else {
      created.save = () => Promise.resolve(saveResult ?? created);
    }
    this.lastCreated = created;
    return created;
  }
}

class FakeSpinner extends Service {
  // Pass-through wrap — tests assert on router calls, not on spinner
  // lifecycle.
  wrap(promise) {
    return promise;
  }
}

class FakeRouter extends Service {
  constructor() {
    super(...arguments);
    this.transitions = [];
  }
  transitionTo(...args) {
    this.transitions.push(args);
  }
}

class FakeFlash extends Service {
  constructor() {
    super(...arguments);
    this.calls = [];
  }
  info(...args) {
    this.calls.push(['info', ...args]);
  }
  danger(...args) {
    this.calls.push(['danger', ...args]);
  }
  success(...args) {
    this.calls.push(['success', ...args]);
  }
  warning(...args) {
    this.calls.push(['warning', ...args]);
  }
  clearMessages() {}
}

// Settle the controller's .then() chain. The submit handler kicks off
// `scrape.save().then(...)`, so two microtask flushes cover both the
// save resolution and the chained transitionTo call.
async function flushChain() {
  await Promise.resolve();
  await Promise.resolve();
}

module('Unit | Controller | job-posts/new/scrape', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', FakeStore);
    this.owner.register('service:spinner', FakeSpinner);
    this.owner.register('service:router', FakeRouter);
    this.owner.register('service:flash-messages', FakeFlash);

    this.store = this.owner.lookup('service:store');
    this.router = this.owner.lookup('service:router');
    this.flash = this.owner.lookup('service:flash-messages');

    this.controller = this.owner.lookup('controller:job-posts/new/scrape');
  });

  test('transitions to job-posts.show.scrapes.show when api links a JobPost', async function (assert) {
    // The api response on a successful scrape POST includes the JobPost
    // relationship (the api mints a stub if no canonical match exists)
    // so the controller can land the user on the nested scrape detail.
    const saved = new FakeScrape({ id: '99', jobPostId: '1481' });
    this.store.saveResult = saved;
    this.store.createdScrape = saved;
    this.controller.url = 'https://example.com/jobs/abc';

    this.controller.submitHoldForm({ preventDefault() {} });
    await flushChain();

    assert.deepEqual(
      this.router.transitions[0],
      ['job-posts.show.scrapes.show', '1481', '99'],
      'nested scrape detail under the new JobPost',
    );
  });

  test('falls back to top-level scrapes.show when api skipped the JobPost', async function (assert) {
    // Legacy contract — a scrape created without a JobPost still routes
    // somewhere coherent rather than throwing on the router call.
    const saved = new FakeScrape({ id: '42', jobPostId: null });
    this.store.saveResult = saved;
    this.store.createdScrape = saved;
    this.controller.url = 'https://example.com/jobs/xyz';

    this.controller.submitHoldForm({ preventDefault() {} });
    await flushChain();

    assert.strictEqual(this.router.transitions[0][0], 'scrapes.show');
    assert.strictEqual(this.router.transitions[0][1], saved);
  });

  test('409 dedupe routes to the existing JobPost and rolls back the orphaned scrape', async function (assert) {
    const created = new FakeScrape({ id: '7', jobPostId: null });
    this.store.createdScrape = created;
    const err = new Error('Conflict');
    err.errors = [
      { meta: { existing_job_post_id: '2024' }, code: 'duplicate_scrape' },
    ];
    this.store.saveResult = err;
    this.controller.url = 'https://example.com/jobs/dupe';

    this.controller.submitHoldForm({ preventDefault() {} });
    await flushChain();

    assert.deepEqual(this.router.transitions[0], ['job-posts.show', '2024']);
    assert.true(created.rolledBack, 'orphan scrape rolled back');
  });
});
