import Component from '@glimmer/component';
import { reasonLabel } from 'career-caddy-frontend/utils/vetting-reasons';

// Read-only RICH card for one published job-post on the public /@dough profile
// (FRON-121). The human twin of @dough's rich ActivityPub Note: role · company
// · location, plus the owner's verdict / score / applied signals. PUBLIC and
// read-only — no triage buttons. Every derived value is null-safe: a missing
// verdict/score/applied drops its pill rather than rendering "None" (acceptance
// requirement). All inputs are denormalized public-safe fields the federated
// projection emits (frontend memory public-profile-surface-pattern); this
// component never reaches into the `scores`/`jobApplications` relationships
// (which are absent on the public projection) and never links to the internal
// job-post show route (those pages aren't human-public).
export default class ProfilePostCardComponent extends Component {
  get post() {
    return this.args.post;
  }

  // External "view original" link, mirroring the api's AP `url` resolution
  // order: resolved apply_url → canonical_link → link. NEVER the internal
  // /job-posts/<id> show route (not human-public). Null-safe — returns null if
  // the post somehow carries no outbound URL, in which case the title renders
  // as plain text instead of a link.
  get externalUrl() {
    const p = this.post;
    if (!p) return null;
    if (p.applyUrl && p.applyUrlStatus === 'resolved') return p.applyUrl;
    return p.canonicalLink || p.link || null;
  }

  // The displayed posting date: explicit postedDate, else when it entered CC.
  get postedAt() {
    return this.post?.postedDate || this.post?.createdAt || null;
  }

  // ── Verdict ────────────────────────────────────────────────────────────
  // Sourced from `meta.triage` (the owner-scoped triage on the public
  // projection — same channel the authed app uses) with a flat `verdict`
  // attribute fallback. Returns the human status string or null.
  get verdictStatus() {
    const triage = this.post?.triage;
    if (triage?.status) return triage.status;
    const verdict = this.post?.verdict;
    if (typeof verdict === 'string') return verdict || null;
    return verdict?.status || null;
  }

  get isVettedGood() {
    return this.verdictStatus === 'Vetted Good';
  }

  get isVettedBad() {
    return this.verdictStatus === 'Vetted Bad';
  }

  // Reason code accompanies a Vetted Bad verdict. We render the LABEL only —
  // never the free-text note (which the public projection does not emit).
  get verdictReasonCode() {
    return (
      this.post?.triage?.reason_code || this.post?.verdict?.reason_code || null
    );
  }

  // "Vetted good" / "Vetted bad" / "Vetted bad (Compensation)". Null when no
  // verdict so the pill drops entirely.
  get verdictLabel() {
    if (this.isVettedGood) return 'Vetted good';
    if (this.isVettedBad) {
      const label = reasonLabel(this.verdictReasonCode);
      return label ? `Vetted bad (${label})` : 'Vetted bad';
    }
    return null;
  }

  // ── Score ──────────────────────────────────────────────────────────────
  // typeof guard so a legitimate 0 isn't swallowed by falsiness.
  get score() {
    const s = this.post?.score;
    return typeof s === 'number' ? s : null;
  }

  get hasScore() {
    return this.score !== null;
  }

  // Bucket tier on the documented 80 / 60 thresholds (see docs/scores.hbs).
  get scoreTier() {
    const s = this.score;
    if (s === null) return null;
    if (s >= 80) return 'strong';
    if (s >= 60) return 'reasonable';
    return 'stretch';
  }

  // "Strong match (87)" — bucket label + raw number in parens, matching the
  // rich ActivityPub Note format (activitypub-dough-uses-personalized-jp-format).
  get scoreLabel() {
    if (!this.hasScore) return null;
    const bucket =
      this.scoreTier === 'strong'
        ? 'Strong match'
        : this.scoreTier === 'reasonable'
          ? 'Reasonable fit'
          : 'Long shot';
    return `${bucket} (${this.score})`;
  }

  // ── Applied ────────────────────────────────────────────────────────────
  get applied() {
    return this.post?.applied === true;
  }
}
