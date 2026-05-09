import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Stand-in for a JobPost record. Keeps just enough surface for the
// edit route to render — same shape as the mark-incomplete test
// stubs, plus skip_extract isn't needed (the action is on JP, not on
// Scrape, in this view).
class JobPostStub {
  @tracked complete = true;

  constructor({ id, link }) {
    this.id = id;
    this.link = link;
    this.title = 'Senior Engineer';
    this.description = ' '.repeat(100);
  }

  save() {
    return Promise.resolve(this);
  }

  rollbackAttributes() {}

  belongsTo() {
    return { value: () => null, id: () => null };
  }

  hasMany() {
    return { value: () => [] };
  }
}

class CurrentUserStub extends Service {
  constructor() {
    super(...arguments);
    this.user = {
      id: '1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      isStaff: this.shouldBeStaff,
      isGuest: false,
    };
  }

  // Subclasses override to flip staff. Default false matches the
  // dominant test stub already in use.
  get shouldBeStaff() {
    return false;
  }

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

class StaffUserStub extends CurrentUserStub {
  get shouldBeStaff() {
    return true;
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

module(
  'Acceptance | Resolve & dedupe staff button on JP edit',
  function (hooks) {
    setupApplicationTest(hooks);

    hooks.beforeEach(function () {
      sessionStorage.setItem('cc:healthy', 'true');
      sessionStorage.setItem('cc:bootstrap-open', 'false');

      this.owner.unregister('service:store');
      this.owner.register('service:store', StoreStub);
      this.store = this.owner.lookup('service:store');
    });

    hooks.afterEach(function () {
      sessionStorage.removeItem('cc:healthy');
      sessionStorage.removeItem('cc:bootstrap-open');
    });

    test('Resolve & dedupe button visible when isStaff=true', async function (assert) {
      this.owner.unregister('service:current-user');
      this.owner.register('service:current-user', StaffUserStub);

      await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
      this.store.put(
        new JobPostStub({ id: '50', link: 'https://example.com/jobs/1' }),
      );

      await visit('/job-posts/50/edit');
      assert
        .dom('[data-test-resolve-and-dedupe]')
        .hasText('Resolve & dedupe (staff)');
    });

    test('Resolve & dedupe button hidden for non-staff users', async function (assert) {
      this.owner.unregister('service:current-user');
      this.owner.register('service:current-user', CurrentUserStub);

      await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
      this.store.put(
        new JobPostStub({ id: '51', link: 'https://example.com/jobs/2' }),
      );

      await visit('/job-posts/51/edit');
      assert.dom('[data-test-resolve-and-dedupe]').doesNotExist();
    });
  },
);
