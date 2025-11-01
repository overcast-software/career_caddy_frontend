import EmberRouter from '@ember/routing/router';
import config from 'career-caddy-frontend/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('login');
  this.route('logout');
  this.route('setup');
  this.route('job-applications', function () {
    this.route('show', {
      path: '/:application_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:application_id/edit',
    });
  });
  this.route('companies', function () {
    this.route('show', {
      path: '/:company_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:company_id/edit',
    });
  });
  this.route('cover-letters', function () {
    this.route('show', {
      path: '/:cover_letter_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:cover_letter_id/edit',
    });
  });
  this.route('job-posts', function () {
    this.route(
      'show',
      {
        path: '/:job_post_id',
      },
      function () {
        this.route('job-applications', function () {
          this.route('new');
        });
      },
    );
    this.route('new');
    this.route('scrape');

    this.route('edit', {
      path: '/:job_post_id/edit',
    });
  });
  this.route('resumes', function () {
    this.route(
      'show',
      {
        path: '/:resume_id',
      },
      function () {
        this.route('experience', function () {
          this.route('new');
          this.route('show', { path: '/:experience_id' });
          this.route('edit', { path: '/:experience_id/edit' });
        });
      },
    );
    this.route('new');

    this.route('edit', {
      path: '/:resume_id/edit',
    });
  });
  this.route('scores', function () {
    this.route('show', {
      path: '/:score_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:score_id/edit',
    });
  });
  this.route('scrapes', function () {
    this.route('show', {
      path: '/:scrape_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:scrape_id/edit',
    });
  });
  this.route('users', function () {
    this.route('show', {
      path: '/:user_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:user_id/edit',
    });
  });
  this.route('summaries', function () {
    this.route('show', {
      path: '/:summary_id',
    });
    this.route('new');

    this.route('edit', {
      path: '/:summary_id/edit',
    });
  });
});
