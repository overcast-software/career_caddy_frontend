import Service from '@ember/service';

export default class PublicRoutesService extends Service {
  exact = new Set([
    'setup',
    'login',
    'waitlist',
    'forgot-password',
    'reset-password',
    'accept-invite',
    'signup',
    'about',
  ]);

  prefixes = new Set(['docs']);

  isPublic(routeName) {
    if (!routeName) return false;
    if (this.exact.has(routeName)) return true;
    for (const p of this.prefixes) {
      if (routeName === p || routeName.startsWith(`${p}.`)) return true;
    }
    return false;
  }
}
