import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-posts/filters-menu', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.changes = [];
    this.set('filters', {});
    this.set('onChange', (payload) => this.changes.push(payload));
  });

  test('the sheet is closed until the trigger is clicked, and the scrim closes it', async function (assert) {
    await render(
      hbs`<JobPosts::FiltersMenu @filters={{this.filters}} @onChange={{this.onChange}} />`,
    );

    assert.dom('[data-bottom-sheet]').doesNotExist('sheet starts closed');
    assert.dom('button[aria-haspopup="true"]').hasAria('expanded', 'false');

    await click('button[aria-haspopup="true"]');
    assert.dom('[data-bottom-sheet]').exists('trigger opens the sheet');
    assert.dom('button[aria-haspopup="true"]').hasAria('expanded', 'true');
    assert.dom('[data-bottom-sheet]').hasAttribute('role', 'menu');
    assert
      .dom('[data-bottom-sheet]')
      .includesText('Stubs', 'facets render inside the sheet');
    assert.dom('[data-bottom-sheet]').includesText('Scoring');
    assert.dom('[data-bottom-sheet]').includesText('Source');

    // The scrim is the first "Close Filters" control; the in-sheet X is the second.
    const closers = findAll('[aria-label="Close Filters"]');
    assert.strictEqual(closers.length, 2, 'scrim + in-sheet close button');
    await click(closers[0]);
    assert
      .dom('[data-bottom-sheet]')
      .doesNotExist('scrim tap closes the sheet');
  });

  test('the in-sheet close button closes the sheet', async function (assert) {
    await render(
      hbs`<JobPosts::FiltersMenu @filters={{this.filters}} @onChange={{this.onChange}} />`,
    );

    await click('button[aria-haspopup="true"]');
    await click(findAll('[aria-label="Close Filters"]')[1]);
    assert.dom('[data-bottom-sheet]').doesNotExist();
  });

  test('the sheet keeps the bottom-sheet positioning below md and the popover at md and up', async function (assert) {
    await render(
      hbs`<JobPosts::FiltersMenu @filters={{this.filters}} @onChange={{this.onChange}} />`,
    );
    await click('button[aria-haspopup="true"]');

    // z-order budget (CC-260 landmine 10): above header/footer (70), below drawer (80).
    assert.dom('[data-bottom-sheet]').hasClass('fixed');
    assert.dom('[data-bottom-sheet]').hasClass('bottom-0');
    assert.dom('[data-bottom-sheet]').hasClass('z-[72]');
    assert.dom('[data-bottom-sheet]').hasClass('md:absolute');
    assert.dom('[data-bottom-sheet]').hasClass('md:z-50');
    assert
      .dom('[data-bottom-sheet]')
      .hasClass(
        'pb-[max(1rem,env(safe-area-inset-bottom))]',
        'safe-area bottom padding',
      );
  });

  test('facet controls call onChange with the query-param patch', async function (assert) {
    await render(
      hbs`<JobPosts::FiltersMenu @filters={{this.filters}} @onChange={{this.onChange}} />`,
    );
    await click('button[aria-haspopup="true"]');

    await click('[data-bottom-sheet] input[type="checkbox"]');
    assert.deepEqual(
      this.changes.at(-1),
      { excludeVettedBad: 'true' },
      'checkbox patches excludeVettedBad',
    );

    const stubOnly = [...findAll('[data-bottom-sheet] button')].find(
      (b) => b.textContent.trim() === 'Only',
    );
    await click(stubOnly);
    assert.deepEqual(this.changes.at(-1), { stub: 'true' });

    const unscored = [...findAll('[data-bottom-sheet] button')].find(
      (b) => b.textContent.trim() === 'Unscored',
    );
    await click(unscored);
    assert.deepEqual(this.changes.at(-1), { scored: 'false' });

    assert
      .dom('[data-bottom-sheet]')
      .exists('the sheet stays open while filtering');
  });

  test('the badge reflects activeCount and Clear all resets every facet', async function (assert) {
    await render(
      hbs`<JobPosts::FiltersMenu @filters={{this.filters}} @onChange={{this.onChange}} />`,
    );
    assert.dom('[data-filters-badge]').doesNotExist('no badge with no filters');

    this.set('filters', { stub: 'true', scored: 'false', source: 'email' });
    assert
      .dom('[data-filters-badge]')
      .hasText('3', 'badge counts active facets');

    this.set('filters', {
      excludeVettedBad: 'true',
      includeClosed: 'true',
      stub: 'true',
      scored: 'false',
      source: 'email',
      hostname: 'example.com',
      bucket: 'a',
    });
    assert
      .dom('[data-filters-badge]')
      .hasText('7', 'badge counts all seven facets');

    await click('button[aria-haspopup="true"]');
    const clearAll = [...findAll('[data-bottom-sheet] button')].find(
      (b) => b.textContent.trim() === 'Clear all',
    );
    await click(clearAll);
    assert.deepEqual(this.changes.at(-1), {
      excludeVettedBad: '',
      stub: '',
      scored: '',
      source: '',
      hostname: '',
      bucket: '',
      includeClosed: '',
    });
    assert.ok(find('[data-bottom-sheet]'), 'Clear all leaves the sheet open');
  });

  test('Clear all is hidden when nothing is active', async function (assert) {
    await render(
      hbs`<JobPosts::FiltersMenu @filters={{this.filters}} @onChange={{this.onChange}} />`,
    );
    await click('button[aria-haspopup="true"]');
    assert.dom('[data-bottom-sheet]').doesNotIncludeText('Clear all');
  });
});
