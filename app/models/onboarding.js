import Model, { attr } from '@ember-data/model';

// Singleton-per-user resource at /api/v1/users/:id/onboarding/ (the
// adapter sends `me` as the id; the server resolves it to request.user).
// Server returns a JSON:API document with type='onboarding',
// id=<user_id>, and attributes split into:
//   derived    — recomputed by .../onboarding/reconcile/ from real
//                records (Resume, JobPost, Score, CoverLetter, profile
//                basics). Read-only on the wire; PATCH writes are 400'd.
//   subjective — user/AW writable (wizard_enabled, resume_reviewed).
//                PATCH the model with .save() to persist.
export default class OnboardingModel extends Model {
  @attr() derived;
  @attr() subjective;
}
