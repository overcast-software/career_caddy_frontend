import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, click } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { AS2_PUBLIC } from 'career-caddy-frontend/models/job-post';

// Stand-in for a JobPost record on the /curate queue. `audience` is @tracked so
// the model-mirroring `isPublic` getter (and thus the controller's `candidates`
// filter) re-derives when JobPosts::PublishToggle flips it on publish. publish()
// resolves immediately — the real apiAction auto-pushes the server's flipped
// audience, which the optimistic flip already matches.
class JobPostStub {
  @tracked audience = [];

  constructor({ id, title, company, score }) {
    this.id = id;
    this.title = title;
    this._company = company;
    this._topScore = score == null ? null : { score };
  }

  // Mirror of the real model's isPublic getter.
  get isPublic() {
    return Array.isArray(this.audience) && this.audience.includes(AS2_PUBLIC);
  }

  // The row template reads jobPost.company.name and jobPost.topScore.score
  // directly (async belongsTo proxies resolve to the record in the real app);
  // expose them as plain properties here.
  get company() {
    return this._company;
  }
  get topScore() {
    return this._topScore;
  }

  // Presence-pill getters the row reads (mirror the model getters).
  get hasQuestions() {
    return false;
  }
  get hasJobApplications() {
    return false;
  }

  publish() {
    this.audience = [AS2_PUBLIC];
    return Promise.resolve(this);
  }
  unpublish() {
    this.audience = [];
    return Promise.resolve(this);
  }

  belongsTo() {
    return { value: () => null, id: () => null };
  }
  hasMany() {
    return { value: () => [] };
  }
}

// Staff user — PublishToggle self-hides unless currentUser.canPublishToFediverse
// (v1 = isStaff), so the toggle must render for the publish-removes-row test.
class StaffUserStub extends Service {
  @tracked user = {
    id: '1',
    username: 'dough',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    isStaff: true,
    isGuest: false,
  };
  @tracked onboarding = null;
  @tracked extensionPresent = false;
  isGuest = false;
  // The real service exposes this as a getter over user.isStaff; the
  // PublishToggle gate reads it.
  get canPublishToFediverse() {
    return this.user?.isStaff ?? false;
  }
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
    this.records = [];
  }
  seed(records) {
    this.records = records;
  }
  // The curate route's model() calls query('job-post', {...}); return the
  // seeded publishable candidates.
  async query() {
    return this.records;
  }
  async findRecord(_type, id) {
    return this.records.find((r) => String(r.id) === String(id)) || null;
  }
  peekRecord(_type, id) {
    return this.records.find((r) => String(r.id) === String(id)) || null;
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

module('Acceptance | Curate view (CC-64)', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');

    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', StaffUserStub);

    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
    this.store = this.owner.lookup('service:store');
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
  });

  test('lists the publishable candidates', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    this.store.seed([
      new JobPostStub({
        id: '10',
        title: 'Senior Engineer',
        company: { name: 'Acme' },
        score: 88,
      }),
      new JobPostStub({
        id: '11',
        title: 'Staff Engineer',
        company: { name: 'Globex' },
        score: 91,
      }),
    ]);

    await visit('/curate');

    assert.dom('[data-test-curate-row]').exists({ count: 2 }, 'two rows render');
    assert.dom('[data-test-preview-profile]').hasText('Preview @dough');
  });

  test('publishing a row removes it from the queue', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    this.store.seed([
      new JobPostStub({
        id: '20',
        title: 'Senior Engineer',
        company: { name: 'Acme' },
        score: 88,
      }),
      new JobPostStub({
        id: '21',
        title: 'Staff Engineer',
        company: { name: 'Globex' },
        score: 91,
      }),
    ]);

    await visit('/curate');
    assert
      .dom('[data-test-curate-row]')
      .exists({ count: 2 }, 'two rows before publish');

    // Publish the first row — the toggle flips audience → isPublic true →
    // the candidates getter drops the row.
    await click(
      '[data-test-curate-row]:first-child [data-test-publish-toggle]',
    );

    assert
      .dom('[data-test-curate-row]')
      .exists({ count: 1 }, 'published row dropped from the queue');
  });
});
