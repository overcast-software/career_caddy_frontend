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

    await render(hbs`<Users::Item 
      @user={{this.user}}
      @onEdit={{this.noop}}
      @onDelete={{this.noop}}
      @onPromote={{this.noop}}
    />`);

    assert.dom().includesText('John');
    assert.dom().includesText('Doe');
    assert.dom().includesText('john@example.com');

    // Template block usage:
    await render(hbs`
      <Users::Item @user={{this.user}} @onEdit={{this.noop}} @onDelete={{this.noop}} @onPromote={{this.noop}}>
        template block text
      </Users::Item>
    `);

    assert.dom().includesText('template block text');
  });
});
