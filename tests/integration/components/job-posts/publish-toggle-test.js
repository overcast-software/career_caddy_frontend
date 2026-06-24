import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { AS2_PUBLIC } from 'career-caddy-frontend/models/job-post';

// CC-56 C1 — one-click publish/unpublish toggle. The label reflects the
// model's isPublic getter; clicking calls publish()/unpublish() and flips
// state optimistically (apiAction would push the api's flipped audience —
// the stubs below emulate that push). A failed verb reverts the optimistic
// flip and surfaces a danger flash.
module('Integration | Component | job-posts/publish-toggle', function (hooks) {
  setupRenderingTest(hooks);

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

  test('label reads "Publish to my public feed" when the post is private', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    await render(hbs`<JobPosts::PublishToggle @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-publish-toggle]')
      .hasText(
        'Publish to my public feed',
        'private post offers a Publish action',
      );
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

  test('clicking a public post calls unpublish() and flips the label to Publish', async function (assert) {
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
      .hasText(
        'Publish to my public feed',
        'label flips back to Publish after unpublishing',
      );
    assert.strictEqual(this.flashCalls.success, 1, 'success flash fired');
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
      .hasText(
        'Publish to my public feed',
        'label reverts to Publish after the failure',
      );
    assert.strictEqual(this.flashCalls.danger, 1, 'danger flash fired');
    assert.strictEqual(this.flashCalls.success, 0, 'no success flash');
  });
});
