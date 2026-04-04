import Service from 'ember-simple-auth/services/session';
import { service } from '@ember/service';
import { getOwner } from '@ember/application';
import { decodeExp, now } from 'career-caddy-frontend/utils/jwt';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';
import config from 'career-caddy-frontend/config/environment';

export default class SessionService extends Service {
  @service router;

  _activityWatchStarted = false;

  get accessToken() {
    return this.data?.authenticated?.access || null;
  }

  get refreshToken() {
    return this.data?.authenticated?.refresh || null;
  }

  get authorizationHeader() {
    return this.accessToken ? `Bearer ${this.accessToken}` : null;
  }

  async refresh() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const authenticator = getOwner(this).lookup('authenticator:jwt');
    const newData = await authenticator.refresh(this.data.authenticated);
    this.data.authenticated = newData;
    authenticator.scheduleRefresh(newData);
    return newData;
  }

  handleAuthentication(transition) {
    if (transition) {
      transition.retry();
    } else {
      this.router.transitionTo('index');
    }
  }

  handleInvalidation() {
    this.router.transitionTo('login');
  }

  async ensureFreshToken(minBufferSec = 90) {
    if (!this.isAuthenticated) {
      return;
    }

    let exp = this.data?.authenticated?.exp;
    if (!exp && this.accessToken) {
      exp = decodeExp(this.accessToken);
    }

    if (exp) {
      const nowTime = now();
      if (exp - nowTime <= minBufferSec) {
        await this.refresh();
      }
    }
  }

  async bootstrapSuperuser(formData) {
    const bootstrapPath =
      config.APP.AUTH?.BOOTSTRAP_PATH ?? 'users/bootstrap-superuser/';
    const url = `${buildBaseUrl()}${bootstrapPath}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const err = new Error(
        data.detail || data.message || 'Failed to create account',
      );
      err.status = response.status;
      throw err;
    }

    return response.json();
  }

  startActivityWatch() {
    if (this._activityWatchStarted) {
      return;
    }

    this._activityWatchStarted = true;
    let debounceTimer = null;

    const handleActivity = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        if (document.visibilityState === 'visible' && this.isAuthenticated) {
          try {
            await this.ensureFreshToken(90);
          } catch (error) {
            console.warn('Activity refresh failed:', error);
          }
        }
      }, 100);
    };

    window.addEventListener('focus', handleActivity);
    document.addEventListener('visibilitychange', handleActivity);
  }
}
