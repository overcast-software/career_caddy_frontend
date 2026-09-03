import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';
import Service from '@ember/service';

// Cross-repo contract pin — the `duplicate:` status-note prefix.
//
// `app/controllers/job-posts/new/paste.js` decides whether a finished
// scrape produced a NEW job post or landed on one the user already
// owns by string-matching the scrape's latest status note:
//
//     note.startsWith('duplicate:')
//
// Nothing on either side pins that literal — no shared constant, no
// schema, no api validation. It is written as prose, in two different
// repositories, by two different producers:
//
//   1. api/job_hunting/lib/parsers/job_post_extractor.py, in
//      parse_scrape:      f"duplicate: existing JobPost #{jp_id}"
//      This is the one the paste form actually hits — /scrapes/from-text/
//      is parsed api-side, no browser involved.
//
//   2. agents/scrape_graph/nodes_scrape.py, in the DuplicateShortCircuit
//      node:              f"duplicate: job_post {state.job_post_id}"
//      The browser-scrape path, which lands on the same controller when
//      a paste carries a link the graph then dedupes.
//
// Rename the prefix on either side and this branch silently stops
// firing: the user who pasted a job post they already own is told
// "Job post created.", a second row looks freshly minted, and no test,
// type, or lint rule goes red. Both writers are pinned by tests in
// their own repos (api: tests/test_job_post_extractor.py); this is the
// reader's half. If you change the prefix, all three move together.
const NOTE_FROM_API = 'duplicate: existing JobPost #9';
const NOTE_FROM_AGENTS = 'duplicate: job_post jp-9';

class FakePollable extends Service {
  constructor() {
    super(...arguments);
    this.polls = [];
  }

  // The controller hands over its terminal callbacks and walks away.
  // The tests drive onComplete themselves rather than running the real
  // backoff loop against a stubbed adapter.
  poll(record, options) {
    this.polls.push({ record, options });
  }
}

class FakeSpinner extends Service {
  begin() {}
  end() {}
}

class FakeRouter extends Service {
  constructor() {
    super(...arguments);
    this.transitions = [];
  }
  transitionTo(...args) {
    this.transitions.push(args);
  }
}

class FakeFlash extends Service {
  constructor() {
    super(...arguments);
    this.calls = [];
  }
  info(...args) {
    this.calls.push(['info', ...args]);
  }
  danger(...args) {
    this.calls.push(['danger', ...args]);
  }
  success(...args) {
    this.calls.push(['success', ...args]);
  }
  warning(...args) {
    this.calls.push(['warning', ...args]);
  }
  clearMessages() {}
}

function messagesOfType(flash, type) {
  return flash.calls.filter((c) => c[0] === type).map((c) => c[1]);
}

// Spin the microtask queue until the controller has walked
// `ScrapeModel.fromText(...).then(...)` all the way to `scrape.poll()`.
// Counting individual ticks would break the moment an `await` is added
// to or removed from collectionAction.
async function waitForPoll(pollable) {
  for (let i = 0; i < 50; i++) {
    if (pollable.polls.length) return pollable.polls[0];
    await Promise.resolve();
  }
  throw new Error('controller never started polling the created scrape');
}

module('Unit | Controller | job-posts/new/paste', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:pollable', FakePollable);
    this.owner.register('service:spinner', FakeSpinner);
    this.owner.register('service:router', FakeRouter);
    this.owner.register('service:flash-messages', FakeFlash);

    this.store = this.owner.lookup('service:store');
    this.pollable = this.owner.lookup('service:pollable');
    this.router = this.owner.lookup('service:router');
    this.flash = this.owner.lookup('service:flash-messages');

    // Stand in for POST /scrapes/from-text/ so ScrapeModel.fromText
    // resolves to a real store-backed record, the way the live
    // collectionAction path does.
    this.store.adapterFor('scrape').ajax = () =>
      Promise.resolve({
        data: { type: 'scrape', id: '7001', attributes: {} },
      });

    this.controller = this.owner.lookup('controller:job-posts/new/paste');
  });

  // Run the paste submit through to the poller's onComplete callback,
  // handing it a scrape carrying `note` and linked to a JobPost — the
  // state the api leaves behind when a scrape reaches `completed`.
  async function completeScrapeWithNote(context, note) {
    context.controller.text = 'Senior Widget Engineer\nWidgets Inc.\n…';
    context.controller.submitPaste({ preventDefault() {} });

    const { record, options } = await waitForPoll(context.pollable);
    // Stand in for the reload the pollable service does on each tick:
    // the completed row carries the status note and the JobPost link.
    context.store.push({
      data: {
        type: 'scrape',
        id: '7001',
        attributes: { latestStatusNote: note },
        relationships: { jobPost: { data: { type: 'job-post', id: 'jp-9' } } },
      },
    });
    options.onComplete(record);
    return record;
  }

  function assertTookDuplicateBranch(assert, context) {
    assert.deepEqual(
      messagesOfType(context.flash, 'warning'),
      ['You already have a job post for this link.'],
      'the duplicate branch fires on the `duplicate:` prefix',
    );
    assert.deepEqual(
      messagesOfType(context.flash, 'success'),
      [],
      'and the "Job post created." success copy is suppressed',
    );
  }

  test('the api-side note ("duplicate: existing JobPost #N") takes the duplicate branch', async function (assert) {
    await completeScrapeWithNote(this, NOTE_FROM_API);

    assertTookDuplicateBranch(assert, this);
    assert.deepEqual(
      this.router.transitions[0],
      ['job-posts.show.scrapes.show', 'jp-9', '7001'],
      'the user still lands on the scrape detail under the existing post',
    );
  });

  test('the agents-side note ("duplicate: job_post <id>") takes the same branch', async function (assert) {
    await completeScrapeWithNote(this, NOTE_FROM_AGENTS);

    assertTookDuplicateBranch(assert, this);
  });

  test('a note without the prefix falls through to the created-post path', async function (assert) {
    // Any other completion note the pipeline writes must not be read as
    // a dedupe hit. `Parsed successfully` is the api's own default.
    await completeScrapeWithNote(this, 'Parsed successfully');

    assert.deepEqual(
      messagesOfType(this.flash, 'success'),
      ['Job post created.'],
      'the fallthrough reports a freshly created post',
    );
    assert.deepEqual(
      messagesOfType(this.flash, 'warning'),
      [],
      'and no duplicate warning is raised',
    );
  });
});
