import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

// Phase C dedupe redesign — /admin/dedupe/:a/compare/:b. The controller
// owns the radio-button state and translates it into the api payload.
// The tests here lock down the payload shape so a refactor of the radio
// UI doesn't silently start sending wrong overrides.
module('Unit | Controller | admin/dedupe/compare', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const controller = this.owner.lookup('controller:admin/dedupe/compare');
    assert.ok(controller, 'controller resolves');
  });

  test('comparableRows skips fields where both halves are empty', function (assert) {
    const store = this.owner.lookup('service:store');
    const a = store.createRecord('job-post', {
      title: 'Engineer',
      location: '',
    });
    const b = store.createRecord('job-post', { title: 'Engineer II' });
    const controller = this.owner.lookup('controller:admin/dedupe/compare');
    controller.set('model', { a, b });
    const keys = controller.comparableRows.map((r) => r.key);
    assert.ok(keys.includes('title'), 'title row present');
    assert.notOk(
      keys.includes('location'),
      'location row dropped — both empty',
    );
  });

  test('setOverride / setRelation build payload of correct shape on submit', function (assert) {
    const store = this.owner.lookup('service:store');
    const a = store.createRecord('job-post', {
      title: 'Engineer',
      description: 'older description',
    });
    const b = store.createRecord('job-post', {
      title: 'Engineer II',
      description: 'newer description',
    });
    // Fake NanoID ids (CC-77 #79) — target_id must be forwarded as the
    // opaque string, never parseInt()'d.
    Object.defineProperty(a, 'id', { value: 'Ab3kZ9xQ1p' });
    Object.defineProperty(b, 'id', { value: 'Cd5mW2yR4s' });

    const controller = this.owner.lookup('controller:admin/dedupe/compare');
    controller.set('model', { a, b });

    // Default: relation=duplicate, no overrides → payload omits
    // field_overrides entirely.
    let captured = null;
    a.markDuplicateOf = (payload) => {
      captured = payload;
      return Promise.resolve();
    };
    controller.setOverride('title', 'A');
    controller.setOverride('description', 'canonical'); // omit (keep target)
    controller.setRelation('repost');
    controller.submit({ preventDefault() {} });
    assert.deepEqual(captured, {
      target_id: 'Cd5mW2yR4s',
      relation: 'repost',
      field_overrides: { title: 'A' },
    });
  });

  test('canSubmit is false when relation === "none"', function (assert) {
    const controller = this.owner.lookup('controller:admin/dedupe/compare');
    controller.setRelation('none');
    assert.false(controller.canSubmit, 'submit disabled');
    controller.setRelation('duplicate');
    assert.true(controller.canSubmit, 'submit re-enabled');
  });

  test('setOverride("canonical") clears the field from overrides', function (assert) {
    const controller = this.owner.lookup('controller:admin/dedupe/compare');
    controller.setOverride('title', 'A');
    assert.deepEqual(controller.overrides, { title: 'A' });
    controller.setOverride('title', 'canonical');
    assert.deepEqual(controller.overrides, {});
  });
});
