import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

function makeUser(overrides = {}) {
  return {
    id: '7',
    firstName: overrides.firstName ?? 'Jane',
    lastName: overrides.lastName ?? 'Doe',
    email: overrides.email ?? 'jane@example.com',
    onboarding: overrides.onboarding ?? {},
  };
}

function stubCurrentUser(user) {
  return class CurrentUserStub extends Service {
    @tracked user = user;
  };
}

// Mock the store so the onboarding service's queryRecord/save calls can
// be observed without booting Ember Data adapters.
function makeOnboardingRecord(overrides = {}) {
  const record = {
    id: '7',
    derived: overrides.derived ?? {
      profile_basics: false,
      resume_imported: false,
      first_job_post: false,
      first_score: false,
      first_cover_letter: false,
    },
    subjective: overrides.subjective ?? {
      wizard_enabled: true,
      resume_reviewed: false,
    },
    _saved: 0,
    async save() {
      this._saved += 1;
    },
  };
  return record;
}

function stubStore(record) {
  let queries = 0;
  const peekResult = [];
  return {
    Service: class StoreStub extends Service {
      _record = record;
      peekAll(type) {
        if (type !== 'onboarding') return [];
        return peekResult;
      }
      async queryRecord(type) {
        if (type !== 'onboarding') return null;
        queries += 1;
        peekResult.push(this._record);
        return this._record;
      }
    },
    get queries() {
      return queries;
    },
  };
}

module('Unit | Service | onboarding', function (hooks) {
  setupTest(hooks);

  test('resolved() fills in missing keys with defaults', function (assert) {
    this.owner.register(
      'service:current-user',
      stubCurrentUser(makeUser({ onboarding: { resume_imported: true } })),
    );
    const service = this.owner.lookup('service:onboarding');
    const resolved = service.resolved;
    assert.true(resolved.wizard_enabled);
    assert.true(resolved.resume_imported);
    assert.false(resolved.resume_reviewed);
  });

  test('guidanceAvailable is true when wizard is on and steps remain', function (assert) {
    this.owner.register(
      'service:current-user',
      stubCurrentUser(makeUser({ onboarding: { wizard_enabled: true } })),
    );
    const service = this.owner.lookup('service:onboarding');
    assert.true(service.guidanceAvailable);
    assert.strictEqual(service.nextAction.key, 'profile_basics');
  });

  test('guidanceAvailable is false when wizard is disabled', function (assert) {
    this.owner.register(
      'service:current-user',
      stubCurrentUser(makeUser({ onboarding: { wizard_enabled: false } })),
    );
    const service = this.owner.lookup('service:onboarding');
    assert.false(service.guidanceAvailable);
  });

  test('guidanceAvailable is false when every step complete', function (assert) {
    const onboarding = {
      wizard_enabled: true,
      profile_basics: true,
      resume_imported: true,
      resume_reviewed: true,
      first_job_post: true,
      first_score: true,
      first_cover_letter: true,
    };
    this.owner.register(
      'service:current-user',
      stubCurrentUser(makeUser({ onboarding })),
    );
    const service = this.owner.lookup('service:onboarding');
    assert.false(service.guidanceAvailable);
  });

  test('snapshotForChat() returns a plain object with full shape', function (assert) {
    this.owner.register(
      'service:current-user',
      stubCurrentUser(makeUser({ onboarding: { resume_imported: true } })),
    );
    const service = this.owner.lookup('service:onboarding');
    const snapshot = service.snapshotForChat();
    assert.true(snapshot.resume_imported);
    assert.false(snapshot.first_job_post);
    assert.true(snapshot.wizard_enabled);
  });

  test('markCompleted() with subjective key saves the OnboardingModel', async function (assert) {
    const user = makeUser({ onboarding: { resume_imported: true } });
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('resume_reviewed');

    assert.true(user.onboarding.resume_reviewed);
    assert.strictEqual(record._saved, 1, 'record.save() called once');
    assert.true(record.subjective.resume_reviewed);
  });

  test('markCompleted() with derived key updates local cache only', async function (assert) {
    // Derived keys (resume_imported, first_*) are recomputed by
    // /api/v1/onboarding/reconcile/ — no client-side PATCH needed.
    const user = makeUser();
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('resume_imported');

    assert.true(user.onboarding.resume_imported);
    assert.strictEqual(record._saved, 0, 'derived keys never trigger save()');
  });

  test('markCompleted() is a no-op for already-completed keys', async function (assert) {
    const user = makeUser({
      onboarding: { wizard_enabled: true, resume_imported: true },
    });
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('resume_imported');
    assert.strictEqual(record._saved, 0);
  });

  test('markCompleted() ignores unknown keys', async function (assert) {
    const user = makeUser();
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('bogus_key');
    assert.strictEqual(record._saved, 0);
    assert.notOk(user.onboarding.bogus_key);
  });

  test('noteRecordCreated() ticks the right derived onboarding key locally', async function (assert) {
    const user = makeUser();
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    service.noteRecordCreated('resume');
    // markCompleted is async; wait a microtask
    await Promise.resolve();
    assert.true(user.onboarding.resume_imported);
    assert.strictEqual(
      record._saved,
      0,
      'noteRecordCreated only flips derived keys; reconcile syncs server',
    );
  });

  test('noteRecordCreated() on unrelated model is a no-op', async function (assert) {
    const user = makeUser();
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    service.noteRecordCreated('summary');
    await Promise.resolve();
    assert.strictEqual(record._saved, 0);
  });

  test('noteProfileSaved() sets profile_basics only when all fields present', async function (assert) {
    const user = makeUser({ email: '' });
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    service.noteProfileSaved();
    await Promise.resolve();
    assert.notOk(user.onboarding.profile_basics);

    user.email = 'jane@example.com';
    service.noteProfileSaved();
    await Promise.resolve();
    assert.true(user.onboarding.profile_basics);
  });

  test('disableWizard() saves the OnboardingModel with wizard_enabled=false', async function (assert) {
    const user = makeUser();
    const record = makeOnboardingRecord();
    const storeStub = stubStore(record);
    this.owner.register('service:current-user', stubCurrentUser(user));
    this.owner.register('service:store', storeStub.Service);

    const service = this.owner.lookup('service:onboarding');
    await service.disableWizard();

    assert.false(user.onboarding.wizard_enabled);
    assert.strictEqual(record._saved, 1);
    assert.false(record.subjective.wizard_enabled);
  });

  test('chimeInOnPage excludes admin/docs/auth routes', function (assert) {
    this.owner.register(
      'service:current-user',
      stubCurrentUser(makeUser({ onboarding: { wizard_enabled: true } })),
    );
    const service = this.owner.lookup('service:onboarding');
    assert.false(service.chimeInOnPage('admin.users'));
    assert.false(service.chimeInOnPage('docs.career-data'));
    assert.false(service.chimeInOnPage('login'));
    assert.false(service.chimeInOnPage('setup'));
    assert.true(service.chimeInOnPage('resumes.index'));
  });
});
