import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';

export default class JobPostsListComponent extends Component {
  @service store;
  @service pollable;
  @service spinner;
  @service flashMessages;
  @service currentUser;

  get jobPosts() {
    return this.args.jobPosts ?? [];
  }

  @action
  scrapeAndScore(jobPost) {
    if (!jobPost?.link || jobPost.isWorking) return;
    this.spinner.begin({ label: `Scraping ${jobPost.title || 'post'}…` });

    // Async belongsTo — read the loaded record via .value() so the
    // Company instance is passed to createRecord, not the proxy
    // (Ember Data rejects proxies: 'is not a record instantiated…').
    const company = jobPost.belongsTo('company').value();
    const scrape = this.store.createRecord('scrape', {
      jobPost,
      company,
      url: jobPost.link,
      status: 'hold',
    });

    scrape
      .save()
      .then((saved) => this._waitForTerminal(saved, 'Scrape'))
      .then(() => jobPost.reload().catch(() => {}))
      .then(() => this._runScore(jobPost))
      .catch((e) => {
        // If the scrape fails we deliberately skip scoring — a score
        // built off a stub description would be inaccurate. Surface
        // the failure so the user knows not to trust stale scores.
        this.spinner.end();
        this.flashMessages.danger(
          e?.errors?.[0]?.detail ||
            e?.message ||
            `Scrape & Score failed for "${jobPost.title || 'post'}".`,
        );
      });
  }

  @action
  scoreWithCareerData(jobPost) {
    if (!jobPost || jobPost.isWorking) return;
    this._runScore(jobPost).catch((e) => {
      this.spinner.end();
      this.flashMessages.danger(
        e?.errors?.[0]?.detail ||
          e?.message ||
          `Scoring failed for "${jobPost.title || 'post'}".`,
      );
    });
  }

  _runScore(jobPost) {
    this.spinner.begin({ label: `Scoring ${jobPost.title || 'post'}…` });
    const score = this.store.createRecord('score', {
      resume: null,
      jobPost,
      user: this.currentUser.user,
    });
    return score.save().then((saved) => this._waitForTerminal(saved, 'Score'));
  }

  /**
   * Resolves when `record` reaches a non-failed terminal status.
   * Rejects with an Error when it terminates as failed/error — the
   * caller's .catch() is how we gate later chain steps (e.g. "don't
   * score if the scrape failed").
   *
   * Relies on pollable.poll, which owns the spinner.end() call on
   * terminal so we don't end it ourselves on the poll branch.
   */
  _waitForTerminal(record, label = 'Record') {
    if (this.pollable.isTerminal(record)) {
      this.spinner.end();
      if (record.status === 'failed' || record.status === 'error') {
        return Promise.reject(
          new Error(`${label} ${record.status || 'failed'}.`),
        );
      }
      return Promise.resolve(record);
    }
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
