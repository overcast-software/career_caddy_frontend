import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

function makeOnboarding(owner, attrs = {}) {
  const store = owner.lookup('service:store');
  return store.createRecord('onboarding', {
    derived: {
      profile_basics: false,
      resume_imported: false,
      first_job_post: false,
      first_score: false,
      first_cover_letter: false,
      ...(attrs.derived || {}),
    },
    subjective: {
      wizard_enabled: true,
      resume_reviewed: false,
      ...(attrs.subjective || {}),
    },
  });
}

module('Unit | Model | onboarding', function (hooks) {
  setupTest(hooks);

  test('wizardEnabled reads subjective.wizard_enabled, defaults to true', function (assert) {
    const r = makeOnboarding(this.owner, { subjective: {} });
    assert.true(r.wizardEnabled);

    r.subjective = { wizard_enabled: false };
    assert.false(r.wizardEnabled);
  });

  test('currentStep walks the wizard in order', function (assert) {
    const r = makeOnboarding(this.owner);
    // Missing profile_basics + no profession → profession step.
    assert.strictEqual(
      r.currentStep({ isStaff: false, profession: null }),
      'profession',
    );

    // profile_basics complete, still no profession → still profession.
    r.derived = { ...r.derived, profile_basics: true };
    assert.strictEqual(
      r.currentStep({ isStaff: false, profession: null }),
      'profession',
    );

    // Profession picked → resume step.
    assert.strictEqual(
      r.currentStep({ isStaff: false, profession: 'PM' }),
      'resume',
    );

    r.derived = { ...r.derived, resume_imported: true };
    assert.strictEqual(
      r.currentStep({ isStaff: false, profession: 'PM' }),
      'review',
    );

    r.subjective = { ...r.subjective, resume_reviewed: true };
    assert.strictEqual(
      r.currentStep({ isStaff: false, profession: 'PM' }),
      null,
      'non-staff complete after review',
    );
    assert.strictEqual(
      r.currentStep({ isStaff: true, profession: 'PM' }),
      'score',
      'staff still need first_score',
    );

    r.derived = { ...r.derived, first_score: true };
    assert.strictEqual(
      r.currentStep({ isStaff: true, profession: 'PM' }),
      null,
    );
  });

  test('isWizardActive combines wizardEnabled and currentStep', function (assert) {
    const r = makeOnboarding(this.owner, {
      derived: {
        profile_basics: true,
        resume_imported: true,
      },
      subjective: {
        wizard_enabled: true,
        resume_reviewed: true,
      },
    });
    // All required steps complete for non-staff → not active.
    assert.false(r.isWizardActive({ isStaff: false, profession: 'PM' }));

    // Disable explicitly — should be inactive even if steps remain.
    r.subjective = {
      wizard_enabled: false,
      resume_reviewed: false,
    };
    assert.false(r.isWizardActive({ isStaff: false, profession: 'PM' }));
  });

  test('markSubjective merges and marks the record dirty', async function (assert) {
    const r = makeOnboarding(this.owner);
    let saved = false;
    r.save = () => {
      saved = true;
      return Promise.resolve(r);
    };
    await r.markSubjective({ resume_reviewed: true });
    assert.true(r.subjective.resume_reviewed);
    assert.true(r.subjective.wizard_enabled, 'pre-existing keys preserved');
    assert.true(saved, 'save() invoked');
  });

  test('disableWizard / markResumeReviewed are subjective-write helpers', async function (assert) {
    const r = makeOnboarding(this.owner);
    r.save = () => Promise.resolve(r);

    await r.disableWizard();
    assert.false(r.subjective.wizard_enabled);

    await r.markResumeReviewed();
    assert.true(r.subjective.resume_reviewed);
  });
});
