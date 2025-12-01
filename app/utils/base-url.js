import config from 'career-caddy-frontend/config/environment';

export function buildBaseUrl() {
  const host = (config.APP.API_HOST ?? '').replace(/\/+$/, '');
  const namespace = (config.APP.API_NAMESPACE ?? 'api/v1').replace(
    /^\/+|\/+$/g,
    '',
  );
  return `${host}/${namespace}/`;
}
