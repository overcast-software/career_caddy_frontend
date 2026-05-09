import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, click } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Minimal JP record stand-in. @tracked on `complete` so the template's
// {{#if this.model.complete}} guard re-renders when the action flips it.
class JobPostStub {
  @tracked complete;

  constructor({ id, complete }) {
    this.id = id;
    this.complete = complete;
    this.title = 'Senior Engineer';
    this.description = ' '.repeat(100);
    this.link = 'https://example.com/jobs/1';
    this._saved = false;
    this._rolled = false;
  }

  save() {
    this._saved = true;
    return Promise.resolve(this);
  }

  rollbackAttributes() {
    this._rolled = true;
    this.complete = !this.complete;
  }

  belongsTo() {
    // The route's setupController calls `model.belongsTo('company').id()`
    // (method, not property) to flash a warning when company is missing.
    // Stub both shapes — id() and value() — so any consumer wins.
    return { value: () => null, id: () => null };
  }

  hasMany() {
    return { value: () => [] };
  }
}

class CurrentUserStub extends Service {
  @tracked user = {
    id: '1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    isStaff: false,
    isGuest: false,
  };
  // Application route's beforeModel calls these — leaving them off
  // bombs the route lifecycle before the JP show template renders.
  // Mirrors the wizard test stub.
  @tracked onboarding = null;
  @tracked extensionPresent = false;
  isGuest = false;
  load() {
    return this.user;
  }
  async loadOnboarding() {
    return null;
  }
}

class StoreStub extends Service {
  constructor() {
    super(...arguments);
    this.records = new Map();
  }
  put(record) {
    this.records.set(String(record.id), record);
  }
  async findRecord(_type, id) {
    return this.records.get(String(id));
  }
  // Breadcrumbs (rendered by RouteLayout) calls peekRecord to label crumbs
  // from in-memory records. Returning the same map satisfies it without
  // needing to register types.
  peekRecord(_type, id) {
    return this.records.get(String(id)) || null;
  }
  async query() {
    return [];
  }
  async queryRecord() {
    return null;
  }
  async findAll() {
    return [];
  }
  peekAll() {
    return [];
  }
  unloadAll() {}
}

module('Acceptance | Mark incomplete on JP show', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');

    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', CurrentUserStub);

    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
    this.store = this.owner.lookup('service:store');

    // Auto-confirm the window.confirm dialog the controller fires.
    this._origConfirm = window.confirm;
    window.confirm = () => true;
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
    window.confirm = this._origConfirm;
  });

  test('Mark incomplete button visible when complete=true', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    this.store.put(new JobPostStub({ id: '42', complete: true }));

    await visit('/job-posts/42');
    assert.dom('[data-test-mark-incomplete]').hasText('Mark incomplete');
  });

  test('Mark incomplete button hidden when complete=false', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    this.store.put(new JobPostStub({ id: '43', complete: false }));

    await visit('/job-posts/43');
    assert.dom('[data-test-mark-incomplete]').doesNotExist();
  });

  test('clicking Mark incomplete flips the flag and saves', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    const jp = new JobPostStub({ id: '44', complete: true });
    this.store.put(jp);

    await visit('/job-posts/44');
    await click('[data-test-mark-incomplete]');

    assert.false(jp.complete, 'complete flipped to false');
    assert.true(jp._saved, 'save() was called');
  });
});
