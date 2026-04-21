import Component from '@glimmer/component';

// Items come pre-structured from /api/v1/career-data/:
//   { id, job, company, created_at, content }
// One card per cover letter, anchor id = `cl-{id}`.
export default class CareerDataCoverLetterCardsComponent extends Component {
  get items() {
    return this.args.items || [];
  }
}
