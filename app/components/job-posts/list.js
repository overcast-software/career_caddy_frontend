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
      });
  }

  _runScore(jobPost) {
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
        this.spinner.end();
      });
  }
}
