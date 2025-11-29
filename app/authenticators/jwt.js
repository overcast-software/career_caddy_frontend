import Base from 'ember-simple-auth/authenticators/base';
import { service } from '@ember/service';
import config from 'career-caddy-frontend/config/environment';

export default class JwtAuthenticator extends Base {
  @service router;
  
  refreshTimerId = null;
  refreshInFlight = null;

  get baseUrl() {
    const host = (config.APP.API_HOST ?? '').replace(/\/+$/, '');
    const namespace = (config.APP.API_NAMESPACE ?? 'api/v1').replace(
      /^\/+|\/+$/g,
      '',
    );
    return `${host}/${namespace}/`;
  }

  get authConfig() {
    return (
      config.APP.AUTH || {
        TOKEN_PATH: 'token/',
        REFRESH_PATH: 'token/refresh/',
        REGISTER_PATH: 'auth/register/',
        BOOTSTRAP_PATH: 'users/bootstrap-superuser/',
      }
    );
  }

  async authenticate(username, password) {
    const url = `${this.baseUrl}${this.authConfig.TOKEN_PATH}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    const exp = this.decodeExp(data.access);
    const authenticatedData = {
      access: data.access,
      refresh: data.refresh,
      exp: exp
    };

    this.scheduleRefresh(authenticatedData);
    return authenticatedData;
  }

  async restore(data) {
    if (!data.access || !data.refresh) {
      throw new Error('No tokens available');
    }

    const now = this.now();
    
    if (data.exp && now < data.exp) {
      this.scheduleRefresh(data);
      return data;
    }

    // Token expired, try to refresh
    try {
      const refreshedData = await this.refresh(data);
      this.scheduleRefresh(refreshedData);
      return refreshedData;
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }

  async invalidate() {
    this.cancelRefresh();
    return Promise.resolve();
  }

  async refresh(data) {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this._performRefresh(data);
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async _performRefresh(data) {
    const url = `${this.baseUrl}${this.authConfig.REFRESH_PATH}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: data.refresh }),
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        throw new Error('Refresh token invalid');
      }
      throw new Error('Token refresh failed');
    }

    const responseData = await response.json();
    const exp = this.decodeExp(responseData.access);
    
    return {
      ...data,
      access: responseData.access,
      exp: exp
    };
  }

  scheduleRefresh(data) {
    this.cancelRefresh();
    if (data.exp) {
      const refreshTime = (data.exp - this.now() - 60) * 1000;
      if (refreshTime > 0) {
        this.refreshTimerId = setTimeout(async () => {
          try {
            const refreshedData = await this.refresh(data);
            // Trigger session update with new data
            if (this.session?.isAuthenticated) {
              this.session.set('data.authenticated', refreshedData);
            }
          } catch (error) {
            // Silent fail for background refresh - let normal request flow handle it
            console.warn('Background token refresh failed:', error);
          }
        }, refreshTime);
      }
    }
  }

  cancelRefresh() {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

  decodeExp(token) {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return decoded.exp;
  }

  now() {
    return Math.floor(Date.now() / 1000);
  }
}
