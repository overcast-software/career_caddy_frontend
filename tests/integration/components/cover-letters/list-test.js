import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Migrated onto <ResponsiveList> (CC-264). Both trees render at once; assert
// a known value in each. @showJobPost=false drops the Job Post primary so the
// test doesn't lean on nested-route LinkTo resolution; the "View" action
// (single-model LinkTo) is the value rendered once per tree.
module('Integration | Component | cover-letters/list', function (hooks) {
  setupRenderingTest(hooks);

  test('renders a cover letter action in BOTH the card tree and the table tree', async function (assert) {
    this.set('coverLetters', [
      { id: '1', createdAt: null, favorite: false, isPending: false },
    ]);

    await render(hbs`
      <CoverLetters::List
        @coverLetters={{this.coverLetters}}
        @showJobPost={{false}}
      />
    `);

    assert.dom('ul.md\\:hidden').exists('card tree present');
    assert
      .dom('ul.md\\:hidden')
      .containsText('View', 'action shows on the card');

    assert.dom('div.hidden.md\\:block table').exists('table tree present');
    assert
      .dom('div.hidden.md\\:block table')
      .containsText('View', 'action shows in the table');
  });

  test('empty list renders the EmptyState, neither tree', async function (assert) {
    this.set('coverLetters', []);
    await render(
      hbs`<CoverLetters::List @coverLetters={{this.coverLetters}} />`,
    );

    assert.dom(this.element).hasText('No cover letters found.');
    assert.dom('table').doesNotExist('no table when empty');
    assert.dom('ul.md\\:hidden').doesNotExist('no card tree when empty');
  });
});
