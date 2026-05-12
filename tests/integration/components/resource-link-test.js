import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// ResourceLink's route-choice logic shares the same predicate exercised
// by the in-route-scope helper tests. Here we cover the wiring: that the
// component instantiates against real flat routes and yields its block.
module('Integration | Component | resource-link', function (hooks) {
  setupRenderingTest(hooks);

  test('renders a link to the flat route when no parent scope is supplied', async function (assert) {
    this.set('coverLetter', { id: '1' });
    await render(hbs`
      <ResourceLink
        @flatRoute="cover-letters.show"
        @nestedRoute="job-posts.show.cover-letters.show"
        @record={{this.coverLetter}}
        data-test="link"
      >View</ResourceLink>
    `);
    assert.dom('a[data-test="link"]').hasText('View');
  });

  test('falls back to the flat route when @parent is missing', async function (assert) {
    this.set('coverLetter', { id: '2' });
    await render(hbs`
      <ResourceLink
        @flatRoute="cover-letters.show"
        @nestedRoute="job-posts.show.cover-letters.show"
        @parentScope="job-posts.show"
        @record={{this.coverLetter}}
        data-test="link"
      >Open</ResourceLink>
    `);
    assert.dom('a[data-test="link"]').hasText('Open');
  });
});
