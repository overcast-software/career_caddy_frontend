import Component from '@glimmer/component';
import { service } from '@ember/service';

// Picks between a flat and a nested LinkTo based on whether the caller's
// declared parent scope is currently active in the router. When the
// current route matches @parentScope (or is nested under it) AND @parent
// is supplied, the link targets @nestedRoute with [@parent, @record].
// Otherwise it falls back to @flatRoute with [@record].
//
// Example:
//   <ResourceLink
//     @flatRoute="cover-letters.show"
//     @nestedRoute="job-posts.show.cover-letters.show"
//     @parentScope="job-posts.show"
//     @parent={{@jobPost}}
//     @record={{coverLetter}}
//   >View</ResourceLink>
export default class ResourceLinkComponent extends Component {
  @service router;

  get inScope() {
    const scope = this.args.parentScope;
    if (!scope || !this.args.parent) return false;
    const current = this.router.currentRouteName ?? '';
    return current === scope || current.startsWith(scope + '.');
  }

  get route() {
    return this.inScope ? this.args.nestedRoute : this.args.flatRoute;
  }

  get models() {
    return this.inScope
      ? [this.args.parent, this.args.record]
      : [this.args.record];
  }
}
