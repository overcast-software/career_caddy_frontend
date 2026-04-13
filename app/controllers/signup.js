import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';

export default class SignupController extends Controller {
  @service health;

  @tracked email = '';
  @tracked username = '';
  @tracked firstName = '';
  @tracked lastName = '';
  @tracked password = '';
  @tracked confirmPassword = '';
  @tracked saving = false;
  @tracked success = false;
  @tracked errorMessage = null;

  get registrationOpen() {
    return this.health.registrationOpen;
  }

  @action
  updateEmail(event) {
    this.email = event.target.value;
  }

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
  async submitRegistration(event) {
    event.preventDefault();
    this.saving = true;
    this.errorMessage = null;

    if (!this.username.trim()) {
      this.errorMessage = 'Please choose a username.';
      this.saving = false;
      return;
    }

    if (!this.email.trim()) {
      this.errorMessage = 'Please enter your email address.';
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

    try {
      const url = `${buildBaseUrl()}auth/register/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.api+json' },
        body: JSON.stringify({
          data: {
            type: 'users',
            attributes: {
              username: this.username.trim(),
              email: this.email.trim(),
              password: this.password,
              first_name: this.firstName.trim(),
              last_name: this.lastName.trim(),
            },
          },
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

  @action
  async submitWaitlist(event) {
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
      const url = `${buildBaseUrl()}waitlist/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        this.success = true;
      } else {
        const data = await response.json().catch(() => ({}));
        const detail = data?.errors?.[0]?.detail;
        if (response.status === 409) {
          this.errorMessage =
            detail || 'This email is already on the waiting list.';
        } else {
          this.errorMessage =
            detail || 'Something went wrong. Please try again.';
        }
      }
    } catch {
      this.errorMessage = 'Unable to reach the server. Please try again later.';
    } finally {
      this.saving = false;
    }
  }
}
