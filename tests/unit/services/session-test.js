import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// handleInvalidation is privacy-critical: it must clear the Ember Data
// store on every logout path so the next user (or the next login on
// the same tab) cannot peek/findRecord their way into the prior
// session's leftover records. Memory dispatch flagged this after the
// api-side fix landed for the top_score sideload leak — without this
// fix, even a fixed api can hand back stale top_score values that the
// store had cached from the prior user's view.

const MODEL_TYPES_TO_CHECK = [
  'job-post',
  'score',
  'cover-letter',
  'summary',
  'job-application',
  'resume',
];

class RouterStub extends Service {
  transitionTo() {}
}

class CurrentUserStub extends Service {
  @tracked user = { id: '1', username: 'admin' };
  @tracked onboarding = null;
}

class EventsStub extends Service {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

// Tracks store activity so the tests can assert that handleInvalidation
// reached the store. We don't exercise the real JSON:API cache here —
// the unit test is about the cleanup contract, not Ember Data internals.
class StoreStub extends Service {
  unloadAllCount = 0;
  modelsUnloaded = [];
  records = new Map(); // type → records

  push(type, record) {
    if (!this.records.has(type)) this.records.set(type, []);
    this.records.get(type).push(record);
  }

  peekAll(type) {
    return this.records.get(type) ?? [];
  }

  unloadAll(type) {
    this.unloadAllCount += 1;
    if (type) {
      this.modelsUnloaded.push(type);
      this.records.delete(type);
    } else {
      this.modelsUnloaded.push(...this.records.keys());
      this.records.clear();
    }
  }
}

module('Unit | Service | session', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    let service = this.owner.lookup('service:session');
    assert.ok(service);
  });

  test('handleInvalidation clears the Ember Data store', function (assert) {
    this.owner.register('service:router', RouterStub);
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.register('service:events', EventsStub);
    this.owner.register('service:store', StoreStub);

    const session = this.owner.lookup('service:session');
    const store = this.owner.lookup('service:store');

    // Seed the store with one record per leaky model type. After
    // handleInvalidation, peekAll for each must return [].
    for (const type of MODEL_TYPES_TO_CHECK) {
      store.push(type, { id: '1', type });
    }

    session.handleInvalidation();

    for (const type of MODEL_TYPES_TO_CHECK) {
      assert.deepEqual(
        store.peekAll(type),
        [],
        `peekAll('${type}') is empty after handleInvalidation`,
      );
    }
    assert.strictEqual(
      store.unloadAllCount,
      1,
      'store.unloadAll called exactly once',
    );
  });

  test('handleInvalidation clears currentUser.user', function (assert) {
    this.owner.register('service:router', RouterStub);
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.register('service:events', EventsStub);
    this.owner.register('service:store', StoreStub);

    const session = this.owner.lookup('service:session');
    const currentUser = this.owner.lookup('service:current-user');

    assert.ok(currentUser.user, 'currentUser.user starts set');
    session.handleInvalidation();
    assert.strictEqual(
      currentUser.user,
      null,
      'currentUser.user is null after handleInvalidation',
    );
  });

  test('handleInvalidation stops the SSE events channel', function (assert) {
    this.owner.register('service:router', RouterStub);
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.register('service:events', EventsStub);
    this.owner.register('service:store', StoreStub);

    const session = this.owner.lookup('service:session');
    const events = this.owner.lookup('service:events');

    assert.false(events.stopped, 'events stream starts running');
    session.handleInvalidation();
    assert.true(
      events.stopped,
      'events.stop() called so prior-user SSE messages cannot bleed in',
    );
  });

  test('handleInvalidation transitions to login', function (assert) {
    const transitions = [];
    class CapturingRouter extends Service {
      transitionTo(routeName) {
        transitions.push(routeName);
      }
    }

    this.owner.register('service:router', CapturingRouter);
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.register('service:events', EventsStub);
    this.owner.register('service:store', StoreStub);

    const session = this.owner.lookup('service:session');
    session.handleInvalidation();

    assert.deepEqual(
      transitions,
      ['login'],
      'router.transitionTo("login") called once',
    );
  });

  test('two-user scenario: prior user records are evicted before next login', function (assert) {
    // The privacy regression we are guarding against: user A logs in,
    // store loads job-post 42 with score 9.8; user A logs out; user B
    // logs in on the same tab — without unloadAll, store.peekRecord
    // ('job-post', 42) would hand back user A's record (including its
    // top_score sideload) until user B's findRecord completes. With
    // unloadAll, peekAll('job-post') is empty after invalidation.
    this.owner.register('service:router', RouterStub);
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.register('service:events', EventsStub);
    this.owner.register('service:store', StoreStub);

    const session = this.owner.lookup('service:session');
    const store = this.owner.lookup('service:store');

    // User A's session loads a JobPost with a top-score sideload.
    store.push('job-post', { id: '42', topScoreValue: 9.8 });
    store.push('score', { id: '101', value: 9.8 });

    session.handleInvalidation();

    assert.deepEqual(
      store.peekAll('job-post'),
      [],
      'no job-post records carry into user B session',
    );
    assert.deepEqual(
      store.peekAll('score'),
      [],
      'no score records carry into user B session',
    );
  });
});
