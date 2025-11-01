import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | users/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    this.set('noop', () => {});
    this.set('user', {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    await render(hbs`<Users::Item @user={{this.user}} />`);

    assert.dom('[data-test-user-first-name]').hasText('John');
    assert.dom('[data-test-user-last-name]').hasText('Doe');
    assert.dom('[data-test-user-email]').hasText('john@example.com');

    // Template block usage:
    await render(hbs`
      <Users::Item @user={{this.user}} >
        template block text
      </Users::Item>
    `);

    assert.dom().includesText('template block text');
  });
});
