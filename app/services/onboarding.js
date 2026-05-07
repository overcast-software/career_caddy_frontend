import Service, { service } from '@ember/service';

const DEFAULT_ONBOARDING = {
  wizard_enabled: true,
  profile_basics: false,
  resume_imported: false,
  resume_reviewed: false,
  first_job_post: false,
  first_score: false,
  first_cover_letter: false,
};

// Subjective keys are user-claimed state nothing on the server can verify.
// Only these are PATCH-able via /api/v1/onboarding/. Derived keys are
// recomputed by /api/v1/onboarding/reconcile/ from real records — sending
// them in a PATCH gets a 400.
const SUBJECTIVE_KEYS = new Set(['wizard_enabled', 'resume_reviewed']);

const CREATE_TYPE_TO_KEY = {
  resume: 'resume_imported',
  'job-post': 'first_job_post',
  score: 'first_score',
  'cover-letter': 'first_cover_letter',
};

const CHECKLIST_ORDER = [
  {
    key: 'profile_basics',
    label: 'Fill in name + email',
    route: 'settings.profile.edit',
  },
  { key: 'resume_imported', label: 'Import a resume', route: 'resumes.import' },
  {
    key: 'resume_reviewed',
    label: 'Review extracted resume fields',
    route: 'resumes.show',
  },
  {
    key: 'first_job_post',
    label: 'Add a job post to target',
    route: 'job-posts.new',
  },
  {
    key: 'first_score',
    label: 'Score your resume against a job',
    route: 'job-posts.index',
  },
  {
    key: 'first_cover_letter',
    label: 'Generate a cover letter',
    route: 'cover-letters.new',
  },
];

export default class OnboardingService extends Service {
  @service currentUser;
  @service store;

  get user() {
    return this.currentUser.user || null;
  }

  get resolved() {
    const stored = this.user?.onboarding;
    return { ...DEFAULT_ONBOARDING, ...(stored || {}) };
  }

  get wizardEnabled() {
    return this.resolved.wizard_enabled !== false;
  }

  get checklist() {
    const state = this.resolved;
    return CHECKLIST_ORDER.map((item) => ({
      ...item,
      completed: Boolean(state[item.key]),
    }));
  }

  get nextAction() {
    return this.checklist.find((item) => !item.completed) || null;
  }

  get guidanceAvailable() {
    return this.wizardEnabled && this.nextAction !== null;
  }

  snapshotForChat() {
    return { ...this.resolved };
  }

  chimeInOnPage(routeName) {
    if (!this.guidanceAvailable) return false;
    if (!routeName) return false;
    if (routeName.startsWith('admin')) return false;
    if (routeName.startsWith('docs')) return false;
    if (routeName === 'setup' || routeName === 'login') return false;
    return true;
  }

  async markCompleted(key) {
    if (!(key in DEFAULT_ONBOARDING)) return;
    const user = this.user;
    if (!user) return;
    const current = { ...(user.onboarding || {}) };
    if (current[key] === true) return;
    current[key] = true;
    user.onboarding = current;
    if (SUBJECTIVE_KEYS.has(key)) {
      // Subjective keys are user-claimed state — persist via the strict
      // /api/v1/onboarding/ endpoint backed by the OnboardingModel.
      await this._saveSubjective({ [key]: true });
    }
    // Derived keys (resume_imported, first_*, profile_basics) are recomputed
    // by /api/v1/onboarding/reconcile/ on the next chat turn — skipping the
    // server PATCH. Local cache flip already gives immediate UI feedback.
  }

  async disableWizard() {
    const user = this.user;
    if (!user) return;
    const current = { ...(user.onboarding || {}) };
    current.wizard_enabled = false;
    user.onboarding = current;
    await this._saveSubjective({ wizard_enabled: false });
  }

  async _saveSubjective(subjectivePatch) {
    try {
      const record =
        this.store.peekAll('onboarding').at(0) ||
        (await this.store.queryRecord('onboarding', {}));
      const subjective = { ...(record.subjective || {}), ...subjectivePatch };
      record.subjective = subjective;
      await record.save();
    } catch {
      // Best-effort. Local user.onboarding is already updated for immediate
      // UI; the next reconcile call rebuilds derived flags server-side.
    }
  }

  noteRecordCreated(modelName) {
    const key = CREATE_TYPE_TO_KEY[modelName];
    if (!key) return;
    if (this.resolved[key]) return;
    this.markCompleted(key);
  }

  noteProfileSaved() {
    const user = this.user;
    if (!user) return;
    if (this.resolved.profile_basics) return;
    if (user.firstName && user.lastName && user.email) {
      this.markCompleted('profile_basics');
    }
  }
}
