import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

module('Unit | Model | resume', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('resume', {});
    assert.ok(model, 'model exists');
  });

  module('sectionRenderOrder', function () {
    test('falls back to canonical when API attribute is missing', function (assert) {
      const store = this.owner.lookup('service:store');
      const model = store.createRecord('resume', {});
      // API didn't supply effectiveSectionOrder — slim payload, older
      // server, etc. Use the canonical fallback so the template never
      // renders an empty resume.
      assert.deepEqual(model.sectionRenderOrder, [
        'summary',
        'skills',
        'experience',
        'projects',
        'education',
        'certifications',
      ]);
    });

    test('falls back to canonical when API attribute is empty', function (assert) {
      const store = this.owner.lookup('service:store');
      const model = store.createRecord('resume', { effectiveSectionOrder: [] });
      assert.deepEqual(model.sectionRenderOrder, [
        'summary',
        'skills',
        'experience',
        'projects',
        'education',
        'certifications',
      ]);
    });

    test('uses the API-supplied order when present (PM archetype)', function (assert) {
      const store = this.owner.lookup('service:store');
      const order = [
        'summary',
        'experience',
        'projects',
        'skills',
        'education',
        'certifications',
      ];
      const model = store.createRecord('resume', {
        effectiveSectionOrder: order,
      });
      assert.deepEqual(
        model.sectionRenderOrder,
        order,
        'PM ordering survives the round-trip — frontend defers to server',
      );
    });

    test('preserves arbitrary explicit overrides without reordering', function (assert) {
      // The API may serve a section_order the user typed by hand; we
      // must not silently rewrite it.
      const store = this.owner.lookup('service:store');
      const order = ['skills', 'summary', 'experience'];
      const model = store.createRecord('resume', {
        effectiveSectionOrder: order,
      });
      assert.deepEqual(model.sectionRenderOrder, order);
    });
  });

  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('resume');
      this.ajaxCalls = [];
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve({ data: null });
      };
    });

    test('reorderExperiences(ids) POSTs experience_ids body to /resumes/:id/reorder-experiences/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: { type: 'resume', id: '600', attributes: {} },
      });
      const resume = store.peekRecord('resume', '600');
      await resume.reorderExperiences([3, 1, 2]);
      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/resumes/600/reorder-experiences/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.deepEqual(this.ajaxCalls[0].options?.data, {
        experience_ids: [3, 1, 2],
      });
    });
  });
});
