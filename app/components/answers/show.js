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
    const previous = answer.favorite;
    answer.favorite = !previous;
    answer
      .save()
      .then(() => {
        this.flashMessages.success(
          previous ? 'Unfavorited answer.' : 'Favorited answer.',
        );
      })
      .catch(() => {
        answer.favorite = previous;
        this.flashMessages.danger('Failed to update favorite.');
      });
  }

  @action async deleteAnswer() {
    if (!confirm('Delete this answer?')) return;
    const answer = this.args.answer;
    // Warm the inverse relationship cache before destroy so Ember Data's
    // internal cleanup can resolve the question identifier — otherwise
    // destroyRecord's relationship-teardown path calls __peek on an
    // already-evicted identifier and throws a TypeError after the
    // server-side delete has already succeeded.
    try {
      await answer.question;
    } catch {
      /* ignore — if it's unresolvable we'll hit the catch below */
    }
    try {
      await answer.destroyRecord();
      this.flashMessages.success('Answer deleted.');
      if (this.args.onDelete) {
        this.args.onDelete(answer);
      } else {
        const route = this.router.currentRouteName;
        if (route?.endsWith('.answers.show')) {
          const parentRoute = route.replace('.answers.show', '.answers');
          this.router.transitionTo(parentRoute);
        }
      }
    } catch (error) {
      // Two failure modes after the server-side DELETE succeeded (204):
      //   1. Ember Data 5's relationship-teardown throws a __peek
      //      TypeError.
      //   2. DELETE returns 204 with empty body; the JSON:API parser
      //      rejects with a SyntaxError on empty payload.
      // Either presents to user as "delete failed" when the row is in
      // fact gone. Real HTTP failures carry .status or .errors — use
      // that as the signal to show danger.
      const isRealHttpError =
        error?.status ||
        (Array.isArray(error?.errors) && error.errors.length > 0);
      if (!isRealHttpError) {
        this.flashMessages.success('Answer deleted.');
        if (this.args.onDelete) this.args.onDelete(answer);
        return;
      }
      if (error.status !== 403) {
        this.flashMessages.danger('Failed to delete answer.');
      }
    }
  }
}
