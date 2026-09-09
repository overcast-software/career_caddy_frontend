import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The CI browser can't resize, so these assert CLASS PRESENCE, not computed
// layout: the md:grid-cols-* variant is what makes the switch happen at 768,
// and Tailwind only emits a variant it finds spelled out literally in a
// scanned source file. A typo'd or interpolated column count fails silently
// in the browser, which is exactly what these guard.
module('Integration | Component | field-grid', function (hooks) {
  setupRenderingTest(hooks);

  test('defaults to two columns, stacking to one below md', async function (assert) {
    await render(hbs`
      <FieldGrid>
        <div class="field" data-test-a>A</div>
        <div class="field" data-test-b>B</div>
      </FieldGrid>
    `);

    assert
      .dom('div.grid')
      .hasClass('grid-cols-1', 'single column is the mobile default');
    assert
      .dom('div.grid')
      .hasClass('md:grid-cols-2', 'switches to two columns at md (768px)');
    assert.dom('div.grid').hasClass('gap-3', 'carries the shared field gap');
    assert.dom('[data-test-a]').exists('yields its cells');
    assert.dom('[data-test-b]').exists('yields every cell');
  });

  test('@cols selects the 3- and 4-column variants', async function (assert) {
    await render(hbs`<FieldGrid @cols={{3}} />`);
    assert.dom('div.grid').hasClass('md:grid-cols-3', '@cols=3 honoured');

    await render(hbs`<FieldGrid @cols={{4}} />`);
    assert.dom('div.grid').hasClass('md:grid-cols-4', '@cols=4 honoured');
  });

  test('an unsupported @cols falls back to two rather than emitting a class Tailwind never generated', async function (assert) {
    await render(hbs`<FieldGrid @cols={{7}} />`);

    assert.dom('div.grid').hasClass('md:grid-cols-2', 'falls back to two');
    assert
      .dom('div.grid')
      .doesNotHaveClass('md:grid-cols-7', 'no ungenerated class is emitted');
  });

  test('...attributes merges caller classes onto the grid', async function (assert) {
    await render(hbs`<FieldGrid class="gap-x-6" data-test-grid />`);

    assert.dom('[data-test-grid]').exists('attributes reach the grid element');
    assert.dom('[data-test-grid]').hasClass('gap-x-6', 'caller class merged');
    assert
      .dom('[data-test-grid]')
      .hasClass('md:grid-cols-2', 'without dropping the primitive’s own');
  });
});
