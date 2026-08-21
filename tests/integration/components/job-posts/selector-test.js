import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import {
  clickTrigger,
  typeInSearch,
} from 'ember-power-select/test-support/helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | job-posts/selector', function (hooks) {
  setupRenderingTest(hooks);

  function seed(store) {
    store.push({
      data: [
        {
          type: 'company',
          id: 'c1',
          attributes: { name: 'Toptal' },
        },
        {
          type: 'job-post',
          id: 'jp1',
          attributes: { title: 'Backend Engineer (Ruby on Rails)' },
          relationships: {
            company: { data: { type: 'company', id: 'c1' } },
          },
        },
      ],
    });
  }

  test('it renders', async function (assert) {
    await render(hbs`<JobPosts::Selector />`);

    assert.ok(this.element, 'component renders');

    // Template block usage:
    await render(hbs`
      <JobPosts::Selector>
        template block text
      </JobPosts::Selector>
    `);

    assert.ok(this.element, 'component renders in block mode');
  });

  // FRON-125: the browse list used to load in the constructor — a
  // findAll of every company plus their job posts on every mount.
  test('does not load the browse list until the dropdown opens', async function (assert) {
    const store = this.owner.lookup('service:store');
    let findAllCalls = 0;
    store.findAll = () => {
      findAllCalls += 1;
      return Promise.resolve([]);
    };

    await render(hbs`<JobPosts::Selector />`);
    assert.strictEqual(findAllCalls, 0, 'nothing is fetched on mount');

    await clickTrigger();
    await settled();
    assert.strictEqual(
      findAllCalls,
      1,
      'the browse list is fetched when the dropdown opens',
    );
  });

  // FRON-125: @companyId narrows both the browse list and the search.
  test('sends filter[company_id] alongside filter[query] when @companyId is set', async function (assert) {
    const store = this.owner.lookup('service:store');
    seed(store);
    const calls = [];
    store.query = (modelName, params) => {
      calls.push({ modelName, params });
      return Promise.resolve([store.peekRecord('job-post', 'jp1')]);
    };
    this.companyId = 'c1';

    await render(hbs`<JobPosts::Selector @companyId={{this.companyId}} />`);
    await clickTrigger();
    await typeInSearch('Backend');
    await settled();

    const search = calls[calls.length - 1];
    assert.strictEqual(search.modelName, 'job-post');
    assert.strictEqual(search.params['filter[query]'], 'Backend');
    assert.strictEqual(
      search.params['filter[company_id]'],
      'c1',
      'results dwindle to the chosen company',
    );
  });

  test('omits filter[company_id] when no @companyId is given', async function (assert) {
    const store = this.owner.lookup('service:store');
    seed(store);
    const calls = [];
    store.query = (modelName, params) => {
      calls.push({ modelName, params });
      return Promise.resolve([store.peekRecord('job-post', 'jp1')]);
    };
    store.findAll = () => Promise.resolve([]);

    await render(hbs`<JobPosts::Selector />`);
    await clickTrigger();
    await typeInSearch('Backend');
    await settled();

    const search = calls[calls.length - 1];
    assert.strictEqual(search.params['filter[query]'], 'Backend');
    assert.notOk(
      'filter[company_id]' in search.params,
      'unscoped callers search every company, as before',
    );
  });

  // FRON-125: callers that pass @selected own the value, so a chosen
  // job application can move this field from the outside.
  test('@selected controls the displayed job post', async function (assert) {
    const store = this.owner.lookup('service:store');
    seed(store);
    this.selected = store.peekRecord('job-post', 'jp1');

    await render(hbs`<JobPosts::Selector @selected={{this.selected}} />`);

    assert
      .dom('.ember-power-select-trigger')
      .includesText('Backend Engineer (Ruby on Rails)');

    this.set('selected', null);
    await settled();
    assert
      .dom('.ember-power-select-trigger')
      .includesText(
        'Search job posts by title or company…',
        'clearing from the outside clears the field',
      );
  });
});
