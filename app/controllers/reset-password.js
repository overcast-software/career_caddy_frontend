import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

export default class ResetPasswordController extends Controller {
  queryParams = ['token', 'uid'];

  @tracked token = '';
  @tracked uid = '';
  @tracked newPassword = '';
  @tracked confirmPassword = '';
  @tracked saving = false;
  @tracked success = false;
  @tracked errorMessage = null;

  @action
  updateNewPassword(event) {
    this.newPassword = event.target.value;
  }

  @action
  updateConfirmPassword(event) {
    this.confirmPassword = event.target.value;
  }

  @action
  async submit(event) {
    event.preventDefault();
    this.saving = true;
    this.errorMessage = null;

    if (!this.newPassword) {
      this.errorMessage = 'Please enter a new password.';
      this.saving = false;
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.saving = false;
      return;
    }

    if (!this.token || !this.uid) {
      this.errorMessage = 'Invalid reset link. Please request a new one.';
      this.saving = false;
      return;
    }

    try {
      const url = `${buildBaseUrl()}password-reset/confirm/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          uid: this.uid,
          new_password: this.newPassword,
        }),
      });

      if (response.ok) {
        this.success = true;
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
