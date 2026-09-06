import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Migrated onto <ResponsiveList> (CC-264). Both trees render at once; assert
// a known value in each. @showJobPost=false drops the Job Post column so the
// test doesn't lean on nested-route LinkTo resolution.
module('Integration | Component | summaries/list', function (hooks) {
  setupRenderingTest(hooks);

  test('renders a summary in BOTH the card tree and the table tree', async function (assert) {
    this.set('summaries', [
      { id: '1', content: 'Seasoned engineer.', active: true },
    ]);

    await render(hbs`
      <Summaries::List @summaries={{this.summaries}} @showJobPost={{false}} />
    `);

    assert.dom('ul.md\\:hidden').exists('card tree present');
    assert
      .dom('ul.md\\:hidden')
      .containsText('Seasoned engineer.', 'summary shows on the card');

    assert.dom('div.hidden.md\\:block table').exists('table tree present');
    assert
      .dom('div.hidden.md\\:block table')
      .containsText('Seasoned engineer.', 'summary shows in the table');
  });

  test('empty list renders the EmptyState, neither tree', async function (assert) {
    this.set('summaries', []);
    await render(hbs`<Summaries::List @summaries={{this.summaries}} />`);

    assert.dom(this.element).hasText('No summaries found.');
    assert.dom('table').doesNotExist('no table when empty');
    assert.dom('ul.md\\:hidden').doesNotExist('no card tree when empty');
  });
});
