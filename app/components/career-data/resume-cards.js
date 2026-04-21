import Component from '@glimmer/component';

// Items come pre-structured from /api/v1/career-data/:
//   { id, title, subtitle, markdown }
// One card per resume. Anchor id = `resume-{id}` so the subnav nav can
// deep-link and observe scroll position.
export default class CareerDataResumeCardsComponent extends Component {
  get items() {
    return this.args.items || [];
  }
}
