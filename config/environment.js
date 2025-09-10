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
      API_HOST: process.env.API_HOST || 'http://localhost:8000',
      API_NAMESPACE: process.env.API_NAMESPACE || 'api/v1'
    },
  };

  if (environment === 'development') {
    if (!process.env.API_HOST) {
      ENV.APP.API_HOST = null; // use same-origin; Ember CLI proxy will forward to 8000
    }
    ENV.contentSecurityPolicy = {
      // 'connect-src': "'self' http://localhost:5301 http://peertube.localhost:9000",
      'connect-src': "'self' http://localhost:8000",
    }
    // ENV.APP.LOG_RESOLVER = true;
    // ENV.APP.LOG_ACTIVE_GENERATION = true;
    // ENV.APP.LOG_TRANSITIONS = true;
    // ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
    // ENV.APP.LOG_VIEW_LOOKUPS = true;
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
    // here you can enable a production-specific feature
  }

  return ENV;
};
