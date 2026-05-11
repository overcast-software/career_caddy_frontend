import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

export default class AcceptInviteController extends Controller {
  queryParams = ['token'];

  @tracked token = '';
  @tracked username = '';
  @tracked firstName = '';
  @tracked lastName = '';
  @tracked password = '';
  @tracked confirmPassword = '';
  @tracked saving = false;
  @tracked success = false;
  @tracked errorMessage = null;

  @action
  updateUsername(event) {
    this.username = event.target.value;
  }

  @action
  updateFirstName(event) {
    this.firstName = event.target.value;
  }

  @action
  updateLastName(event) {
    this.lastName = event.target.value;
  }

  @action
  updatePassword(event) {
    this.password = event.target.value;
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

    if (!this.username.trim()) {
      this.errorMessage = 'Please choose a username.';
      this.saving = false;
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Please enter a password.';
      this.saving = false;
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.saving = false;
      return;
    }

    if (!this.token) {
      this.errorMessage = 'Invalid invitation link.';
      this.saving = false;
      return;
    }

    try {
      // KEEP raw fetch: pre-auth invitation redemption.
      const url = `${buildBaseUrl()}accept-invite/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: this.token,
          username: this.username.trim(),
          password: this.password,
          first_name: this.firstName.trim(),
          last_name: this.lastName.trim(),
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
