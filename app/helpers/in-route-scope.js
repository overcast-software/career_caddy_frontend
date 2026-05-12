import Helper from '@ember/component/helper';
import { service } from '@ember/service';

// True when the current route name matches the given scope or is nested
// under it. Used by <ParentReference> and by parent templates that need
// to collapse their form+list when a child detail route is active.
export default class InRouteScopeHelper extends Helper {
  @service router;

  compute([scope]) {
    if (!scope) return false;
    const current = this.router.currentRouteName ?? '';
    return current === scope || current.startsWith(scope + '.');
  }
}
