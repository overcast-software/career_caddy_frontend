import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// Phase A self-FK: an alias of a Company is itself a Company resource
// whose canonical_id == parent.id. The route requests
// include=aliases,canonical so the relationship is materialized
// synchronously before the panel renders.
module('Integration | Component | companies/aliases-panel', function (hooks) {
  setupRenderingTest(hooks);

  test('renders the empty state when no aliases are present', async function (assert) {
    const store = this.owner.lookup('service:store');
    store.push({
      data: {
        type: 'company',
        id: '900',
        attributes: { name: 'Acme' },
        relationships: {
          aliases: { data: [] },
          canonical: { data: null },
        },
      },
    });
    this.company = store.peekRecord('company', '900');
    await render(hbs`<Companies::AliasesPanel @company={{this.company}} />`);
    assert.dom('[data-test-aliases-panel]').exists();
    assert.dom('[data-test-alias-row]').doesNotExist();
    assert.dom('h2').hasText('Name aliases');
  });

  test('renders one row per alias with name + LinkTo', async function (assert) {
    const store = this.owner.lookup('service:store');
    store.push({
      data: {
        type: 'company',
        id: '900',
        attributes: { name: 'Acme' },
        relationships: {
          aliases: {
            data: [
              { type: 'company', id: '901' },
              { type: 'company', id: '902' },
            ],
          },
          canonical: { data: null },
        },
      },
      included: [
        {
          type: 'company',
          id: '901',
          attributes: { name: 'Acme Corp', displayName: null },
        },
        {
          type: 'company',
          id: '902',
          attributes: { name: 'Acme, Inc.', displayName: 'Acme Inc' },
        },
      ],
    });
    this.company = store.peekRecord('company', '900');

    await render(hbs`<Companies::AliasesPanel @company={{this.company}} />`);

    assert.dom('[data-test-alias-row]').exists({ count: 2 });
    assert.dom('[data-test-alias-row="901"]').includesText('Acme Corp');
    assert.dom('[data-test-alias-row="902"]').includesText('Acme, Inc.');
    assert.dom('[data-test-alias-row="902"]').includesText('Acme Inc');
  });

  test('shows the already-alias notice when this Company has a canonical', async function (assert) {
    const store = this.owner.lookup('service:store');
    store.push({
      data: {
        type: 'company',
        id: '910',
        attributes: { name: 'Acme Subsidiary' },
        relationships: {
          aliases: { data: [] },
          canonical: { data: { type: 'company', id: '900' } },
        },
      },
      included: [
        {
          type: 'company',
          id: '900',
          attributes: { name: 'Acme' },
        },
      ],
    });
    this.company = store.peekRecord('company', '910');

    await render(hbs`<Companies::AliasesPanel @company={{this.company}} />`);

    assert.dom('[data-test-already-alias]').exists();
    // Mark-as-alias affordance is hidden for already-aliased rows.
    assert.dom('[data-test-alias-confirm]').doesNotExist();
  });

  test('unmark button is visible when canonical is set, hidden otherwise', async function (assert) {
    const store = this.owner.lookup('service:store');

    // Canonical (no canonical pointer) — no unmark button.
    store.push({
      data: {
        type: 'company',
        id: '920',
        attributes: { name: 'Acme' },
        relationships: {
          aliases: { data: [] },
          canonical: { data: null },
        },
      },
    });
    this.canonical = store.peekRecord('company', '920');
    await render(hbs`<Companies::AliasesPanel @company={{this.canonical}} />`);
    assert.dom('[data-test-unmark-button]').doesNotExist();

    // Aliased (canonical pointer set) — unmark button surfaces.
    store.push({
      data: {
        type: 'company',
        id: '921',
        attributes: { name: 'Acme Subsidiary' },
        relationships: {
          aliases: { data: [] },
          canonical: { data: { type: 'company', id: '920' } },
        },
      },
    });
    this.aliased = store.peekRecord('company', '921');
    await render(hbs`<Companies::AliasesPanel @company={{this.aliased}} />`);
    assert.dom('[data-test-unmark-button]').exists();
    assert
      .dom('[data-test-unmark-button]')
      .hasText('Unmark — restore as canonical');
  });

  test('clicking unmark invokes the unmarkAsAliasOf model verb', async function (assert) {
    const store = this.owner.lookup('service:store');

    // Stub the router-service transitionTo so we don't actually navigate.
    const router = this.owner.lookup('service:router');
    router.transitionTo = () => Promise.resolve();

    store.push({
      data: {
        type: 'company',
        id: '930',
        attributes: { name: 'Acme Subsidiary' },
        relationships: {
          aliases: { data: [] },
          canonical: { data: { type: 'company', id: '900' } },
        },
      },
      included: [{ type: 'company', id: '900', attributes: { name: 'Acme' } }],
    });
    const company = store.peekRecord('company', '930');

    // Mock the model verb on this instance (apiAction pattern returns
    // a resolved Company; we don't care about the resolved value, only
    // that the verb was hit).
    let called = 0;
    company.unmarkAsAliasOf = () => {
      called += 1;
      return Promise.resolve(company);
    };
    this.company = company;

    await render(hbs`<Companies::AliasesPanel @company={{this.company}} />`);
    await click('[data-test-unmark-button]');

    assert.strictEqual(called, 1, 'unmarkAsAliasOf called once');
  });
});
