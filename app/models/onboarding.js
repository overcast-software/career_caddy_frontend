import Model, { attr } from '@ember-data/model';
import { tracked } from '@glimmer/tracking';

// Singleton-per-user resource at /api/v1/users/:id/onboarding/ (the
// adapter sends `me` as the id; the server resolves it to request.user).
// Server returns a JSON:API document with type='onboarding',
// id=<user_id>, and attributes split into:
//   derived    — recomputed by .../onboarding/reconcile/ from real
//                records (Resume, JobPost, Score, CoverLetter, profile
//                basics). Read-only on the wire; PATCH writes are 400'd.
//   subjective — user/AW writable (wizard_enabled, resume_reviewed).
//                PATCH the model with .save() to persist.
//
// In addition to the persisted attrs, the record carries transient
// @tracked refs to in-flight records (the resume currently being
// ingested, the job-post currently being scored). These are *not*
// serialized — they're held in memory so the wizard can pick up where
// it left off after route navigation. They reset on page refresh
// (because currentUser.loadOnboarding re-queries the singleton) and
// on the matching poller's onStop callback clearing them.
export default class OnboardingModel extends Model {
  @attr() derived;
  @attr() subjective;

  // Transient — see header comment.
  @tracked currentResume = null;
  @tracked currentJobPost = null;

  // ─── Wizard step machine ────────────────────────────────────────────
  //
  // currentStep needs `isStaff` and the in-flight `profession` (held in
  // sessionStorage) — neither lives on the record, so callers pass them
  // in. Keeps the model honest about its inputs and avoids back-channel
  // service lookups from inside Ember Data.

  get wizardEnabled() {
    return this.subjective?.wizard_enabled !== false;
  }

  /** Returns the next incomplete step as a route slug, or `null` when
   * the wizard is complete for the given caller context. */
  currentStep({ isStaff, profession }) {
    const d = this.derived || {};
    const s = this.subjective || {};
    if (!d.profile_basics || !profession) return 'profession';
    if (!d.resume_imported) return 'resume';
    if (!s.resume_reviewed) return 'review';
    if (isStaff && !d.first_score) return 'score';
    return null;
  }

  /** True when the wizard is enabled AND the caller still has steps
   * left to do. Sidebar + post-login redirects gate on this. */
  isWizardActive({ isStaff, profession }) {
    return (
      this.wizardEnabled && this.currentStep({ isStaff, profession }) !== null
    );
  }

  /** Merge a subjective patch and persist. The api rejects derived
   * keys with 400, so callers must only pass subjective fields
   * (`wizard_enabled`, `resume_reviewed`). */
  async markSubjective(patch) {
    this.subjective = { ...(this.subjective || {}), ...patch };
    await this.save();
  }

  async disableWizard() {
    return this.markSubjective({ wizard_enabled: false });
  }

  async markResumeReviewed() {
    return this.markSubjective({ resume_reviewed: true });
  }
}
