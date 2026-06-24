import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, fillIn, click } from '@ember/test-helpers';
import { clickTrigger } from 'ember-power-select/test-support/helpers';
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

  // Regression: the duplicate picker opens its dropdown when clicked, but
  // without @searchEnabled={{true}} the before-options template renders
  // nothing (the inner {{#if @searchEnabled ...}} gates the entire
  // <input type="search"> element). Result: dropdown opens, placeholder
  // shows on the trigger, focus stays on the non-input trigger, and
  // typed characters fall into PowerSelect's typeahead-on-options task
  // which is a no-op because there are no @options (only an async
  // @search). The fix is to pass @searchEnabled={{true}} like every
  // other working <PowerSelect> in the codebase. This test fails on
  // main by asserting that the search input element exists in the DOM
  // after opening the dropdown.
  test('duplicate picker renders a search input when the dropdown opens', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      duplicateOfId: null,
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    // Scope the trigger click to the duplicate-handling section so we
    // don't pick up the Company PowerSelectWithCreate also rendered in
    // this form. `data-test-duplicate-picker` lands on the trigger
    // element itself via ...attributes, so the bare data attribute IS
    // already `.ember-power-select-trigger`; clickTrigger's descendant
    // form needs a wrapper to scope by.
    await clickTrigger('[data-test-duplicate-handling]');
    // The dropdown is rendered in a wormhole at the document root, so
    // assert.dom (scoped to the rendering test container) misses it.
    // Query the document directly.
    const input = document.querySelector('.ember-power-select-search-input');
    assert.ok(
      input,
      'before-options renders <input class="ember-power-select-search-input"> when dropdown opens — gated by @searchEnabled',
    );
    assert.strictEqual(
      input?.tagName,
      'INPUT',
      'search field is a real <input>, not a div the user can mistake for one',
    );
    assert.strictEqual(
      input?.getAttribute('type'),
      'search',
      'search field is type="search" so the browser routes keystrokes into its value',
    );
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

  // CC-56 C1: the edit form's Visibility section now hosts the one-click
  // <JobPosts::PublishToggle> (immediate publish/unpublish verbs) instead of
  // a Save-gated <select>. The toggle's own behavior — calling
  // publish()/unpublish(), the optimistic flip + revert — is covered in
  // job-posts/publish-toggle-test.js. Here we only assert the form wires
  // @jobPost through so the right label renders per audience.
  test('visibility section renders the publish toggle for a public post', async function (assert) {
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
      .dom('[data-test-publish-toggle]')
      .hasText('Unpublish', 'a public post offers an Unpublish action');
  });

  test('visibility section reflects a private post', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', {
      title: 'Engineer',
      audience: [],
    });
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    assert
      .dom('[data-test-publish-toggle]')
      .hasText(
        'Publish to my public feed',
        'a private post offers a Publish action',
      );
  });

  // Regression: deleting a job-post used to make jp.index "freak out"
  // and render "missing company" on sibling rows that shared a Company
  // via the list payload's `included` array. Root cause was a
  // destroyRecord().then(unloadRecord()) pair — Ember Data 5+ already
  // evicts the identifier on destroy, so the follow-up unload runs the
  // inverse-cleanup on Company.jobPosts a second time and the async
  // belongsTo proxies on neighbors transiently resolve to null. The
  // fix is to stop calling unloadRecord() after destroyRecord().
  test('submitDelete calls destroyRecord and does NOT follow with unloadRecord', async function (assert) {
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', { title: 'Engineer' });
    let destroyCalls = 0;
    let unloadCalls = 0;
    this.jobPost.destroyRecord = function () {
      destroyCalls += 1;
      return Promise.resolve(this);
    };
    this.jobPost.unloadRecord = function () {
      unloadCalls += 1;
    };
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    await click('[data-test-delete-trigger]');
    await click('[data-test-delete-confirm]');
    assert.strictEqual(destroyCalls, 1, 'destroyRecord fired once');
    assert.strictEqual(
      unloadCalls,
      0,
      'unloadRecord NOT called — would double-tap Company.jobPosts inverse-cleanup',
    );
    assert.strictEqual(this.flashCalls.success, 1, 'success flash fired');
    assert.strictEqual(
      this.transitions.length,
      1,
      'transitionTo to jp.index fired',
    );
  });

  test('nuclearDelete calls deleteRecord exactly once and does NOT call unloadRecord', async function (assert) {
    // Set isStaff so the nuclear button renders.
    this.owner.unregister('service:current-user');
    this.owner.register(
      'service:current-user',
      class extends Service {
        user = { id: 1, username: 'tester', isStaff: true };
      },
    );
    const store = this.owner.lookup('service:store');
    this.jobPost = store.createRecord('job-post', { title: 'Engineer' });
    let nuclearCalls = 0;
    let deleteCalls = 0;
    let unloadCalls = 0;
    this.jobPost.nuclearDelete = function () {
      nuclearCalls += 1;
      return Promise.resolve(this);
    };
    this.jobPost.deleteRecord = function () {
      deleteCalls += 1;
    };
    this.jobPost.unloadRecord = function () {
      unloadCalls += 1;
    };
    await render(hbs`<JobPosts::Form @jobPost={{this.jobPost}} />`);
    await click('[data-test-delete-trigger]');
    await click('[data-test-nuclear-delete]');
    assert.strictEqual(nuclearCalls, 1, 'nuclearDelete model action fired');
    assert.strictEqual(
      deleteCalls,
      1,
      'deleteRecord fired once — flips isDeleted=true for list-model.js cache invalidation',
    );
    assert.strictEqual(
      unloadCalls,
      0,
      'unloadRecord NOT called — keeps identifier so inverse-cleanup runs only once',
    );
    assert.strictEqual(this.flashCalls.success, 1, 'success flash fired');
    assert.strictEqual(
      this.transitions.length,
      1,
      'transitionTo to jp.index fired',
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
