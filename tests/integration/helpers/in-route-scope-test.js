import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

// Stand-in router service so the helper's tracked read on currentRouteName
// is deterministic across test runs.
class MockRouter extends Service {
  @tracked currentRouteName = null;
}

module('Integration | Helper | in-route-scope', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:router', MockRouter);
    this.router = this.owner.lookup('service:router');
  });

  test('exact match returns true', async function (assert) {
    this.router.currentRouteName = 'job-posts.show';
    await render(
      hbs`<span data-test="x">{{if (in-route-scope "job-posts.show") "in" "out"}}</span>`,
    );
    assert.dom('[data-test="x"]').hasText('in');
  });

  test('nested route under the scope returns true', async function (assert) {
    this.router.currentRouteName = 'job-posts.show.cover-letters.show';
    await render(
      hbs`<span data-test="x">{{if (in-route-scope "job-posts.show") "in" "out"}}</span>`,
    );
    assert.dom('[data-test="x"]').hasText('in');
  });

  test('sibling route is not in scope', async function (assert) {
    this.router.currentRouteName = 'job-posts.index';
    await render(
      hbs`<span data-test="x">{{if (in-route-scope "job-posts.show") "in" "out"}}</span>`,
    );
    assert.dom('[data-test="x"]').hasText('out');
  });

  test('prefix collision does not count as nested', async function (assert) {
    // "job-posts.show2" must NOT match "job-posts.show" — the helper
    // requires the boundary dot to consider it nested.
    this.router.currentRouteName = 'job-posts.show2';
    await render(
      hbs`<span data-test="x">{{if (in-route-scope "job-posts.show") "in" "out"}}</span>`,
    );
    assert.dom('[data-test="x"]').hasText('out');
  });

  test('empty/missing scope returns false', async function (assert) {
    this.router.currentRouteName = 'job-posts.show';
    await render(
      hbs`<span data-test="x">{{if (in-route-scope "") "in" "out"}}</span>`,
    );
    assert.dom('[data-test="x"]').hasText('out');
  });
});
