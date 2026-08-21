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
});
