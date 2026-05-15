import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

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

    test('renders apply_hint and referrer_hint signal labels', async function (assert) {
      this.candidates = [
        {
          id: '404',
          title: 'ATS canonical',
          companyName: 'Acme',
          confidence: 'high',
          matchSignals: ['apply_hint'],
        },
        {
          id: '505',
          title: 'LinkedIn referrer',
          companyName: 'Acme',
          confidence: 'high',
          matchSignals: ['referrer_hint'],
        },
      ];
      await render(
        hbs`<JobPosts::DuplicateCandidates @candidates={{this.candidates}} />`,
      );
      // Signal labels render as the `title` attribute of the confidence
      // chip via `c.signals`; verify the human-readable strings made it
      // through the SIGNAL_LABELS map.
      assert
        .dom('[data-test-duplicate-candidate="404"]')
        .exists('apply_hint candidate rendered');
      assert
        .dom('[data-test-duplicate-candidate="505"]')
        .exists('referrer_hint candidate rendered');
      assert
        .dom('span[title*="apply-button link"]')
        .exists('apply_hint label visible in signals tooltip');
      assert
        .dom('span[title*="referrer link"]')
        .exists('referrer_hint label visible in signals tooltip');
    });

    test('non-staff users do not see the resolve-and-dedupe button', async function (assert) {
      this.candidates = [
        {
          id: '202',
          title: 'Existing dupe',
          companyName: 'Acme',
          confidence: 'high',
          matchSignals: ['canonical_link'],
        },
      ];
      this.jobPost = { id: '1' };
      this.owner.register(
        'service:current-user',
        class extends Service {
          user = { isStaff: false };
        },
      );
      await render(
        hbs`<JobPosts::DuplicateCandidates @candidates={{this.candidates}} @jobPost={{this.jobPost}} />`,
      );
      assert.dom('[data-test-resolve-and-dedupe]').doesNotExist();
    });

    test('staff see the resolve-and-dedupe button and clicking it calls the model action', async function (assert) {
      let calls = 0;
      this.candidates = [];
      this.jobPost = {
        id: '1',
        resolveAndDedupe() {
          calls += 1;
          return Promise.resolve();
        },
      };
      this.owner.register(
        'service:current-user',
        class extends Service {
          user = { isStaff: true };
        },
      );
      this.owner.register(
        'service:flash-messages',
        class extends Service {
          success() {}
          danger() {}
        },
      );
      await render(
        hbs`<JobPosts::DuplicateCandidates @candidates={{this.candidates}} @jobPost={{this.jobPost}} />`,
      );
      assert
        .dom('[data-test-duplicate-banner]')
        .exists('banner renders for staff even with no candidates');
      assert.dom('[data-test-resolve-and-dedupe]').exists();
      assert.dom('p').includesText('No likely duplicates');
      await click('[data-test-resolve-and-dedupe]');
      assert.strictEqual(calls, 1, 'model.resolveAndDedupe was called once');
    });
  },
);
