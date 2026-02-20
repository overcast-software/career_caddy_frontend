import Component from '@glimmer/component';

export default class ScoreListComponent extends Component {
  score_title(score) {
    return `${score.get('jobPost.title')} at ${score.get('company.name')}`;
  }
}
