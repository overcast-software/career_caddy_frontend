import Helper from '@ember/component/helper';
import { service } from '@ember/service';

// True when the current route name matches the given scope or is nested
// under it. Backbone for <ResourceLink> + <ParentReference> — both decide
// behavior based on "are we already inside the parent's route?"
export default class InRouteScopeHelper extends Helper {
  @service router;

  compute([scope]) {
    if (!scope) return false;
    const current = this.router.currentRouteName ?? '';
    return current === scope || current.startsWith(scope + '.');
  }
}
