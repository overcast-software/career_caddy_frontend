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
});
