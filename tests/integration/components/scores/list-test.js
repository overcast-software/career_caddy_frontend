import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// scores/list is migrated onto <ResponsiveList>: both a card <ul> and a
// table live in the DOM at once (CSS picks one at md/768). The CI browser
// can't resize, so assert CLASS PRESENCE + DOM structure, not visibility.
module('Integration | Component | scores/list', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set('noop', () => {});
    this.set('scores', [
      {
        id: '1',
        score: 87,
        status: 'completed',
        createdAt: new Date('2026-01-15T00:00:00Z'),
        explanation: 'Strong alignment with the role requirements.',
        resume: { id: '10', title: 'Backend Resume' },
        jobPost: { id: '20', title: 'Staff Engineer' },
      },
    ]);
  });

  test('renders BOTH trees — a md:hidden card <ul> and a hidden md:block table', async function (assert) {
    await render(
      hbs`<Scores::List @scores={{this.scores}} @onDelete={{this.noop}} />`,
    );

    assert
      .dom('ul.md\\:hidden > li')
      .exists({ count: 1 }, 'one card per score');
    assert
      .dom('ul.md\\:hidden dl.grid')
      .exists({ count: 1 }, 'card uses the labeled dl grid');
    assert.dom('div.hidden.md\\:block table').exists('a real table at ≥md');
  });

  test('all 7 columns render as headers and the card reads score-title-first with labeled rows', async function (assert) {
    await render(hbs`
      <Scores::List
        @scores={{this.scores}}
        @showExplanation={{true}}
        @onDelete={{this.noop}}
      />
    `);

    // 7 columns: Score, Job Post, Resume, Status, Created, Explanation, Actions.
    assert
      .dom('table thead th')
      .exists({ count: 7 }, 'all 7 columns present in the table header');

    // Card title-first: Score is the bold primary line, Job Post the subtitle.
    assert
      .dom('ul.md\\:hidden li:first-child .col-span-2.font-semibold')
      .hasText('87', 'score is the card title line');
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText('Staff Engineer', 'job post shows as the card subtitle');

    // Every remaining column is a labeled card row and readable at 390px.
    const card = this.element.querySelector('ul.md\\:hidden li:first-child');
    ['Resume', 'Status', 'Created', 'Explanation'].forEach((label) => {
      assert.ok(
        card.textContent.includes(label),
        `card shows the ${label} label`,
      );
    });
    assert
      .dom('ul.md\\:hidden li:first-child')
      .containsText(
        'Strong alignment with the role requirements.',
        'explanation is readable in a labeled card row',
      );
  });

  test('Explanation column stays hidden unless @showExplanation is true', async function (assert) {
    await render(hbs`<Scores::List @scores={{this.scores}} />`);

    assert
      .dom('table thead')
      .doesNotContainText(
        'Explanation',
        'explanation header hidden by default',
      );
    // Default columns: Score, Job Post, Resume, Status, Created, Actions
    // (Explanation is the only column hidden by default) = 6 columns.
    assert
      .dom('table thead th')
      .exists({ count: 6 }, 'default columns without explanation');
  });
});
