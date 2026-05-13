import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Pure renderer: the component receives a resolved
// `duplicateCandidates` array (the async hasMany from JobPost,
// already settled by the jp.show route's model()) and renders the
// banner. No fetch lives in the component.
module(
  'Integration | Component | job-posts/duplicate-candidates',
  function (hooks) {
    setupRenderingTest(hooks);

    test('renders nothing when @candidates is empty', async function (assert) {
      this.candidates = [];
      await render(
        hbs`<JobPosts::DuplicateCandidates @candidates={{this.candidates}} />`,
      );
      assert.dom('[data-test-duplicate-banner]').doesNotExist();
    });

    test('renders nothing when @candidates is missing', async function (assert) {
      await render(hbs`<JobPosts::DuplicateCandidates />`);
      assert.dom('[data-test-duplicate-banner]').doesNotExist();
    });

    test('renders one row per candidate with link, company, and confidence', async function (assert) {
      this.candidates = [
        {
          id: '202',
          title: 'Same role, different listing',
          companyName: 'Acme',
          confidence: 'high',
          matchSignals: ['canonical_link'],
        },
        {
          id: '303',
          title: 'Similar title at same company',
          companyName: 'Acme',
          confidence: 'low',
          matchSignals: ['fingerprint'],
        },
      ];
      await render(
        hbs`<JobPosts::DuplicateCandidates @candidates={{this.candidates}} />`,
      );
      assert.dom('[data-test-duplicate-banner]').exists();
      assert.dom('[data-test-duplicate-candidate="202"]').exists();
      assert.dom('[data-test-duplicate-candidate="303"]').exists();
      // Heading pluralizes on count
      assert.dom('p').includesText('2 possible duplicates');
    });

    test('singular heading when @candidates has one row', async function (assert) {
      this.candidates = [
        {
          id: '202',
          title: 'Lone candidate',
          companyName: 'Acme',
          confidence: 'high',
          matchSignals: [],
        },
      ];
      await render(
        hbs`<JobPosts::DuplicateCandidates @candidates={{this.candidates}} />`,
      );
      assert.dom('p').includesText('Possible duplicate');
      assert.dom('p').doesNotIncludeText('possible duplicates');
    });
  },
);
