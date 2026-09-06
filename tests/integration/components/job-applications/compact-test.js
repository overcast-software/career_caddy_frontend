import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// <JobApplications::Compact> is the shared row for the three job-application
// list views (CC-266). Since the CC-263 migration it no longer renders its own
// <tr> — it renders <ResponsiveList> cells off the row hash handed in as @r, so
// it is exercised HERE through the real primitive. Both trees (card <ul> +
// <table>) are always in the DOM by design; assert structure/text, not
// visibility (the CI browser can't resize). See responsive-list-test.js.
module('Integration | Component | job-applications/compact', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set('application', {
      id: '10',
      status: 'applied',
      appliedAt: new Date('2026-01-15T00:00:00Z'),
      isNew: false,
      jobPost: {
        id: '5',
        title: 'Staff Engineer',
        company: { name: 'Acme' },
      },
    });
  });

  test('renders the row through ResponsiveList: title, company, status, applied date, and actions', async function (assert) {
    await render(hbs`
        <ResponsiveList @items={{array this.application}}>
          <:header as |h|>
            <h.col>Title</h.col>
            <h.col>Company</h.col>
            <h.col>Status</h.col>
            <h.col>Applied</h.col>
            <h.col @align="right">Actions</h.col>
          </:header>
          <:row as |application r|>
            <JobApplications::Compact @jobApplication={{application}} @r={{r}} />
          </:row>
        </ResponsiveList>
      `);

    // Card tree: title-first, company subtitle, status + applied labels.
    assert
      .dom('ul.md\\:hidden li:first-child .col-span-2.font-semibold')
      .hasText('Staff Engineer', 'job post title is the card title line');
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText('Acme', 'company shows as the card subtitle');
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText('applied', 'status pill shows on the card');
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText('Jan 15, 2026', 'applied date shows on the card');

    // Table tree: one row with all five cells, a working Delete control.
    assert
      .dom('table tbody tr:first-child td')
      .exists(
        { count: 5 },
        'five table cells (title/company/status/applied/actions)',
      );
    assert
      .dom('table tbody tr:first-child td:last-child button')
      .hasText('Delete', 'the Delete action renders in the actions cell');
  });

  test('@showCompany=false drops the company cell in both trees', async function (assert) {
    await render(hbs`
        <ResponsiveList @items={{array this.application}}>
          <:header as |h|>
            <h.col>Title</h.col>
            <h.col>Status</h.col>
            <h.col>Applied</h.col>
            <h.col @align="right">Actions</h.col>
          </:header>
          <:row as |application r|>
            <JobApplications::Compact
              @jobApplication={{application}}
              @r={{r}}
              @showCompany={{false}}
            />
          </:row>
        </ResponsiveList>
      `);

    // Company gone from the card, and the table row drops a cell (4 not 5).
    assert
      .dom('ul.md\\:hidden li:first-child')
      .doesNotContainText('Acme', 'company omitted on the card');
    assert
      .dom('table tbody tr:first-child td')
      .exists({ count: 4 }, 'company table cell dropped');
  });
});
