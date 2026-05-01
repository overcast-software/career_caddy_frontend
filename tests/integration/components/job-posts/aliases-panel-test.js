import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-posts/aliases-panel', function (hooks) {
  setupRenderingTest(hooks);

  test('renders nothing when the JobPost has at most one URL', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jp = store.createRecord('job-post', {
      link: 'https://example.com/only',
    });
    await render(hbs`<JobPosts::AliasesPanel @jobPost={{this.jp}} />`);
    assert.dom('[data-test-aliases]').doesNotExist();
    assert.dom('h2').doesNotExist();
  });

  test('renders one row per distinct alias with label badge + external link', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jp = store.createRecord('job-post', {
      link: 'https://www.dice.com/job-detail/X',
      applyUrl: 'https://careers.unitedhealthgroup.com/job/X',
      applyUrlStatus: 'resolved',
    });
    store.createRecord('scrape', {
      jobPost: this.jp,
      url: 'https://www.dice.com/job-detail/X',
      sourceLink: 'https://jobright.ai/track/abc',
    });

    await render(hbs`<JobPosts::AliasesPanel @jobPost={{this.jp}} />`);

    assert.dom('h2').hasText('Reachable via');
    assert.dom('[data-test-aliases] li').exists({ count: 3 });
    assert
      .dom('[data-test-alias="https://www.dice.com/job-detail/X"] a')
      .hasAttribute('href', 'https://www.dice.com/job-detail/X')
      .hasAttribute('target', '_blank')
      .hasText('www.dice.com');
    assert
      .dom('[data-test-alias="https://jobright.ai/track/abc"] span')
      .hasText('Tracker');
    assert
      .dom(
        '[data-test-alias="https://careers.unitedhealthgroup.com/job/X"] span',
      )
      .hasText('Apply');
  });
});
