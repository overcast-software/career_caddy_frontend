import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class JobPostsShowCoverLettersRoute extends Route {
  @service store;
  @service flashMessages;

  async model() {
    const jobPost = this.modelFor('job-posts.show');
    const [coverLetters] = await Promise.all([
      jobPost.coverLetters,
      this.store.query('resume', { slim: 1 }),
    ]);
    return coverLetters;
  }

  setupController(controller, model) {
    super.setupController(controller, model);
    // Resume polling for any cover letters still generating — covers the
    // page-reload case where the user comes back mid-generation and
    // expects a spinner + flash on completion.
    // `model` is the resolved hasMany (ManyArray) — iterable directly.
    // Don't reach for .toArray(): Ember Data 5+ doesn't expose it on
    // these arrays and an optional-chained `.toArray?.()` returns
    // undefined silently. See cf-notes Architecture/Ember Data array
    // footguns.
    for (const cl of model ?? []) {
      cl.pollIfPending({
        label: 'Generating cover letter…',
        successMessage: 'Cover letter ready.',
        failedMessage: 'Cover letter generation failed.',
        onComplete: () => this.flashMessages.success('Cover letter ready.'),
        onFailed: () =>
          this.flashMessages.danger('Cover letter generation failed.'),
        onError: () =>
          this.flashMessages.danger(
            'Lost connection while waiting for cover letter.',
          ),
      });
    }
  }
}
