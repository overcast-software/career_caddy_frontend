import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

const TERMINAL_STATUSES = ['completed', 'done', 'failed', 'error'];

export default class AnswersForm extends Component {
  @service flashMessages;
  @service pollable;
  @service router;
  @service spinner;
  @service store;
  @tracked additionalPrompt = '';
  @tracked useAI = false;
  @tracked isPolling = false;

  willDestroy() {
    super.willDestroy(...arguments);
    if (this.args.answer) {
      this.pollable.unwatchRecord(this.args.answer);
    }
  }

  @action updateContent(event) {
    this.args.answer.set('content', event.target.value);
  }

  @action updateAdditionalPrompt(event) {
    this.additionalPrompt = event.target.value;
    if (this.useAI) {
      this.args.answer.set('prompt', event.target.value);
      this.args.answer.set('ai_assist', true);
    }
  }

  @action toggleAI() {
    this.useAI = !this.useAI;
    if (this.useAI) {
      this.args.answer.set('prompt', this.additionalPrompt);
      this.args.answer.set('ai_assist', true);
    } else {
      this.args.answer.set('prompt', null);
      this.args.answer.set('ai_assist', false);
    }
  }

  @action save(event) {
    event.preventDefault();
    const answer = this.args.answer;
    const question = answer.question;
    const useAI = this.useAI;

    const afterSave = () => {
      if (this.args.onSave) {
        this.args.onSave(answer);
        return;
      }
      const current = this.router.currentRouteName;
      const showRoute = current.replace(
        /\.answers\.(new|edit)$/,
        '.answers.show',
      );
      if (showRoute !== current) {
        this.router.transitionTo(showRoute, answer.id);
      } else if (question?.id) {
        this.router.transitionTo(
          'questions.show.answers.show',
          question.id,
          answer.id,
        );
      }
    };

    // The save success path runs side effects (career-data marking,
    // route transition, AI polling setup) that can throw for non-HTTP
    // reasons after the row is already persisted server-side. Keep the
    // save's own .catch() narrowly scoped so a post-success throw never
    // fires the "Failed to save answer." flash on a row that did save.
    // Mirrors the post-success cleanup-trail filter in <Answers::Show>
    // deleteAnswer (real HTTP error = has .status or .errors[]).
    answer
      .save()
      .catch((error) => {
        const isRealHttpError =
          error?.status ||
          (Array.isArray(error?.errors) && error.errors.length > 0);
        if (isRealHttpError && error.status !== 403) {
          this.flashMessages.danger('Failed to save answer.');
        }
        // Re-throw so the success .then() chain is skipped.
        throw error;
      })
      .then(() => {
        this.store.peekRecord('career-data', '1')?.markDirty();
        if (useAI) {
          this.isPolling = true;
          this.spinner.begin({ label: 'AI is generating your answer…' });
          this.pollable.watchRecord(answer, {
            isTerminal: (rec) => TERMINAL_STATUSES.includes(rec.status),
            onStop: (rec) => {
              this.isPolling = false;
              this.spinner.end();
              if (rec.status === 'failed' || rec.status === 'error') {
                this.flashMessages.danger('AI failed to generate an answer.');
              } else {
                this.flashMessages.success('AI answer generated successfully.');
                this.useAI = false;
                afterSave();
              }
            },
            onError: () => {
              this.isPolling = false;
              this.spinner.end();
              this.flashMessages.danger(
                'Lost connection while waiting for AI answer.',
              );
            },
          });
        } else {
          this.flashMessages.success('Successfully saved answer');
          afterSave();
        }
      })
      .catch(() => {
        // Swallow — either already-flashed save failure (re-thrown above)
        // or a post-success throw that we deliberately don't surface as
        // "save failed".
      });
  }

  @action cancel() {
    this.args.answer.rollbackAttributes();
    if (this.args.onCancel) {
      this.args.onCancel();
      return;
    }
    window.history.back();
  }

  @action async toggleFavorite(answer) {
    // On /answers/new the record isn't persisted yet — calling .save()
    // here would POST an empty/invalid answer (validation usually kicks
    // it back), the catch branch rolled favorite to false, and the
    // user's toggle never survived the form submit. On /answers/edit
    // the record IS persisted, so the star should flip-and-save
    // immediately for the "no-form-submit needed" feel.
    const previous = answer.favorite;
    answer.favorite = !previous;
    if (answer.isNew) {
      return;
    }
    try {
      await answer.save();
    } catch (error) {
      answer.favorite = previous;
      this.flashMessages.danger(
        error?.errors?.[0]?.detail ?? 'Failed to update favorite.',
      );
    }
  }
}
