import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { AS2_PUBLIC } from 'career-caddy-frontend/models/job-post';

// Per-post publish/unpublish toggle (CC-56 C1 + FRON-123 operator gate). The
// label reflects the model's isPublic getter; clicking calls publish()/
// unpublish() and flips state optimistically (apiAction would push the api's
// flipped audience — the stubs below emulate that push). A failed verb reverts
// the optimistic flip and surfaces a danger flash.
//
// FRON-123: the toggle is operator-gated — it self-hides unless
// currentUser.canPublishToFediverse is true, and unpublishing prompts a
// window.confirm first. The stubs default to a staff user (gate open) +
// auto-confirm so the behavior tests can exercise the toggle; the dedicated
// gate + cancel tests flip those.
module('Integration | Component | job-posts/publish-toggle', function (hooks) {
  setupRenderingTest(hooks);

  let originalConfirm;

  hooks.beforeEach(function () {
    this.flashCalls = { success: 0, danger: 0 };
    const flashCalls = this.flashCalls;
    this.owner.register(
      'service:flash-messages',
      class extends Service {
        success() {
          flashCalls.success += 1;
        }
        danger() {
          flashCalls.danger += 1;
        }
        info() {}
        clearMessages() {}
      },
    );
    // Operator gate stub — default to a user who CAN publish so the toggle
    // renders for the behavior tests. The gate tests flip this per-instance.
    this.owner.register(
      'service:current-user',
      class extends Service {
        canPublishToFediverse = true;
      },
    );
    // Auto-confirm so the unpublish path proceeds by default; the cancel test
    // overrides this. Restored in afterEach so no global leak across modules.
    originalConfirm = window.confirm;
    window.confirm = () => true;
  });

  hooks.afterEach(function () {
    window.confirm = originalConfirm;
  });

  test('non-staff users never see the toggle (operator gate)', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    this.owner.lookup('service:current-user').canPublishToFediverse = false;
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-publish-toggle]')
      .doesNotExist('non-staff users never see the publish toggle');
  });

  test('staff (operators) see the toggle', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    // currentUser stub defaults canPublishToFediverse = true
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-publish-toggle]')
      .exists('staff users see the publish toggle');
  });

  test('label reads "Unpublish" when the post is public', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [AS2_PUBLIC],
    });
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-publish-toggle]')
      .hasText('Unpublish', 'public post offers an Unpublish action');
  });

  test('label reads "Publish" when the post is private', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-publish-toggle]')
      .hasText('Publish', 'private post offers a Publish action');
  });

  test('clicking a private post calls publish() and flips the label to Unpublish', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    let publishCalls = 0;
    let unpublishCalls = 0;
    this.jobPost.publish = function () {
      publishCalls += 1;
      // apiAction pushes the api's flipped audience; emulate that here.
      this.audience = [AS2_PUBLIC];
      return Promise.resolve(this);
    };
    this.jobPost.unpublish = function () {
      unpublishCalls += 1;
      return Promise.resolve(this);
    };
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    await click('[data-test-publish-toggle]');
    assert.strictEqual(publishCalls, 1, 'publish() fired once');
    assert.strictEqual(unpublishCalls, 0, 'unpublish() not called');
    assert.ok(this.jobPost.isPublic, 'audience flipped to public');
    assert
      .dom('[data-test-publish-toggle]')
      .hasText('Unpublish', 'label flips to Unpublish after publishing');
    assert.strictEqual(this.flashCalls.success, 1, 'success flash fired');
  });

  test('clicking a public post (confirmed) calls unpublish() and flips the label to Publish', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [AS2_PUBLIC],
    });
    let publishCalls = 0;
    let unpublishCalls = 0;
    this.jobPost.publish = function () {
      publishCalls += 1;
      return Promise.resolve(this);
    };
    this.jobPost.unpublish = function () {
      unpublishCalls += 1;
      this.audience = [];
      return Promise.resolve(this);
    };
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    await click('[data-test-publish-toggle]');
    assert.strictEqual(unpublishCalls, 1, 'unpublish() fired once');
    assert.strictEqual(publishCalls, 0, 'publish() not called');
    assert.notOk(this.jobPost.isPublic, 'audience flipped to private');
    assert
      .dom('[data-test-publish-toggle]')
      .hasText('Publish', 'label flips back to Publish after unpublishing');
    assert.strictEqual(this.flashCalls.success, 1, 'success flash fired');
  });

  test('dismissing the unpublish confirm aborts — no verb, no state change', async function (assert) {
    window.confirm = () => false;
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [AS2_PUBLIC],
    });
    let unpublishCalls = 0;
    this.jobPost.unpublish = function () {
      unpublishCalls += 1;
      this.audience = [];
      return Promise.resolve(this);
    };
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    await click('[data-test-publish-toggle]');
    assert.strictEqual(
      unpublishCalls,
      0,
      'unpublish() never called when the confirm is dismissed',
    );
    assert.ok(this.jobPost.isPublic, 'post stays public');
    assert
      .dom('[data-test-publish-toggle]')
      .hasText('Unpublish', 'label unchanged after cancelling');
    assert.strictEqual(this.flashCalls.success, 0, 'no flash on cancel');
  });

  test('a failed publish reverts the optimistic audience and flashes danger', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    this.jobPost.publish = function () {
      return Promise.reject({ errors: [{ detail: 'nope' }] });
    };
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    await click('[data-test-publish-toggle]');
    assert.notOk(
      this.jobPost.isPublic,
      'audience reverts to private after a failed publish',
    );
    assert
      .dom('[data-test-publish-toggle]')
      .hasText('Publish', 'label reverts to Publish after the failure');
    assert.strictEqual(this.flashCalls.danger, 1, 'danger flash fired');
    assert.strictEqual(this.flashCalls.success, 0, 'no success flash');
  });
});
