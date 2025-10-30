import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import config from 'career-caddy-frontend/config/environment';

export default class SessionService extends Service {
  @tracked accessToken = null;
  @tracked refreshToken = null;
  @tracked accessExp = null;
  refreshInFlight = null;
  refreshTimerId = null;

  constructor() {
    super(...arguments);
    this.loadFromStorage();
  }

  get isAuthenticated() {
    return this.accessToken && this.now() < this.accessExp;
  }

  get authorizationHeader() {
    return this.accessToken ? `Bearer ${this.accessToken}` : null;
  }

  get baseUrl() {
    const host = (config.APP.API_HOST || '').replace(/\/+$/, '');
    const namespace = (config.APP.API_NAMESPACE || 'api/v1').replace(
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
      }
    );
  }

  loadFromStorage() {
    const accessToken = localStorage.getItem('cc:jwt:access');
    const refreshToken = localStorage.getItem('cc:jwt:refresh');

    if (accessToken && refreshToken) {
      try {
        const exp = this.decodeExp(accessToken);
        if (this.now() < exp) {
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;
          this.accessExp = exp;
          this.scheduleRefresh();
        } else {
          this.clearStorage();
        }
      } catch (error) {
        console.log(error)
        this.clearStorage(); //
      }
    }
  }

  persist() {
    if (this.accessToken && this.refreshToken) {
      localStorage.setItem('cc:jwt:access', this.accessToken);
      localStorage.setItem('cc:jwt:refresh', this.refreshToken);
    }
  }

  clearStorage() {
    localStorage.removeItem('cc:jwt:access');
    localStorage.removeItem('cc:jwt:refresh');
  }

  scheduleRefresh() {
    this.cancelRefresh();
    if (this.accessExp) {
      const refreshTime = (this.accessExp - this.now() - 60) * 1000;
      if (refreshTime > 0) {
        this.refreshTimerId = setTimeout(() => {
          this.refresh().catch(() => {
            // Silent fail for background refresh
          });
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

  async register(userData) {
    const url = `${this.baseUrl}${this.authConfig.BOOTSTRAP_PATH}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorObj = new Error(
        error.detail || error.message || 'Registration failed',
      );
      errorObj.status = response.status;
      throw errorObj;
    }

    return await response.json();
  }

  async login(username, password) {
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
    this.accessToken = data.access;
    this.refreshToken = data.refresh;
    this.accessExp = this.decodeExp(data.access);
    this.persist();
    this.scheduleRefresh();
  }

  async refresh() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this._performRefresh();
    try {
      await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  async _performRefresh() {
    const url = `${this.baseUrl}${this.authConfig.REFRESH_PATH}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: this.refreshToken }),
    });

    if (!response.ok) {
      if (response.status === 400 || response.status === 401) {
        this.logout();
      }
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.accessToken = data.access;
    this.accessExp = this.decodeExp(data.access);
    this.persist();
    this.scheduleRefresh();
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    this.accessExp = null;
    this.cancelRefresh();
    this.clearStorage();
  }
}
