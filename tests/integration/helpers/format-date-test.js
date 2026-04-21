import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | format-date', function (hooks) {
  setupRenderingTest(hooks);

  test('formats a calendar-date string (YYYY-MM-DD) without TZ', async function (assert) {
    this.set('value', '2024-01-15');
    await render(hbs`{{format-date this.value "MMM D, YYYY"}}`);
    assert.dom().hasText('Jan 15, 2024');
  });

  test('formats an ISO instant in PST', async function (assert) {
    // 2024-04-21 07:00 UTC = 2024-04-21 00:00 PDT — still April 21.
    this.set('value', '2024-04-21T07:00:00Z');
    await render(hbs`{{format-date this.value "MMM D, YYYY"}}`);
    assert.dom().hasText('Apr 21, 2024');
  });

  test('returns empty string for falsy / unparseable input', async function (assert) {
    // Use an HTML comment inside the block so the resulting DOM is
    // whitespace-only and hasText('') succeeds.
    this.set('value', 'not-a-date');
    await render(hbs`<span>{{format-date this.value "YYYY"}}</span>`);
    assert.dom('span').hasText('');
  });
});
