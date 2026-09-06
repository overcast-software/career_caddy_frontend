import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Migrated onto <ResponsiveList> (CC-264). Both trees (md:hidden cards /
// hidden md:block table) live in the DOM at once; CSS picks one. The CI
// browser can't resize, so assert a known value renders in EACH tree.
module('Integration | Component | companies/list', function (hooks) {
  setupRenderingTest(hooks);

  test('renders a company in BOTH the card tree and the table tree', async function (assert) {
    this.set('companies', [
      { id: '1', name: 'Acme', jobPosts: [{}, {}], jobApplications: [{}] },
    ]);

    await render(hbs`<Companies::List @companies={{this.companies}} />`);

    assert.dom('ul.md\\:hidden').exists('card tree present');
    assert
      .dom('ul.md\\:hidden')
      .containsText('Acme', 'company name shows on the card');

    assert.dom('div.hidden.md\\:block table').exists('table tree present');
    assert
      .dom('div.hidden.md\\:block table')
      .containsText('Acme', 'company name shows in the table');
  });

  test('empty list renders the EmptyState, neither tree', async function (assert) {
    this.set('companies', []);
    await render(hbs`<Companies::List @companies={{this.companies}} />`);

    assert.dom(this.element).hasText('No companies found.');
    assert.dom('table').doesNotExist('no table when empty');
    assert.dom('ul.md\\:hidden').doesNotExist('no card tree when empty');
  });
});
