import Service from '@ember/service';
import config from 'career-caddy-frontend/config/environment';

export default class HealthService extends Service {
  lastError = null;

  async ensureHealthy() {
    const cached = sessionStorage.getItem('cc:healthy');
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

      if (isHealthy) {
        sessionStorage.setItem('cc:healthy', 'true');
        return true;
      } else {
        this.lastError = 'API reported unhealthy status';
        return false;
      }
    } catch (error) {
      this.lastError = error.message || 'Failed to reach API';
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
}
