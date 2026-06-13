import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module(
  'Integration | Component | companies/subscribe-button',
  function (hooks) {
    setupRenderingTest(hooks);

    test('renders nothing when federation is disabled', async function (assert) {
      const store = this.owner.lookup('service:store');
      this.company = store.createRecord('company', {
        name: 'Acme',
        slug: 'acme',
        federationEnabled: false,
      });
      await render(
        hbs`<Companies::SubscribeButton @company={{this.company}} />`,
      );
      assert.dom('[data-test-subscribe-button]').doesNotExist();
    });

    test('renders nothing when slug is missing', async function (assert) {
      const store = this.owner.lookup('service:store');
      this.company = store.createRecord('company', {
        name: 'Acme',
        slug: null,
        federationEnabled: true,
      });
      await render(
        hbs`<Companies::SubscribeButton @company={{this.company}} />`,
      );
      assert.dom('[data-test-subscribe-button]').doesNotExist();
    });

    test('renders the acct: handle from slug + window.location.host', async function (assert) {
      const store = this.owner.lookup('service:store');
      this.company = store.createRecord('company', {
        name: 'Acme',
        slug: 'acme',
        federationEnabled: true,
      });
      await render(
        hbs`<Companies::SubscribeButton @company={{this.company}} />`,
      );
      assert.dom('[data-test-subscribe-button]').exists();
      assert
        .dom('[data-test-subscribe-handle]')
        .hasText(`acct:acme@${window.location.host}`);
    });

    test('copy button updates label after click', async function (assert) {
      // Stub navigator.clipboard.writeText so the test runs in the
      // headless test env (clipboard API not always available).
      const original = navigator.clipboard;
      let copied = null;
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: (text) => {
            copied = text;
            return Promise.resolve();
          },
        },
      });

      const store = this.owner.lookup('service:store');
      this.company = store.createRecord('company', {
        name: 'Acme',
        slug: 'acme',
        federationEnabled: true,
      });
      await render(
        hbs`<Companies::SubscribeButton @company={{this.company}} />`,
      );
      await click('[data-test-subscribe-copy]');
      assert.strictEqual(copied, `acct:acme@${window.location.host}`);
      assert.dom('[data-test-subscribe-copy]').includesText('Copied!');

      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: original,
      });
    });
  },
);
