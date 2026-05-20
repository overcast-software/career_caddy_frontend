import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The Sankey component wraps d3-sankey's layout call in a try/catch so a
// cyclic edge set (the legacy "circular link" prod bug) doesn't blank the
// reports page. These tests exercise both the happy path and the rescue.

module(
  'Integration | Component | reports/application-flow-sankey',
  function (hooks) {
    setupRenderingTest(hooks);

    test('renders a DAG payload without error', async function (assert) {
      this.set('nodes', [
        { id: 'job_posts' },
        { id: 'applications' },
        { id: 'applied' },
        { id: 'interview' },
      ]);
      this.set('links', [
        { source: 0, target: 1, value: 5 },
        { source: 1, target: 2, value: 5 },
        { source: 2, target: 3, value: 3 },
      ]);
      await render(
        hbs`<Reports::ApplicationFlowSankey @nodes={{this.nodes}} @links={{this.links}} />`,
      );
      assert
        .dom('[data-test-sankey-error]')
        .doesNotExist('no error banner on a clean DAG');
      assert.dom('svg .sankey-nodes').exists('node group rendered');
      assert.dom('svg .sankey-links').exists('link group rendered');
    });

    test('catches cyclic edge sets and shows an inline error instead of crashing', async function (assert) {
      // interview ↔ rejected — the exact shape d3-sankey rejects.
      this.set('nodes', [
        { id: 'applications' },
        { id: 'applied' },
        { id: 'interview' },
        { id: 'rejected' },
      ]);
      this.set('links', [
        { source: 0, target: 1, value: 2 },
        { source: 1, target: 2, value: 2 },
        { source: 2, target: 3, value: 1 },
        { source: 3, target: 2, value: 1 },
      ]);
      await render(
        hbs`<Reports::ApplicationFlowSankey @nodes={{this.nodes}} @links={{this.links}} />`,
      );
      assert
        .dom('[data-test-sankey-error]')
        .exists('inline error banner appears on a cycle')
        .includesText('circular');
    });

    test('renders nothing when given empty data', async function (assert) {
      this.set('nodes', []);
      this.set('links', []);
      await render(
        hbs`<Reports::ApplicationFlowSankey @nodes={{this.nodes}} @links={{this.links}} />`,
      );
      assert
        .dom('[data-test-sankey-error]')
        .doesNotExist('no error on empty data — just an empty chart');
    });
  },
);
