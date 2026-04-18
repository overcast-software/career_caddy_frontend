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
    _saved: 0,
    async save() {
      this._saved += 1;
    },
  };
}

function stubCurrentUser(user) {
  return class CurrentUserStub extends Service {
    @tracked user = user;
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

  test('markCompleted() flips the bit and saves', async function (assert) {
    const user = makeUser({ onboarding: { resume_imported: true } });
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('resume_reviewed');
    assert.true(user.onboarding.resume_reviewed);
    assert.strictEqual(user._saved, 1);
  });

  test('markCompleted() is a no-op for already-completed keys', async function (assert) {
    const user = makeUser({
      onboarding: { wizard_enabled: true, resume_imported: true },
    });
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('resume_imported');
    assert.strictEqual(user._saved, 0);
  });

  test('markCompleted() ignores unknown keys', async function (assert) {
    const user = makeUser();
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    await service.markCompleted('bogus_key');
    assert.strictEqual(user._saved, 0);
    assert.notOk(user.onboarding.bogus_key);
  });

  test('noteRecordCreated() ticks the right onboarding key', async function (assert) {
    const user = makeUser();
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    service.noteRecordCreated('resume');
    // markCompleted is async; wait a microtask
    await Promise.resolve();
    assert.true(user.onboarding.resume_imported);
  });

  test('noteRecordCreated() on unrelated model is a no-op', async function (assert) {
    const user = makeUser();
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    service.noteRecordCreated('summary');
    await Promise.resolve();
    assert.strictEqual(user._saved, 0);
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

  test('disableWizard() writes wizard_enabled=false', async function (assert) {
    const user = makeUser();
    this.owner.register('service:current-user', stubCurrentUser(user));
    const service = this.owner.lookup('service:onboarding');
    await service.disableWizard();
    assert.false(user.onboarding.wizard_enabled);
    assert.strictEqual(user._saved, 1);
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
