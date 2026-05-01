import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import move from 'ember-animated/motions/move';
import { easeOut } from 'ember-animated/easings/cosine';

// Left-to-right tab order on /job-posts/:id. Keep in sync with
// components/job-posts/tabs.hbs — if the tab strip reorders, this must
// too or the slide direction inverts for the affected pair.
const TAB_ORDER = [
  'job-posts.show.job-applications',
  'job-posts.show.questions',
  'job-posts.show.scores',
  'job-posts.show.cover-letters',
  'job-posts.show.scrapes',
  'job-posts.show.summaries',
];

function tabPrefix(routeName) {
  if (!routeName) return null;
  return (
    TAB_ORDER.find((r) => routeName === r || routeName.startsWith(r + '.')) ??
    null
  );
}

export default class JobPostsShowController extends Controller {
  @service store;
  @service flashMessages;
  @service router;
  @service spinner;
  @service pollable;
  @service currentUser;

  @tracked copyButtonText = 'Copy';
  @tracked scrapeSubmitting = false;
  @tracked scoreSubmitting = false;
  @tracked descriptionExpanded = false;
  @tracked tabForward = true;
  @tracked activeTabKey = null;

  constructor() {
    super(...arguments);
    this.activeTabKey = tabPrefix(this.router.currentRouteName);
    // ember-animated invokes the transition generator without a `this`
    // binding (template `use=this.tabTransition` passes it unbound).
    this.tabTransition = this.tabTransition.bind(this);
    this._routeDidChange = () => {
      // Normalize nested routes (e.g. job-applications.index) to their tab
      // prefix so child routes still trigger the tab-slide.
      const current = tabPrefix(this.router.currentRouteName);
      if (!current || current === this.activeTabKey) return;
      const fromIdx = TAB_ORDER.indexOf(this.activeTabKey);
      const toIdx = TAB_ORDER.indexOf(current);
      if (fromIdx !== -1 && toIdx !== -1) {
        this.tabForward = toIdx > fromIdx;
      }
      this.activeTabKey = current;
    };
    this.router.on('routeDidChange', this._routeDidChange);
  }

  willDestroy() {
    super.willDestroy(...arguments);
    this.router.off('routeDidChange', this._routeDidChange);
  }

  // Directional slide between tabs. Forward (earlier → later) slides the
  // new pane in from the right; backward slides in from the left.
  *tabTransition({ insertedSprites, removedSprites }) {
    const forward = this.tabForward;
    const motions = [];
    for (const sprite of removedSprites) {
      const dx = forward
        ? -sprite.initialBounds.width
        : sprite.initialBounds.width;
      sprite.endTranslatedBy(dx, 0);
      motions.push(move(sprite, { easing: easeOut, duration: 350 }));
    }
    for (const sprite of insertedSprites) {
      const dx = forward ? sprite.finalBounds.width : -sprite.finalBounds.width;
      sprite.startTranslatedBy(dx, 0);
      motions.push(move(sprite, { easing: easeOut, duration: 350 }));
    }
    yield Promise.all(motions);
  }

  @action
  toggleDescription() {
    this.descriptionExpanded = !this.descriptionExpanded;
  }

  @action
  async copyDescription() {
    try {
      await navigator.clipboard.writeText(this.model.description);
      this.copyButtonText = 'Copied!';
      setTimeout(() => (this.copyButtonText = 'Copy'), 2000);
    } catch {
      this.flashMessages.danger('Failed to copy.');
    }
  }

  // Scrape, wait for the scrape to land, then score. "Navigate on 200 POST"
  // pattern at both hops: jp.show.scrapes when the scrape is created,
  // jp.show.scores when the score is created. The user always sees the tab
  // where the new row will appear, and polling owns the spinner until each
  // phase terminates.
  @action
  scrapeAndScore() {
    if (this.scrapeSubmitting || this.scoreSubmitting || !this.model.link) {
      return;
    }

    this.scrapeSubmitting = true;
    const company = this.model.belongsTo('company').value();
    const scrape = this.store.createRecord('scrape', {
      jobPost: this.model,
      company,
      url: this.model.link,
      status: 'hold',
    });

    scrape
      .save()
      .then((saved) => {
        this.flashMessages.success('Scrape queued — watching for completion.');
        this.router.transitionTo('job-posts.show.scrapes', this.model);
        this.scrapeSubmitting = false;
        return this._waitForTerminal(saved, 'Scrape');
      })
      .then(() => this.model.reload().catch(() => {}))
      .then(() => this._runScore())
      .catch((e) => {
        this.spinner.end();
        this.scrapeSubmitting = false;
        this.scoreSubmitting = false;
        this.flashMessages.clearMessages();
        // The api skips dedupe when a job-post relationship is sent
        // (we always send one here), so a 409 means the URL maps to a
        // different post — route there.
        const dupeId = e?.errors?.[0]?.meta?.existing_job_post_id;
        if (dupeId) {
          if (scrape && !scrape.isDestroyed) scrape.rollbackAttributes();
          this.flashMessages.info(`Already have this — opening #${dupeId}.`);
          this.router.transitionTo('job-posts.show', dupeId);
          return;
        }
        this.flashMessages.danger(
          e?.errors?.[0]?.detail || e?.message || 'Scrape & Score failed.',
        );
      });
  }

  _runScore() {
    this.scoreSubmitting = true;
    const score = this.store.createRecord('score', {
      resume: null,
      jobPost: this.model,
      user: this.currentUser.user,
    });
    return score
      .save()
      .then((saved) => {
        this.flashMessages.info('Scoring queued — watching for completion.');
        this.router.transitionTo('job-posts.show.scores', this.model);
        return this._waitForTerminal(saved, 'Score');
      })
      .then(() => {
        this.flashMessages.clearMessages();
        this.flashMessages.success('Score complete.');
        this.scoreSubmitting = false;
      })
      .catch((e) => {
        this.scoreSubmitting = false;
        throw e;
      });
  }

  // Resolves when `record` reaches a non-failed terminal. Rejects on
  // failed/error so the chain's .catch() runs and the next phase is
  // skipped. pollable.poll owns spinner.end on terminal.
  _waitForTerminal(record, label) {
    if (this.pollable.isTerminal(record)) {
      if (record.status === 'failed' || record.status === 'error') {
        return Promise.reject(
          new Error(`${label} ${record.status || 'failed'}.`),
        );
      }
      return Promise.resolve(record);
    }
    this.spinner.begin({ label: `${label}…` });
    return new Promise((resolve, reject) => {
      this.pollable.poll(record, {
        successMessage: null,
        failedMessage: null,
        onComplete: (rec) => resolve(rec),
        onFailed: (rec) =>
          reject(new Error(`${label} ${rec.status || 'failed'}.`)),
        onError: (err) => reject(err),
      });
    });
  }
}
