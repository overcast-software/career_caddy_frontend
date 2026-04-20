import Component from '@glimmer/component';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class JobPostsListComponent extends Component {
  @service store;
  @service pollable;
  @service spinner;
  @service flashMessages;
  @service currentUser;

  // Per-post phase so the row spinner can say "Scraping…" / "Scoring…".
  // Null for that post = not busy. Tracked as a whole-map replacement so
  // Glimmer re-renders when we set/clear a single entry.
  @tracked _phases = new Map();

  get jobPosts() {
    return this.args.jobPosts ?? [];
  }

  isBusy = (jobPost) => this._phases.has(jobPost.id);
  busyLabel = (jobPost) => this._phases.get(jobPost.id) || null;

  _setPhase(jobPost, phase) {
    const next = new Map(this._phases);
    if (phase) next.set(jobPost.id, phase);
    else next.delete(jobPost.id);
    this._phases = next;
  }

  @action
  scrapeAndScore(jobPost) {
    if (!jobPost?.link || this.isBusy(jobPost)) return;
    this._setPhase(jobPost, 'Scraping…');
    this.spinner.begin({ label: `Scraping ${jobPost.title || 'post'}…` });

    const scrape = this.store.createRecord('scrape', {
      jobPost,
      company: jobPost.company,
      url: jobPost.link,
      status: 'hold',
    });

    scrape
      .save()
      .then((savedScrape) => {
        if (this.pollable.isTerminal(savedScrape)) return savedScrape;
        return this.pollable.poll(savedScrape, {
          successMessage: null,
          failedMessage: 'Scrape failed.',
        });
      })
      .then(() => jobPost.reload().catch(() => {}))
      .then(() => this._runScore(jobPost))
      .catch((e) => {
        this.flashMessages.danger(
          e?.errors?.[0]?.detail ??
            `Scrape & Score failed for "${jobPost.title || 'post'}".`,
        );
      })
      .finally(() => {
        this.spinner.end();
        this._setPhase(jobPost, null);
      });
  }

  _runScore(jobPost) {
    this._setPhase(jobPost, 'Scoring…');
    this.spinner.begin({ label: `Scoring ${jobPost.title || 'post'}…` });
    const score = this.store.createRecord('score', {
      resume: null,
      jobPost,
      user: this.currentUser.user,
    });
    return score
      .save()
      .then((savedScore) => {
        if (this.pollable.isTerminal(savedScore)) return savedScore;
        return this.pollable.poll(savedScore, {
          successMessage: `Scored "${jobPost.title || 'post'}".`,
          failedMessage: 'Scoring failed.',
        });
      })
      .finally(() => {
        // The outer .finally() closes out the scrape spinner; this one
        // closes the score spinner we opened here.
        this.spinner.end();
      });
  }
}
