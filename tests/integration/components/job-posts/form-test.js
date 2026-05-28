import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, fillIn, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { AS2_PUBLIC } from 'career-caddy-frontend/models/job-post';

// Phase 1 of Plans/PLAN ActivityPub prep + job-post adaptation:
// canonical_link must render read-only and apply_url editable on jp.edit.

module('Integration | Component | job-posts/form', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    // Stub the services the form pulls in. We assert on flash calls in the
    // PATCH test, so make `success` / `danger` no-op-but-call-counting.
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
    this.transitions = [];
    const transitions = this.transitions;
    this.owner.register(
      'service:router',
      class extends Service {
        transitionTo(...args) {
          transitions.push(args);
        }
      },
    );
    this.owner.register(
      'service:current-user',
      class extends Service {
        user = { id: 1, username: 'tester', isStaff: false };
      },
    );
  });

  test('renders canonical link read-only and apply_url editable', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      link: 'https://example.com/jobs/123',
      canonicalLink: 'https://example.com/jobs/123',
      applyUrl: 'https://ats.example.com/apply/123',
    });

    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);

    assert
      .dom('[data-test-canonical-link]')
      .hasText('https://example.com/jobs/123', 'canonical link displays');
    // The canonical block is a <div>, not an <input> — read-only by shape.
    assert
      .dom('[data-test-canonical-link]')
      .matchesSelector(
        'div',
        'canonical link is rendered as a div (read-only)',
      );

    assert
      .dom('[data-test-apply-url]')
      .hasValue(
        'https://ats.example.com/apply/123',
        'apply_url renders in an editable input',
      )
      .matchesSelector('input', 'apply_url is an input element');
  });

  test('renders placeholder when canonicalLink is null', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      link: '',
      canonicalLink: null,
    });

    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);

    assert
      .dom('[data-test-canonical-link]')
      .includesText('no canonical URL yet', 'placeholder copy shown');
  });

  test('editing apply_url and submitting flushes the intermediary onto the model', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      link: 'https://example.com/jobs/123',
      applyUrl: null,
    });

    // Stub save() so the test doesn't fire an HTTP request. Capture the
    // applyUrl on the record at the moment .save() is invoked — that's
    // what PATCH would round-trip.
    let savedApplyUrl;
    const realSave = this.jobPost.save;
    this.jobPost.save = function () {
      savedApplyUrl = this.applyUrl;
      return Promise.resolve(this);
    };

    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);

    await fillIn('[data-test-apply-url]', 'https://ats.example.com/apply/abc');
    await click('button[type="submit"]');

    assert.strictEqual(
      savedApplyUrl,
      'https://ats.example.com/apply/abc',
      'submit() wrote the intermediary value onto the model before save()',
    );
    assert.strictEqual(
      this.flashCalls.success,
      1,
      'success flash fires on save resolution',
    );
    assert.strictEqual(
      this.transitions.length,
      1,
      'transitionTo runs after save resolution',
    );

    // Restore real save to avoid leaking the stub across tests.
    this.jobPost.save = realSave;
  });

  test('duplicate-handling banner hidden when not a duplicate', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      duplicateOfId: null,
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    assert.dom('[data-test-current-duplicate-target]').doesNotExist();
    assert.dom('[data-test-duplicate-picker]').exists();
  });

  test('duplicate-handling banner shows when duplicateOfId is set', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      duplicateOfId: 42,
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-current-duplicate-target]')
      .exists('banner renders when post is a duplicate');
    assert.dom('[data-test-current-duplicate-link]').hasText(/#42/);
    assert.dom('[data-test-unlink-duplicate]').exists();
    assert.dom('[data-test-promote-canonical]').exists();
  });

  test('clicking Unlink calls unlinkDuplicate on the model', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      duplicateOfId: 42,
    });
    let calls = 0;
    this.jobPost.unlinkDuplicate = function () {
      calls += 1;
      this.duplicateOfId = null;
      return Promise.resolve(this);
    };
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    await click('[data-test-unlink-duplicate]');
    assert.strictEqual(calls, 1, 'unlinkDuplicate fired');
  });

  test('clicking Promote calls promoteCanonical on the model', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      duplicateOfId: 42,
    });
    let calls = 0;
    this.jobPost.promoteCanonical = function () {
      calls += 1;
      this.duplicateOfId = null;
      return Promise.resolve(this);
    };
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    await click('[data-test-promote-canonical]');
    assert.strictEqual(calls, 1, 'promoteCanonical fired');
  });

  // Phase 3.5 prep for Phase 4 ActivityPub readiness: the Visibility
  // selector reads + writes JobPost.audience. Public maps to the AS2
  // Public collection URI; Private maps to an empty list. Future
  // granularity (Followers / Unlisted) drops in over the same data
  // shape without re-plumbing the form.
  test('visibility selector renders and defaults to the model audience', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [AS2_PUBLIC],
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-visibility]')
      .exists('Visibility section renders on the edit form');
    assert
      .dom('[data-test-visibility-select]')
      .hasValue('public', 'Public is selected for an AS2 Public audience');
  });

  test('visibility selector reflects a private audience', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-visibility-select]')
      .hasValue('private', 'Private is selected for an empty audience');
  });

  test('changing visibility to Private writes an empty audience array', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [AS2_PUBLIC],
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    await fillIn('[data-test-visibility-select]', 'private');
    assert.deepEqual(
      this.jobPost.audience,
      [],
      'Selecting Private clears audience to []',
    );
    assert.notOk(
      this.jobPost.isPublic,
      'isPublic getter flips to false after the write',
    );
  });

  test('changing visibility to Public writes the AS2 Public URI', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    await fillIn('[data-test-visibility-select]', 'public');
    assert.deepEqual(
      this.jobPost.audience,
      [AS2_PUBLIC],
      'Selecting Public writes [AS2_PUBLIC] verbatim — federation peers match this URI string exactly',
    );
    assert.ok(
      this.jobPost.isPublic,
      'isPublic getter flips to true after the write',
    );
  });

  test('submit without touching apply_url leaves the model field alone', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      link: 'https://example.com/jobs/123',
      applyUrl: 'https://ats.example.com/existing',
    });

    let savedApplyUrl;
    const realSave = this.jobPost.save;
    this.jobPost.save = function () {
      savedApplyUrl = this.applyUrl;
      return Promise.resolve(this);
    };

    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    // Note: no fillIn on [data-test-apply-url].
    await click('button[type="submit"]');

    assert.strictEqual(
      savedApplyUrl,
      'https://ats.example.com/existing',
      'unedited apply_url is preserved through the save flow',
    );

    this.jobPost.save = realSave;
  });
});
