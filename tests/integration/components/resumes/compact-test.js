import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// <Resumes::Compact> is the row for the resumes index. Since the CC-267
// migration it no longer renders its own <tr> — it renders <ResponsiveList>
// cells off the row hash handed in as @r, so it is exercised HERE through the
// real primitive. Both trees (card <ul> + <table>) are always in the DOM by
// design; assert structure/text, not visibility (the CI browser can't resize).
// See responsive-list-test.js.
module('Integration | Component | resumes/compact', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set('resume', {
      id: '7',
      name: 'Backend Resume',
      notes: 'Tailored for platform roles',
      jobApplicationCount: 3,
      favorite: false,
    });
  });

  test('renders the row through ResponsiveList: name, applications, notes, actions', async function (assert) {
    await render(hbs`
      <ResponsiveList @items={{array this.resume}}>
        <:header as |h|>
          <h.col>Name</h.col>
          <h.col @align="center">Applications</h.col>
          <h.col>Notes</h.col>
          <h.col @align="right">Actions</h.col>
        </:header>
        <:row as |resume r|>
          <Resumes::Compact @resume={{resume}} @r={{r}} />
        </:row>
      </ResponsiveList>
    `);

    // Card tree: title-first, then the labeled notes/applications rows.
    assert
      .dom('ul.md\\:hidden li:first-child .col-span-2.font-semibold')
      .hasText('Backend Resume', 'resume name is the card title line');
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText('Tailored for platform roles', 'notes show on the card');
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText('Applications', 'the applications label shows on the card');

    // Table tree: one row with all four cells and the three action controls.
    assert
      .dom('table tbody tr:first-child td')
      .exists(
        { count: 4 },
        'four table cells (name/applications/notes/actions)',
      );
    assert
      .dom('table tbody tr:first-child td:last-child button')
      .exists({ count: 2 }, 'favorite toggle + Delete render as buttons');
    assert
      .dom('table tbody tr:first-child td:last-child a')
      .hasText('Edit', 'the Edit link renders in the actions cell');
  });

  test('empty notes drop the card row but keep the table cell', async function (assert) {
    this.set('resume', { ...this.resume, notes: null });

    await render(hbs`
      <ResponsiveList @items={{array this.resume}}>
        <:header as |h|>
          <h.col>Name</h.col>
          <h.col @align="center">Applications</h.col>
          <h.col>Notes</h.col>
          <h.col @align="right">Actions</h.col>
        </:header>
        <:row as |resume r|>
          <Resumes::Compact @resume={{resume}} @r={{r}} />
        </:row>
      </ResponsiveList>
    `);

    assert
      .dom('ul.md\\:hidden li:first-child')
      .doesNotContainText(
        'Notes',
        'the empty notes row is dropped on the card',
      );
    assert
      .dom('table tbody tr:first-child td')
      .exists({ count: 4 }, 'the table keeps its notes column for alignment');
  });
});
