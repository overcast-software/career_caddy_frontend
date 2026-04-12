import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

export default class ForgotPasswordController extends Controller {
  @tracked email = '';
  @tracked saving = false;
  @tracked submitted = false;
  @tracked errorMessage = null;

  @action
  updateEmail(event) {
    this.email = event.target.value;
  }

  @action
  async submit(event) {
    event.preventDefault();
    this.saving = true;
    this.errorMessage = null;

    const email = this.email.trim();
    if (!email) {
      this.errorMessage = 'Please enter your email address.';
      this.saving = false;
      return;
    }

    try {
      const url = `${buildBaseUrl()}password-reset/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        this.submitted = true;
      } else {
        const data = await response.json().catch(() => ({}));
        const detail = data?.errors?.[0]?.detail;
        this.errorMessage = detail || 'Something went wrong. Please try again.';
      }
    } catch {
      this.errorMessage = 'Unable to reach the server. Please try again later.';
    } finally {
      this.saving = false;
    }
  }
}
