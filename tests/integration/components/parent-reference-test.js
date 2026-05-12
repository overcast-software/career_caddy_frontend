import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

class MockRouter extends Service {
  @tracked currentRouteName = null;
}

module('Integration | Component | parent-reference', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:router', MockRouter);
    this.router = this.owner.lookup('service:router');
    this.set('parent', { title: 'Acme — Senior Engineer' });
  });

  test('renders the yielded block when current route is outside the scope', async function (assert) {
    this.router.currentRouteName = 'cover-letters.show';
    await render(hbs`
      <ParentReference
        @parent={{this.parent}}
        @parentScope="job-posts.show"
        as |jp|
      >
        <span data-test="ref">for {{jp.title}}</span>
      </ParentReference>
    `);
    assert.dom('[data-test="ref"]').hasText('for Acme — Senior Engineer');
  });

  test('hides the yielded block when current route is inside the scope', async function (assert) {
    this.router.currentRouteName = 'job-posts.show.cover-letters.show';
    await render(hbs`
      <ParentReference
        @parent={{this.parent}}
        @parentScope="job-posts.show"
        as |jp|
      >
        <span data-test="ref">for {{jp.title}}</span>
      </ParentReference>
    `);
    assert.dom('[data-test="ref"]').doesNotExist();
  });

  test('hides when @parent is null even if out of scope', async function (assert) {
    this.router.currentRouteName = 'cover-letters.show';
    this.set('parent', null);
    await render(hbs`
      <ParentReference @parent={{this.parent}} @parentScope="job-posts.show" as |jp|>
        <span data-test="ref">for {{jp.title}}</span>
      </ParentReference>
    `);
    assert.dom('[data-test="ref"]').doesNotExist();
  });

  test('renders unconditionally when @parentScope is omitted', async function (assert) {
    this.router.currentRouteName = 'job-posts.show.cover-letters.show';
    await render(hbs`
      <ParentReference @parent={{this.parent}} as |jp|>
        <span data-test="ref">for {{jp.title}}</span>
      </ParentReference>
    `);
    assert.dom('[data-test="ref"]').hasText('for Acme — Senior Engineer');
  });
});
