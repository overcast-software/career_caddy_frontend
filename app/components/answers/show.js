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
    const route = this.router.currentRouteName;
    // Top-level /answers page
    if (route === 'answers.index' || route === 'answers.show') {
      return 'answers.show';
    }
    const base = route
      .replace(/\.index$/, '')
      .replace(/\.answers\.show$/, '')
      .replace(/\.answers$/, '');
    return `${base}.answers.show`;
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
