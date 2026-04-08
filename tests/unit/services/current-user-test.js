import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Minimal JWT-shaped tokens whose payloads decode to a known user_id.
// payload = btoa(JSON.stringify({ user_id: "N" }))
const TOKEN_USER_1 = 'x.eyJ1c2VyX2lkIjoiMSJ9.x'; // user_id: "1"
const TOKEN_USER_2 = 'x.eyJ1c2VyX2lkIjoiMiJ9.x'; // user_id: "2"

const USER_1 = Object.freeze({ id: '1', username: 'admin', isGuest: false });
const USER_2 = Object.freeze({ id: '2', username: 'demouser', isGuest: true });

function makeStore(map = {}) {
  return class StoreStub extends Service {
    findRecord(_type, id) {
      if (id in map) return Promise.resolve(map[id]);
      return Promise.reject(new Error(`StoreStub: no record for id=${id}`));
    }
  };
}

function makeSession(overrides = {}) {
  return class SessionStub extends Service {
    @tracked isAuthenticated = overrides.isAuthenticated ?? true;
    @tracked accessToken = overrides.accessToken ?? TOKEN_USER_1;
  };
}

module('Unit | Service | current-user', function (hooks) {
  setupTest(hooks);

  test('load() sets user from the user_id in the JWT', async function (assert) {
    this.owner.register(
      'service:session',
      makeSession({ accessToken: TOKEN_USER_1 }),
    );
    this.owner.register('service:store', makeStore({ 1: USER_1 }));

    let service = this.owner.lookup('service:current-user');
    await service.load();

    assert.strictEqual(service.user, USER_1, 'user is set from JWT user_id');
  });

  test('load() calls findRecord with the correct user id', async function (assert) {
    this.owner.register(
      'service:session',
      makeSession({ accessToken: TOKEN_USER_2 }),
    );
    this.owner.register(
      'service:store',
      class extends Service {
        findRecord(type, id) {
          assert.strictEqual(
            type,
            'user',
            'findRecord called with type "user"',
          );
          assert.strictEqual(
            id,
            '2',
            'findRecord called with user_id from JWT',
          );
          return Promise.resolve(USER_2);
        }
      },
    );

    let service = this.owner.lookup('service:current-user');
    await service.load();
  });

  test('load() clears user to null before fetching', async function (assert) {
    let resolveUser;
    const pending = new Promise((r) => (resolveUser = r));

    this.owner.register(
      'service:session',
      makeSession({ accessToken: TOKEN_USER_1 }),
    );
    this.owner.register(
      'service:store',
      class extends Service {
        findRecord() {
          return pending;
        }
      },
    );

    let service = this.owner.lookup('service:current-user');
    service.user = USER_1; // simulate previously loaded user

    const loadPromise = service.load();

    assert.strictEqual(
      service.user,
      null,
      'user is null while fetch is in flight',
    );

    resolveUser(USER_1);
    await loadPromise;

    assert.strictEqual(
      service.user,
      USER_1,
      'user is set after fetch resolves',
    );
  });

  test('load() does not fetch when session is unauthenticated', async function (assert) {
    this.owner.register(
      'service:session',
      makeSession({ isAuthenticated: false, accessToken: null }),
    );
    this.owner.register(
      'service:store',
      class extends Service {
        findRecord() {
          assert.ok(
            false,
            'findRecord must not be called when unauthenticated',
          );
          return Promise.resolve(null);
        }
      },
    );

    let service = this.owner.lookup('service:current-user');
    service.user = USER_1; // simulate previously loaded user

    await service.load();

    assert.strictEqual(
      service.user,
      null,
      'user is cleared when not authenticated',
    );
  });

  test('load() does not fetch when token has no user_id', async function (assert) {
    const tokenWithoutUserId =
      'x.' + btoa(JSON.stringify({ exp: 9999999999 })) + '.x';

    this.owner.register(
      'service:session',
      makeSession({ isAuthenticated: true, accessToken: tokenWithoutUserId }),
    );
    this.owner.register(
      'service:store',
      class extends Service {
        findRecord() {
          assert.ok(
            false,
            'findRecord must not be called when token has no user_id',
          );
          return Promise.resolve(null);
        }
      },
    );

    let service = this.owner.lookup('service:current-user');
    await service.load();

    assert.strictEqual(
      service.user,
      null,
      'user stays null when token has no user_id',
    );
  });

  // ── The stale username scenarios ──────────────────────────────────────────

  test('load() switches to new user when token changes to a different account', async function (assert) {
    const SessionStub = class extends Service {
      @tracked isAuthenticated = true;
      @tracked accessToken = TOKEN_USER_1;
    };

    this.owner.register('service:session', SessionStub);
    this.owner.register('service:store', makeStore({ 1: USER_1, 2: USER_2 }));

    let service = this.owner.lookup('service:current-user');
    let session = this.owner.lookup('service:session');

    await service.load();
    assert.strictEqual(service.user, USER_1, 'starts as user 1');

    // Simulate session token switching to guest/demo account
    session.accessToken = TOKEN_USER_2;
    await service.load();

    assert.strictEqual(
      service.user,
      USER_2,
      'switches to user 2 after token change',
    );
    assert.strictEqual(
      service.user.username,
      'demouser',
      'username reflects new user',
    );
  });

  test('load() updates correctly cycling through admin → guest → admin', async function (assert) {
    const SessionStub = class extends Service {
      @tracked isAuthenticated = true;
      @tracked accessToken = TOKEN_USER_1;
    };

    this.owner.register('service:session', SessionStub);
    this.owner.register('service:store', makeStore({ 1: USER_1, 2: USER_2 }));

    let service = this.owner.lookup('service:current-user');
    let session = this.owner.lookup('service:session');

    // Login as admin
    await service.load();
    assert.strictEqual(service.user.username, 'admin', 'step 1: admin');

    // Switch to guest
    session.accessToken = TOKEN_USER_2;
    await service.load();
    assert.strictEqual(service.user.username, 'demouser', 'step 2: guest');

    // Switch back to admin
    session.accessToken = TOKEN_USER_1;
    await service.load();
    assert.strictEqual(service.user.username, 'admin', 'step 3: back to admin');
  });

  test('isGuest reflects current user', async function (assert) {
    const SessionStub = class extends Service {
      @tracked isAuthenticated = true;
      @tracked accessToken = TOKEN_USER_1;
    };

    this.owner.register('service:session', SessionStub);
    this.owner.register('service:store', makeStore({ 1: USER_1, 2: USER_2 }));

    let service = this.owner.lookup('service:current-user');
    let session = this.owner.lookup('service:session');

    await service.load();
    assert.false(service.isGuest, 'admin is not a guest');

    session.accessToken = TOKEN_USER_2;
    await service.load();
    assert.true(service.isGuest, 'demo user is a guest');
  });
});
