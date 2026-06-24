import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import config from 'career-caddy-frontend/config/environment';

export default class HealthService extends Service {
  @tracked bootstrapOpen = false;
  @tracked registrationOpen = false;
  lastError = null;

  async ensureHealthy() {
    const cached = sessionStorage.getItem('cc:healthy');
    const cachedBootstrap = sessionStorage.getItem('cc:bootstrap-open');

    if (cachedBootstrap !== null) {
      this.bootstrapOpen = cachedBootstrap === 'true';
    }

    const cachedRegistration = sessionStorage.getItem('cc:registration-open');
    if (cachedRegistration !== null) {
      this.registrationOpen = cachedRegistration === 'true';
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
      const registrationOpen = data.registration_open === true;

      this.bootstrapOpen = bootstrapOpen;
      this.registrationOpen = registrationOpen;

      // Track the last API-confirmed initialized state in localStorage
      // (survives reload + new tab, unlike the sessionStorage caches
      // below). When the API affirmatively reports bootstrap is closed,
      // remember the system is initialized so a later UNREACHABLE
      // healthcheck can never re-expose /setup. When it reports bootstrap
      // is open (genuine first-run, or a self-hoster who wiped the DB),
      // clear the marker so first-run can run again.
      if (bootstrapOpen) {
        localStorage.removeItem('cc:initialized');
      } else {
        localStorage.setItem('cc:initialized', 'true');
      }

      sessionStorage.setItem(
        'cc:bootstrap-open',
        bootstrapOpen ? 'true' : 'false',
      );
      sessionStorage.setItem(
        'cc:registration-open',
        registrationOpen ? 'true' : 'false',
      );

      if (isHealthy) {
        sessionStorage.setItem('cc:healthy', 'true');
        return true;
      } else {
        this.lastError = 'API reported unhealthy status';
        return false;
      }
    } catch (error) {
      // Fail open ONLY for a genuine first-run. A network/CORS failure
      // during healthcheck must not lock a brand-new self-hosted user out
      // of /setup — but once the API has ever confirmed the system is
      // initialized (cc:initialized marker), a transient failure must
      // NEVER re-expose the wizard. Leave bootstrapOpen false so an
      // initialized site stays out of /setup on a blip; only fail open
      // when the marker is absent (true first-run, API briefly down).
      this.lastError = error.message || 'Failed to reach API';
      if (localStorage.getItem('cc:initialized') === 'true') {
        return false;
      }
      this.bootstrapOpen = true;
      sessionStorage.setItem('cc:bootstrap-open', 'true');
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
    // Mirror ensureHealthy so the initialized marker stays authoritative
    // across both write paths: a confirmed-closed bootstrap (e.g. right
    // after first-run init in setup.js) marks the system initialized so a
    // later unreachable healthcheck never re-exposes /setup; an explicitly
    // opened bootstrap clears it.
    if (value) {
      localStorage.removeItem('cc:initialized');
    } else {
      localStorage.setItem('cc:initialized', 'true');
    }
  }
}
