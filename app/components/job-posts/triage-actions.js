import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import {
  VETTING_REASONS,
  reasonLabel,
} from 'career-caddy-frontend/utils/vetting-reasons';

export default class JobPostsTriageActionsComponent extends Component {
  @service store;
  @service flashMessages;
  @tracked submitting = false;

  reasonOptions = VETTING_REASONS;

  // `triage` is sourced from server response `meta.triage` — see comment
  // on JobPost model. Shape: { status, reason_code, note }.
  get triage() {
    return this.args.jobPost?.triage || null;
  }

  get activeStatus() {
    return this.triage?.status || null;
  }

  get isVettedGood() {
    return this.activeStatus === 'Vetted Good';
  }

  get isVettedBad() {
    return this.activeStatus === 'Vetted Bad';
  }

  get activeReasonCode() {
    return this.triage?.reason_code || null;
  }

  get activeReasonNote() {
    return this.triage?.note || null;
  }

  // Reason picker only needs to be visible when VB is active AND the
  // user hasn't told us *why* yet. Once a reason is set, the button
  // state itself is the signal; the picker is hidden to reduce noise.
  // Hover the Vetted Bad button to see the reason (title tooltip).
  get showReasonPicker() {
    return this.isVettedBad && !this.activeReasonCode;
  }

  get vetBadTitle() {
    if (!this.isVettedBad) return 'Mark Vetted Bad';
    const code = this.activeReasonCode;
    if (!code) return 'Vetted Bad';
    if (code === 'other') {
      const note = (this.activeReasonNote || '').trim();
      return note ? `Vetted Bad — Other: ${note}` : 'Vetted Bad — Other';
    }
    const label = reasonLabel(code);
    return label ? `Vetted Bad — ${label}` : 'Vetted Bad';
  }

  // Button text: "Vetted Bad", "✗ Vetted Bad", or "✗ Vetted Bad: <reason>"
  // when VB is active and a reason is set. For `other`, show a truncated
  // note so the button doesn't blow out the header row.
  get vetBadLabel() {
    if (!this.isVettedBad) return 'Vetted Bad';
    const code = this.activeReasonCode;
    if (!code) return '✗ Vetted Bad';
    if (code === 'other') {
      const note = (this.activeReasonNote || '').trim();
      if (!note) return '✗ Vetted Bad: Other';
      const truncated = note.length > 20 ? note.slice(0, 20) + '…' : note;
      return `✗ Vetted Bad: ${truncated}`;
    }
    const label = reasonLabel(code);
    return label ? `✗ Vetted Bad: ${label}` : '✗ Vetted Bad';
  }

  get selectedReason() {
    const code = this.activeReasonCode;
    if (!code || code === 'other') return null;
    return this.reasonOptions.find((r) => r.code === code) || null;
  }

  @action
  vet(status, extra = {}) {
    if (this.submitting) return;
    const adapter = this.store.adapterFor('job-post');
    const id = this.args.jobPost.id;
    const url = adapter.buildURL('job-post', id) + 'triage/';
    this.submitting = true;
    adapter
      .ajax(url, 'POST', { data: { status, ...extra } })
      .then((payload) => {
        this.store.pushPayload('job-post', payload);
        this.flashMessages.success(`Marked ${status}.`);
      })
      .catch((error) => {
        const detail = error?.errors?.[0]?.detail ?? 'Triage failed.';
        this.flashMessages.danger(detail);
      })
      .finally(() => {
        this.submitting = false;
      });
  }

  @action
  vetGood() {
    this.vet('Vetted Good');
  }

  @action
  vetBad() {
    this.vet('Vetted Bad');
  }

  @action
  pickReason(choice) {
    if (!choice) return;
    this.vet('Vetted Bad', { reason_code: choice.code });
  }

  @action
  pickOther(text) {
    const note = (text || '').trim();
    if (!note) return;
    this.vet('Vetted Bad', { reason_code: 'other', note });
  }

  @action
  showCreateWhen(term) {
    return !!(term && term.trim());
  }

  @action
  buildOtherSuggestion(term) {
    return `Other: "${term}"`;
  }
}
