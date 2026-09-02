import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
import {
  clickTrigger,
  typeInSearch,
  findContains,
} from 'ember-power-select/test-support/helpers';
import { hbs } from 'ember-cli-htmlbars';

// FRON-125: on the standalone /questions form the Job Post and Job
// Application pickers were static lists gated behind picking a Company,
// and choosing an application never filled in its job post. These tests
// cover the search shape and the back-fill.

module('Integration | Component | questions/form', function (hooks) {
  setupRenderingTest(hooks);

  // Toptal / "Backend Engineer (Ruby on Rails)" — the real rows from the
  // report that prompted the ticket.
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
        {
          type: 'job-application',
          id: 'ja1',
          attributes: { status: 'Applied' },
          relationships: {
            jobPost: { data: { type: 'job-post', id: 'jp1' } },
            company: { data: { type: 'company', id: 'c1' } },
          },
        },
      ],
    });
  }

  // FRON-126: the real dead-end shape. An application links its job
  // post, the post exists — and NEITHER carries a company. That is the
  // observed state of JA sZMa2qMpE8 → JP H753taz3fT, an extension-created
  // post the ingestion path couldn't attach a company to.
  function seedCompanyless(store) {
    store.push({
      data: [
        {
          type: 'job-post',
          id: 'jp9',
          attributes: { title: 'Senior Rails Engineer' },
        },
        {
          type: 'job-application',
          id: 'ja9',
          attributes: { status: 'Applied' },
          relationships: {
            jobPost: { data: { type: 'job-post', id: 'jp9' } },
          },
        },
      ],
    });
  }

  // Two rows that both READ as "Toptal" — Company#__str__ is
  // `display_name or name`, so the second one displays as the first.
  // Attaching the wrong one to a job post is worse than attaching none.
  function seedNearDuplicateCompanies(store) {
    store.push({
      data: [
        { type: 'company', id: 'c1', attributes: { name: 'Toptal' } },
        {
          type: 'company',
          id: 'c2',
          attributes: { name: 'Toptal, LLC', displayName: 'Toptal' },
        },
      ],
    });
  }

  // Stand in for the api so the typeahead resolves without a backend,
  // and capture what was actually asked for.
  function stubQuery(store, resultsByModel) {
    const calls = [];
    store.query = (modelName, params) => {
      calls.push({ modelName, params });
      return Promise.resolve(resultsByModel[modelName] ?? []);
    };
    return calls;
  }

  // A question that arrives with a company preloads that company's
  // applications on mount; serve it from the store instead of the wire.
  function stubFindRecord(store) {
    store.findRecord = (modelName, id) =>
      Promise.resolve(store.peekRecord(modelName, id));
  }

  test('it renders', async function (assert) {
    await render(hbs`<Questions::Form />`);

    assert.ok(this.element, 'component renders');

    // Template block usage:
    await render(hbs`
      <Questions::Form>
        template block text
      </Questions::Form>
    `);

    assert.ok(this.element, 'component renders in block mode');
  });

  test('the job application picker searches the api with no company chosen', async function (assert) {
    const store = this.owner.lookup('service:store');
    seed(store);
    const calls = stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja1')],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    // No company selected — this must not be gated.
    assert
      .dom('[data-test-job-app-field] .ember-power-select-trigger')
      .hasAttribute(
        'aria-disabled',
        'false',
        'the application picker is reachable without naming a company first',
      );

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Backend');
    await settled();

    assert.strictEqual(calls.length, 1, 'exactly one query fired');
    assert.strictEqual(calls[0].modelName, 'job-application');
    assert.strictEqual(
      calls[0].params['filter[query]'],
      'Backend',
      'filter[query] carries the term — it matches the job post title api-side',
    );
    assert.notOk(
      'filter[company_id]' in calls[0].params,
      'no company chosen means no company narrowing',
    );
    // JobApplicationViewSet has no filter[job_post_id]; sending one is
    // silently ignored, so narrowing by job post stays client-side.
    assert.notOk(
      'filter[job_post_id]' in calls[0].params,
      'filter[job_post_id] is never sent — the endpoint would ignore it',
    );
  });

  test('choosing a job application back-fills its job post and company', async function (assert) {
    const store = this.owner.lookup('service:store');
    seed(store);
    stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja1')],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Backend');
    await settled();
    await click(
      findContains('.ember-power-select-option', 'Backend Engineer (Ruby'),
    );

    assert.strictEqual(
      this.question.belongsTo('jobApplication').id(),
      'ja1',
      'the application is attached to the question',
    );
    assert.strictEqual(
      this.question.belongsTo('jobPost').id(),
      'jp1',
      "the application's job post came along for free",
    );
    assert.strictEqual(
      this.question.belongsTo('company').id(),
      'c1',
      'the company was unset, so it was filled in too',
    );
    // includesText, not hasText: @allowClear puts a × inside the trigger.
    assert
      .dom('[data-test-job-post-field] .ember-power-select-trigger')
      .includesText(
        'Backend Engineer (Ruby on Rails)',
        'the Job Post field visibly moves rather than silently disagreeing',
      );
  });

  test('a second search is not trapped by the job post the first choice filled in', async function (assert) {
    // The back-fill sets a job post, and the browse list narrows to it.
    // Narrowing SEARCH results the same way would mean that once you
    // pick an application you can never search your way to a different
    // one — every other job answers "no results".
    const store = this.owner.lookup('service:store');
    seed(store);
    store.push({
      data: [
        { type: 'company', id: 'c2', attributes: { name: 'Rippling' } },
        {
          type: 'job-post',
          id: 'jp2',
          attributes: { title: 'Staff Platform Engineer' },
          relationships: { company: { data: { type: 'company', id: 'c2' } } },
        },
        {
          type: 'job-application',
          id: 'ja2',
          attributes: { status: 'Applied' },
          relationships: {
            jobPost: { data: { type: 'job-post', id: 'jp2' } },
            company: { data: { type: 'company', id: 'c2' } },
          },
        },
      ],
    });
    stubQuery(store, {
      'job-application': [
        store.peekRecord('job-application', 'ja1'),
        store.peekRecord('job-application', 'ja2'),
      ],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Backend');
    await settled();
    await click(
      findContains('.ember-power-select-option', 'Backend Engineer (Ruby'),
    );
    assert.strictEqual(
      this.question.belongsTo('jobPost').id(),
      'jp1',
      'first choice back-filled its job post',
    );

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Staff');
    await settled();
    assert.ok(
      findContains('.ember-power-select-option', 'Staff Platform Engineer'),
      'an application for a different job post is still reachable by search',
    );
  });

  test('back-filling does not freeze the pickers', async function (assert) {
    // Regression: hasLockedContext used to read the LIVE selection, so
    // the moment anything set selectedJobPost — including this back-fill
    // — Company and Job Post collapsed into disabled inputs with no way
    // back. Locking is now an arrival fact only.
    const store = this.owner.lookup('service:store');
    seed(store);
    stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja1')],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Backend');
    await settled();
    await click(
      findContains('.ember-power-select-option', 'Backend Engineer (Ruby'),
    );

    assert
      .dom('[data-test-company-field] .ember-power-select-trigger')
      .exists('Company is still a picker after the back-fill');
    assert
      .dom('[data-test-job-post-field] .ember-power-select-trigger')
      .exists('Job Post is still a picker after the back-fill');
    assert
      .dom('[data-test-company-field] input[disabled]')
      .doesNotExist('Company did not collapse into a read-only input');
  });

  test('a question that arrives with a job post still renders locked fields', async function (assert) {
    // job-posts/:id/questions/new — the context IS decided, and these
    // fields must stay read-only.
    const store = this.owner.lookup('service:store');
    seed(store);
    stubFindRecord(store);
    this.question = store.createRecord('question', {
      jobPost: store.peekRecord('job-post', 'jp1'),
      company: store.peekRecord('company', 'c1'),
    });

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    assert
      .dom('[data-test-job-post-field] input[disabled]')
      .hasValue(
        'Backend Engineer (Ruby on Rails)',
        'the pre-filled job post renders read-only',
      );
    assert
      .dom('[data-test-company-field] input[disabled]')
      .hasValue('Toptal', 'the pre-filled company renders read-only');
  });

  test('a question that arrives with only a job application shows that application job post', async function (assert) {
    // job-posts/:jp/job-applications/:ja/questions/new builds the
    // question with the application and company but no job post of its
    // own, which used to render a blank read-only Job Post field.
    const store = this.owner.lookup('service:store');
    seed(store);
    stubFindRecord(store);
    this.question = store.createRecord('question', {
      jobApplication: store.peekRecord('job-application', 'ja1'),
      company: store.peekRecord('company', 'c1'),
    });

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    assert
      .dom('[data-test-job-post-field] input[disabled]')
      .hasValue(
        'Backend Engineer (Ruby on Rails)',
        'the job post is taken from the application rather than left blank',
      );
    assert
      .dom('[data-test-job-app-field] input[disabled]')
      .hasValue(
        'Backend Engineer (Ruby on Rails) — Applied',
        'the application itself stays locked',
      );
  });

  // ── FRON-126: the chain resolves but carries no company ──────────────

  test('an application whose job post has no company says so instead of going blank', async function (assert) {
    const store = this.owner.lookup('service:store');
    seedCompanyless(store);
    stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja9')],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Rails');
    await settled();
    await click(findContains('.ember-power-select-option', 'Senior Rails'));

    assert.strictEqual(
      this.question.belongsTo('jobPost').id(),
      'jp9',
      'the job post still comes along for free',
    );
    assert
      .dom('[data-test-company-dead-end]')
      .exists('the blank Company field is explained rather than left silent');
    assert
      .dom('[data-test-company-dead-end]')
      .includesText(
        'Senior Rails Engineer',
        'the notice names the post that is missing a company',
      );
    assert
      .dom('[data-test-company-field] .ember-power-select-trigger')
      .exists('the company picker stays live so the repair is reachable here');
  });

  test('an application whose job post already has a company back-fills with no new messaging', async function (assert) {
    // Regression guard: the notice must assert a fact about the record,
    // so it may never appear on the ordinary path.
    const store = this.owner.lookup('service:store');
    seed(store);
    stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja1')],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Backend');
    await settled();
    await click(
      findContains('.ember-power-select-option', 'Backend Engineer (Ruby'),
    );

    assert.strictEqual(this.question.belongsTo('company').id(), 'c1');
    assert
      .dom('[data-test-company-dead-end]')
      .doesNotExist('a post that has a company gets no notice');
  });

  test('choosing a company in that state writes it to the JOB POST, not just the question', async function (assert) {
    // The load-bearing assertion. Setting the company only on the
    // question labels this one answer and leaves the post broken for
    // every future use of it.
    const store = this.owner.lookup('service:store');
    seedCompanyless(store);
    seedNearDuplicateCompanies(store);
    stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja9')],
      company: [
        store.peekRecord('company', 'c1'),
        store.peekRecord('company', 'c2'),
      ],
    });
    const jobPost = store.peekRecord('job-post', 'jp9');
    let saves = 0;
    // The store is stubbed, so this proves the PATCH was ISSUED against
    // the job post with the right relationship — not its wire shape.
    jobPost.save = () => {
      saves += 1;
      return Promise.resolve(jobPost);
    };
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Rails');
    await settled();
    await click(findContains('.ember-power-select-option', 'Senior Rails'));

    await clickTrigger('[data-test-company-field]');
    await typeInSearch('Top');
    await settled();
    await click(findContains('.ember-power-select-option', 'Toptal'));

    assert.strictEqual(saves, 1, 'the job post was saved exactly once');
    assert.strictEqual(
      jobPost.belongsTo('company').id(),
      'c1',
      'the company landed on the job post itself',
    );
    assert.strictEqual(
      this.question.belongsTo('company').id(),
      'c1',
      'and on the question',
    );
    assert.strictEqual(
      this.question.belongsTo('jobPost').id(),
      'jp9',
      'picking a company did not throw away the job post being repaired',
    );
    assert.strictEqual(
      this.question.belongsTo('jobApplication').id(),
      'ja9',
      'nor the application',
    );
    assert
      .dom('[data-test-company-dead-end]')
      .doesNotExist('the notice clears once the post carries a company');
  });

  test('the company picker separates rows that display under the same name', async function (assert) {
    // Three near-duplicate "Toptal" rows exist. `Toptal, LLC` displays
    // as "Toptal", so name alone cannot tell them apart.
    const store = this.owner.lookup('service:store');
    seedNearDuplicateCompanies(store);
    stubQuery(store, {
      company: [
        store.peekRecord('company', 'c1'),
        store.peekRecord('company', 'c2'),
      ],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-company-field]');
    await typeInSearch('Top');
    await settled();

    assert.ok(
      findContains('.ember-power-select-option', 'Toptal, LLC'),
      'the row is shown by its real name',
    );
    assert.ok(
      findContains('.ember-power-select-option', 'displays as'),
      'and by the name it displays under, so the two are distinguishable',
    );
  });

  test('a company that is linked but not loaded is never declared missing', async function (assert) {
    // .value() reads null for "no company" and for "a company we haven't
    // fetched" alike. Announcing "this post has no company" about a post
    // that has one would be worse than the silence being fixed here, so
    // the notice is withheld whenever a company id is linked.
    //
    // Scope: this covers the DECISION. Whether the fetch then succeeds
    // is Ember Data's async belongsTo, which the stubbed store here does
    // not drive — the adapter below rejects so nothing reaches the
    // network and the failure path is exercised instead. A failed fetch
    // must also stay quiet: the link exists, we just couldn't follow it.
    const store = this.owner.lookup('service:store');
    store.push({
      data: [
        {
          type: 'job-post',
          id: 'jp8',
          attributes: { title: 'Platform Engineer' },
          relationships: {
            company: { data: { type: 'company', id: 'c7' } },
          },
        },
        {
          type: 'job-application',
          id: 'ja8',
          attributes: { status: 'Applied' },
          relationships: {
            jobPost: { data: { type: 'job-post', id: 'jp8' } },
          },
        },
      ],
    });
    this.owner.lookup('adapter:application').findRecord = () =>
      Promise.reject(new Error('company fetch failed'));
    stubQuery(store, {
      'job-application': [store.peekRecord('job-application', 'ja8')],
    });
    this.question = store.createRecord('question', {});

    await render(hbs`<Questions::Form @question={{this.question}} />`);

    await clickTrigger('[data-test-job-app-field]');
    await typeInSearch('Platform');
    await settled();
    await click(
      findContains('.ember-power-select-option', 'Platform Engineer'),
    );

    assert
      .dom('[data-test-company-dead-end]')
      .doesNotExist('an unloaded company is not a missing one');
    assert.strictEqual(
      this.question.belongsTo('company').id(),
      null,
      'and nothing was guessed onto the question in its place',
    );
  });
});
