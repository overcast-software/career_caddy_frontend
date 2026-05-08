import { module, test } from 'qunit';
import { setupApplicationTest } from 'career-caddy-frontend/tests/helpers';
import { visit, currentURL, click } from '@ember/test-helpers';
import { authenticateSession } from 'ember-simple-auth/test-support';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// In-memory stand-in for the OnboardingModel record. Exposes the
// methods the production model has so the wizard's controllers /
// routes can call them without an Ember Data adapter round-trip.
function makeOnboardingRecord(overrides = {}) {
  return {
    id: '1',
    derived: {
      profile_basics: true,
      resume_imported: false,
      first_job_post: false,
      first_score: false,
      first_cover_letter: false,
      ...(overrides.derived || {}),
    },
    subjective: {
      wizard_enabled: true,
      resume_reviewed: false,
      ...(overrides.subjective || {}),
    },
    get wizardEnabled() {
      return this.subjective.wizard_enabled !== false;
    },
    currentStep({ isStaff, profession }) {
      const d = this.derived;
      const s = this.subjective;
      if (!d.profile_basics || !profession) return 'profession';
      if (!d.resume_imported) return 'resume';
      if (!s.resume_reviewed) return 'review';
      if (isStaff && !d.first_score) return 'score';
      return null;
    },
    isWizardActive(args) {
      return this.wizardEnabled && this.currentStep(args) !== null;
    },
    async markSubjective(patch) {
      this.subjective = { ...this.subjective, ...patch };
    },
    disableWizard() {
      return this.markSubjective({ wizard_enabled: false });
    },
    markResumeReviewed() {
      return this.markSubjective({ resume_reviewed: true });
    },
    save() {
      return Promise.resolve(this);
    },
  };
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
  @tracked onboarding = makeOnboardingRecord();
  isGuest = false;
  load() {
    return this.user;
  }
  async loadOnboarding() {
    return this.onboarding;
  }
}

class StoreStub extends Service {
  peekAll() {
    return [];
  }
  async queryRecord() {
    return null;
  }
  async findAll(type) {
    if (type === 'resume') return [];
    return [];
  }
  unloadAll() {}
}

module('Acceptance | wizard skeleton', function (hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function () {
    sessionStorage.setItem('cc:healthy', 'true');
    sessionStorage.setItem('cc:bootstrap-open', 'false');
    this.owner.unregister('service:current-user');
    this.owner.register('service:current-user', CurrentUserStub);
    this.owner.unregister('service:store');
    this.owner.register('service:store', StoreStub);
  });

  hooks.afterEach(function () {
    sessionStorage.removeItem('cc:healthy');
    sessionStorage.removeItem('cc:bootstrap-open');
    sessionStorage.removeItem('cc:wizard-profession');
    sessionStorage.removeItem('cc:wizard-step');
    sessionStorage.removeItem('cc:extension-present');
  });

  test('/wizard redirects to the first incomplete step', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    await visit('/wizard');
    assert.strictEqual(
      currentURL(),
      '/wizard/profession',
      'fresh user lands on the profession step',
    );
  });

  test('picking a profession advances to the resume step', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    await visit('/wizard/profession');
    assert.strictEqual(currentURL(), '/wizard/profession');

    const select = document.querySelector('select[name="profession"]');
    select.value = 'Software Engineering';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await click('button[type="submit"]');

    assert.strictEqual(currentURL(), '/wizard/resume');
    assert.strictEqual(
      sessionStorage.getItem('cc:wizard-profession'),
      'Software Engineering',
      'profession persisted to sessionStorage',
    );
  });

  test('/wizard/resume renders the upload surface inline', async function (assert) {
    await authenticateSession({ access_token: 'x.eyJ1c2VyX2lkIjoiMSJ9.x' });
    await visit('/wizard/resume');
    // No more redirect to /resumes/import — the upload form is embedded
    // directly so the user stays on the wizard surface.
    assert
      .dom('input[type="file"]')
      .exists('UploadForm component is mounted in the wizard');
    assert
      .dom('a[href="/wizard/profession"]')
      .exists('back link to the profession step');
  });
});
