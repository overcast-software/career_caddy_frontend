import Component from '@glimmer/component';

// Items come pre-structured from /api/v1/career-data/:
//   { id, question_id, question, answer }
// One card per question/answer pair, anchor id = `qa-{id}`.
export default class CareerDataQaCardsComponent extends Component {
  get items() {
    return this.args.items || [];
  }
}
