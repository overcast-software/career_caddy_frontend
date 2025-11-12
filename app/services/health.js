import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import config from 'career-caddy-frontend/config/environment';

export default class HealthService extends Service {
  @tracked bootstrapOpen = false;
  lastError = null;

  async ensureHealthy() {
    const cached = sessionStorage.getItem('cc:healthy');
    const cachedBootstrap = sessionStorage.getItem('cc:bootstrap-open');

    if (cachedBootstrap !== null) {
      this.bootstrapOpen = cachedBootstrap === 'true';
    }

    if (cached === 'true') {
      return true;
    }

    try {
      const apiHost = config.APP.API_HOST;
      const apiNamespace = config.APP.API_NAMESPACE;
      const healthcheckPath = config.APP.HEALTHCHECK_PATH;

      let url;
      if (apiHost) {
        // Remove trailing slash from apiHost and leading slash from apiNamespace if present
        const cleanHost = apiHost.replace(/\/$/, '');
        const cleanNamespace = apiNamespace.replace(/^\//, '');
        const cleanPath = healthcheckPath.replace(/^\//, '');
        url = `${cleanHost}/${cleanNamespace}/${cleanPath}`;
      } else {
        // Same-origin request
        const cleanNamespace = apiNamespace.replace(/^\//, '');
        const cleanPath = healthcheckPath.replace(/^\//, '');
        url = `/${cleanNamespace}/${cleanPath}`;
      }

      const response = await fetch(url, {
        credentials: 'same-origin',
      });

      if (!response.ok) {
        this.lastError = `Health check failed with status ${response.status}`;
        return false;
      }

      const data = await response.json();
      const isHealthy = data.healthy === true;
      const bootstrapOpen = data.bootstrap_open === true;

      this.bootstrapOpen = bootstrapOpen;
      sessionStorage.setItem(
        'cc:bootstrap-open',
        bootstrapOpen ? 'true' : 'false',
      );

      if (isHealthy) {
        sessionStorage.setItem('cc:healthy', 'true');
        return true;
      } else {
        this.lastError = 'API reported unhealthy status';
        return false;
      }
    } catch (error) {
      this.lastError = error.message || 'Failed to reach API';
      this.bootstrapOpen = false;
      sessionStorage.setItem('cc:bootstrap-open', 'false');
      return false;
    }
  }

  setHealthy(healthy) {
    if (healthy) {
      sessionStorage.setItem('cc:healthy', 'true');
    } else {
      sessionStorage.removeItem('cc:healthy');
    }
  }

  setBootstrapOpen(value) {
    this.bootstrapOpen = value;
    sessionStorage.setItem('cc:bootstrap-open', value ? 'true' : 'false');
  }
}
