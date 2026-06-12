import { module, skip } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The Company.aliases hasMany is intentionally NOT declared right
// now (it sent Ember Data into a runaway fetch loop on
// /admin/companies/:id when the api did not expose the
// relationship). The <Companies::AliasesPanel> component + template
// stay in the tree as dormant scaffolding; these tests are skipped
// until the api ships the CompanyAlias serializer and Company
// re-declares the relationship. See app/models/company.js.
module('Integration | Component | companies/aliases-panel', function (hooks) {
  setupRenderingTest(hooks);

  skip('renders the empty state when no aliases are present', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.company = store.createRecord('company', { name: 'Acme' });
    await render(hbs`<Companies::AliasesPanel @company={{this.company}} />`);
    assert.dom('[data-test-aliases-panel]').exists();
    assert.dom('[data-test-alias-row]').doesNotExist();
    assert.dom('h2').hasText('Name aliases');
  });

  skip('renders one row per alias with source badge', async function (assert) {
    const store = this.owner.lookup('service:store');
    // Push the Company with its aliases relationship populated so the
    // hasMany('aliases').value() path resolves synchronously in the
    // component getter.
    store.push({
      data: {
        type: 'company',
        id: '900',
        attributes: { name: 'Acme' },
        relationships: {
          aliases: {
            data: [
              { type: 'company-alias', id: '1' },
              { type: 'company-alias', id: '2' },
            ],
          },
        },
      },
      included: [
        {
          type: 'company-alias',
          id: '1',
          attributes: {
            name: 'Acme Corp',
            'name-slug': 'acme',
            source: 'extraction',
          },
        },
        {
          type: 'company-alias',
          id: '2',
          attributes: {
            name: 'Acme, Inc.',
            'name-slug': 'acme-inc',
            source: 'manual',
          },
        },
      ],
    });
    this.company = store.peekRecord('company', '900');

    await render(hbs`<Companies::AliasesPanel @company={{this.company}} />`);

    assert.dom('[data-test-alias-row]').exists({ count: 2 });
    assert.dom('[data-test-alias-row="1"]').includesText('Acme Corp');
    assert
      .dom('[data-test-alias-row="1"] [data-test-alias-source]')
      .hasText('extraction');
    assert
      .dom('[data-test-alias-row="2"] [data-test-alias-source]')
      .hasText('manual');
  });
});
