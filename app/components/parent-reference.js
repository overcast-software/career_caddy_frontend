import Component from '@glimmer/component';
import { service } from '@ember/service';

// Yields @parent for rendering only when the current route is NOT inside
// @parentScope. When already inside the parent's route, the breadcrumb is
// redundant — so the block stays hidden.
//
// Stackable: a record with multiple useful parents (e.g. cover-letter →
// jobPost AND company) wraps each in its own <ParentReference>; each
// independently decides visibility from its own @parentScope.
//
// Example:
//   <ParentReference
//     @parent={{@coverLetter.jobPost}}
//     @parentScope="job-posts.show"
//     as |jp|
//   >
//     For <LinkTo @route="job-posts.show" @model={{jp}}>{{jp.title}}</LinkTo>
//   </ParentReference>
export default class ParentReferenceComponent extends Component {
  @service router;

  get shouldShow() {
    if (!this.args.parent) return false;
    const scope = this.args.parentScope;
    if (!scope) return true;
    const current = this.router.currentRouteName ?? '';
    return !(current === scope || current.startsWith(scope + '.'));
  }
}
