'use strict';

module.exports = function (environment) {
  const ENV = {
    modulePrefix: 'career-caddy-frontend',
    environment,
    rootURL: '/',
    locationType: 'history',
    EmberENV: {
      EXTEND_PROTOTYPES: false,
      FEATURES: {
        // Here you can enable experimental features on an ember canary build
        // e.g. EMBER_NATIVE_DECORATOR_SUPPORT: true
      },
    },

    APP: {
      API_HOST: null,
      API_NAMESPACE: 'api/v1',
      HEALTHCHECK_PATH: '/healthcheck',
      AUTH: {
        TOKEN_PATH: 'token/',
        REFRESH_PATH: 'token/refresh/',
        REGISTER_PATH: 'auth/register/',
        BOOTSTRAP_PATH: 'users/bootstrap-superuser/',
      },
      PUBLIC_LINKS: {
        aboutUrl: 'https://github.com/your-org/career-caddy#about',
        docsUrl: 'https://github.com/your-org/career-caddy/wiki',
        githubUrl: 'https://github.com/your-org/career-caddy',
      },
    },
  };

  if (environment === 'development') {
    if (process.env.API_HOST) {
      ENV.APP.API_HOST = process.env.API_HOST;
    } else {
      ENV.APP.API_HOST = null; // use same-origin; Ember CLI proxy will forward to 8000
    }
    if (process.env.API_NAMESPACE) {
      ENV.APP.API_NAMESPACE = process.env.API_NAMESPACE;
    }

    // Build CSP connect-src dynamically
    let connectSrc = "'self'";
    if (ENV.APP.API_HOST) {
      connectSrc += ` ${ENV.APP.API_HOST}`;
    } else {
      connectSrc += ' http://localhost:8000';
    }

    ENV.contentSecurityPolicy = {
      'connect-src': connectSrc,
    };
  }

  if (environment === 'test') {
    // Testem prefers this...
    ENV.locationType = 'none';

    // keep test console output quieter
    ENV.APP.LOG_ACTIVE_GENERATION = false;
    ENV.APP.LOG_VIEW_LOOKUPS = false;

    ENV.APP.rootElement = '#ember-testing';
    ENV.APP.autoboot = false;
  }

  if (environment === 'production') {
    ENV.APP.API_HOST = process.env.API_HOST || 'https://api.careercaddy.online';
    if (process.env.API_NAMESPACE) {
      ENV.APP.API_NAMESPACE = process.env.API_NAMESPACE;
    }

    // Build CSP connect-src dynamically
    let connectSrc = "'self'";
    if (ENV.APP.API_HOST) {
      connectSrc += ` ${ENV.APP.API_HOST}`;
    }

    ENV.contentSecurityPolicy = {
      'connect-src': connectSrc,
    };
  }

  return ENV;
};
