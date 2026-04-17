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
  this.route('waitlist');
  this.route('forgot-password');
  this.route('reset-password');
  this.route('accept-invite');
  this.route('signup');
  this.route('job-applications', function () {
    this.route(
      'show',
      {
        path: '/:application_id',
      },
      function () {
        this.route('questions', function () {
          this.route('new');
          this.route('show', { path: '/:question_id' }, function () {
            this.route('answers', function () {
              this.route('new');
              this.route('show', { path: '/:answer_id' });
              this.route('edit', { path: '/:answer_id/edit' });
            });
          });
        });
      },
    );
    this.route('new');

    this.route('edit', {
      path: '/:application_id/edit',
    });
  });
  this.route('companies', function () {
    this.route(
      'show',
      {
        path: '/:company_id',
      },
      function () {
        this.route('job-posts');
        this.route('job-applications');
        this.route('scrapes');
        this.route('answers');
        this.route('questions', function () {
          this.route('new');
          this.route('show', { path: '/:question_id' }, function () {
            this.route('answers', function () {
              this.route('new');
              this.route('show', { path: '/:answer_id' });
              this.route('edit', { path: '/:answer_id/edit' });
            });
          });
        });
        this.route('scores');
      },
    );
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
          this.route(
            'show',
            {
              path: '/:job_application_id',
            },
            function () {
              this.route('questions', function () {
                this.route('new');
              });
            },
          );
        });
        this.route('questions', function () {
          this.route('new');
          this.route('show', { path: '/:question_id' }, function () {
            this.route('answers', function () {
              this.route('new');
              this.route('show', { path: '/:answer_id' });
              this.route('edit', { path: '/:answer_id/edit' });
            });
          });
        });
        this.route('scores');
        this.route('cover-letters');
        this.route('scrapes');
        this.route('summaries');
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
      'import',

      function () {
        this.route('resume.import');
      },
    );
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
  this.route('about');
  this.route('docs', function () {
    this.route('career-data');
    this.route('job-posts');
    this.route('job-applications');
    this.route('resumes');
    this.route('cover-letters');
    this.route('companies');
    this.route('questions');
    this.route('answers');
    this.route('scores');
    this.route('summaries');
    this.route('scrapes');
  });
  this.route('questions', function () {
    this.route('new');
    this.route(
      'show',
      {
        path: '/:question_id',
      },
      function () {
        this.route('answers', function () {
          this.route('new');
          this.route('show', { path: '/:answer_id' });
          this.route('edit', { path: '/:answer_id/edit' });
        });
      },
    );
    this.route('edit', {
      path: '/:question_id/edit',
    });
    this.route('delete', {
      path: '/:question_id/delete',
    });
  });
  this.route('answers', function () {
    this.route('edit', { path: '/:answer_id/edit' });
    this.route('show', { path: '/:answer_id' });
  });
  this.route('admin', function () {
    this.route('new', { path: '/api-keys/new' });
    this.route('show', { path: '/api-keys/:api_key_id' });
    this.route('users', function () {
      this.route('new');
      this.route('show', { path: '/:user_id' });
    });
    this.route('waitlist');
    this.route('invitations');
    this.route('scrape-profiles', function () {
      this.route('show', { path: '/:scrape_profile_id' });
    });
  });
  this.route('career-data', function () {});
  this.route('settings', function () {
    this.route('profile', function () {
      this.route('edit');
    });
    this.route('data');
    this.route('appearance');
    this.route('ai-spend');
  });
  this.route('favorites');
  this.route('caddy');
});
