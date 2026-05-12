import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | scores/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    this.score = {
      score: 87,
      resume: { id: '1', name: 'resume Name' },
      jobPost: {
        id: '1',
        title: 'jobPost title',
        company: { name: 'company Name' },
      },
    };

    await render(hbs`<Scores::Item @score={{this.score}} />`);

    assert.dom('article.panel-card').exists();
    assert.dom().includesText('Score');
    assert.dom().includesText('Resume');
    assert.dom().includesText('jobPost title');
    assert.dom().includesText('company Name');
  });
});
