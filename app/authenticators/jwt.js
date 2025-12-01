import Base from 'ember-simple-auth/authenticators/base';
import { service } from '@ember/service';
import config from 'career-caddy-frontend/config/environment';
import { buildBaseUrl } from 'career-caddy-frontend/utils/base-url';
import { decodeExp, now } from 'career-caddy-frontend/utils/jwt';

export default class JwtAuthenticator extends Base {
  @service router;
  @service session;
  
  refreshTimerId = null;
  refreshInFlight = null;

  get baseUrl() {
    return buildBaseUrl();
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
    const exp = decodeExp(data.access);
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

    // Ensure exp is always present
    if (!data.exp) {
      data.exp = decodeExp(data.access);
    }

    const nowTime = now();
    
    if (data.exp && nowTime < data.exp) {
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
    const exp = decodeExp(responseData.access);
    
    return {
      ...data,
      access: responseData.access,
      refresh: responseData.refresh || data.refresh,
      exp: exp
    };
  }

  scheduleRefresh(data) {
    this.cancelRefresh();
    if (data.exp) {
      const refreshTimeMs = (data.exp - now() - 60) * 1000;
      
      if (refreshTimeMs <= 0) {
        // Token is near/past expiry, refresh immediately
        this.refresh(data).then((refreshedData) => {
          this.session.set('data.authenticated', refreshedData);
          this.scheduleRefresh(refreshedData);
        }).catch((error) => {
          console.warn('Immediate token refresh failed:', error);
        });
        return;
      }
      
      this.refreshTimerId = setTimeout(async () => {
        try {
          const latest = this.session.data?.authenticated || data;
          const refreshedData = await this.refresh(latest);
          this.session.set('data.authenticated', refreshedData);
          this.scheduleRefresh(refreshedData); // Reschedule for next cycle
        } catch (error) {
          console.warn('Background token refresh failed:', error);
        }
      }, refreshTimeMs);
    }
  }

  cancelRefresh() {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
  }

}
