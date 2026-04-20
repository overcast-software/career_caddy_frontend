import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class AnswersShowComponent extends Component {
  @service router;
  @service flashMessages;
  @tracked copyButtonText = 'Copy';

  get showQuestion() {
    return this.args.showQuestion !== false;
  }

  get answerShowRoute() {
    // Pick the right "show this answer" route based on where we're
    // rendering from. Previously this stripped suffixes off the route
    // name, which could produce nonsense like 'questions.answers.show'
    // (no such route) when the component was still mounted during a
    // liquid-fire transition on the top-level outlet. Safer to look
    // for a known scope explicitly and fall back to the global
    // /answers/:id view if we can't find one.
    const route = this.router.currentRouteName || 'answers.show';
    if (route.startsWith('answers.')) return 'answers.show';
    const match = route.match(/^(.+\.questions\.show)(\..*)?$/);
    if (match) return `${match[1]}.answers.show`;
    return 'answers.show';
  }

  @action async copyToClipboard() {
    try {
      await navigator.clipboard.writeText(this.args.answer.content);
      this.copyButtonText = 'Copied!';
      setTimeout(() => {
        this.copyButtonText = 'Copy';
      }, 2000);
    } catch {
      this.flashMessages.danger('Failed to copy to clipboard.');
    }
  }

  @action toggleFavorite() {
    const answer = this.args.answer;
    answer.favorite = !answer.favorite;
    answer.save().catch(() => {
      answer.favorite = !answer.favorite;
      this.flashMessages.danger('Failed to update favorite.');
    });
  }

  @action deleteAnswer() {
    if (!confirm('Delete this answer?')) return;
    const answer = this.args.answer;
    answer
      .destroyRecord()
      .then(() => {
        answer.unloadRecord();
        this.flashMessages.success('Answer deleted.');
        if (this.args.onDelete) {
          this.args.onDelete();
        } else {
          // Navigate to parent answers index if on a show route
          const route = this.router.currentRouteName;
          if (route?.endsWith('.answers.show')) {
            const parentRoute = route.replace('.answers.show', '.answers');
            this.router.transitionTo(parentRoute);
          }
        }
      })
      .catch((error) => {
        if (error?.status !== 403) {
          this.flashMessages.danger('Failed to delete answer.');
        }
      });
  }
}
