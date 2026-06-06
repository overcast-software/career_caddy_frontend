import { module, test } from 'qunit';
import { setupTest } from 'career-caddy-frontend/tests/helpers';

/** Build a fake fetch Response whose body streams the given chunks as
 *  SSE `data:` lines. Each event is a JSON object serialized onto one
 *  line, matching the wire shape the chat server emits. */
function fakeSSEResponse(events) {
  const encoder = new TextEncoder();
  const lines = events.map((e) => `data: ${JSON.stringify(e)}\n`).join('');
  const chunks = [encoder.encode(lines)];
  let i = 0;
  const reader = {
    read() {
      if (i >= chunks.length) return Promise.resolve({ done: true });
      const value = chunks[i++];
      return Promise.resolve({ done: false, value });
    },
  };
  return {
    ok: true,
    status: 200,
    body: { getReader: () => reader },
  };
}

module('Unit | Service | chat', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.service = this.owner.lookup('service:chat');

    // Stub session — sendMessage calls ensureFreshToken + reads
    // authorizationHeader before issuing the fetch. isAuthenticated
    // must be truthy: the service short-circuits unauthed sends with a
    // friendly "log in first" message and never touches fetch.
    this.service.session = {
      isAuthenticated: true,
      ensureFreshToken: () => Promise.resolve(),
      authorizationHeader: 'Bearer test-token',
    };

    // Stub router to record transitions without actually transitioning.
    this.transitions = [];
    this.service.router = {
      transitionTo: (path) => {
        this.transitions.push(path);
        return Promise.resolve();
      },
    };

    // Stub currentUser so _onboardingSnapshot doesn't blow up.
    this.service.currentUser = { onboarding: null };

    // Replace global fetch with a per-test stub.
    this.originalFetch = globalThis.fetch;
  });

  hooks.afterEach(function () {
    globalThis.fetch = this.originalFetch;
  });

  test('pure-navigate stream removes empty assistant placeholder (no literal fallback)', async function (assert) {
    // The reported regression: stream contained ONLY a navigate marker.
    // After the strip block, accumulated is "" and the old `if
    // (!accumulated)` guard would overwrite with the literal fallback
    // string just before the route transition fired.
    globalThis.fetch = () =>
      Promise.resolve(
        fakeSSEResponse([
          {
            type: 'TEXT_MESSAGE_CONTENT',
            delta: '<!-- navigate:/job-posts/42 -->',
          },
          { type: 'RUN_FINISHED' },
        ]),
      );

    await this.service.sendMessage('take me to job 42');

    // User message stays; the assistant placeholder is dropped because
    // the route transition IS the response.
    assert.strictEqual(
      this.service.messages.length,
      1,
      'only user message remains',
    );
    assert.strictEqual(this.service.messages[0].role, 'user');
    assert.deepEqual(this.transitions, ['/job-posts/42'], 'navigation fired');

    // Most important assertion: the literal must NOT have leaked into
    // any rendered message.
    const fallbackLeaked = this.service.messages.some((m) =>
      (m.content || '').includes('(no response from agent)'),
    );
    assert.false(fallbackLeaked, 'fallback literal did not flash');
  });

  test('navigate mixed with text keeps the text and navigates', async function (assert) {
    // Sibling case: the assistant said something AND included a
    // navigate marker. After strip, accumulated still has content, so
    // the placeholder is replaced with the visible text.
    globalThis.fetch = () =>
      Promise.resolve(
        fakeSSEResponse([
          { type: 'TEXT_MESSAGE_CONTENT', delta: 'Heading to job 42.' },
          {
            type: 'TEXT_MESSAGE_CONTENT',
            delta: ' <!-- navigate:/job-posts/42 -->',
          },
          { type: 'RUN_FINISHED' },
        ]),
      );

    await this.service.sendMessage('take me to job 42');

    assert.strictEqual(this.service.messages.length, 2, 'user + assistant');
    const assistant = this.service.messages[1];
    assert.strictEqual(assistant.role, 'assistant');
    assert.strictEqual(
      assistant.content,
      'Heading to job 42.',
      'text kept, marker stripped',
    );
    assert.deepEqual(this.transitions, ['/job-posts/42']);
  });

  test('truly empty stream falls back to the literal with conversation_id when known', async function (assert) {
    // Path (1) from the work item: the agent emitted no text events at
    // all. The fallback should stay (otherwise the user sees a blank
    // bubble) but it should carry the conversation_id so the operator
    // can root-cause server-side.
    globalThis.fetch = () =>
      Promise.resolve(
        fakeSSEResponse([
          {
            type: 'CUSTOM',
            name: 'session_meta',
            value: { conversation_id: 'conv-abc' },
          },
          { type: 'RUN_FINISHED' },
        ]),
      );

    await this.service.sendMessage('hello?');

    assert.strictEqual(this.service.messages.length, 2, 'user + assistant');
    const assistant = this.service.messages[1];
    assert.strictEqual(assistant.role, 'assistant');
    assert.strictEqual(
      assistant.content,
      "(no response from agent) (conversation conv-abc) — it's safe to try again.",
      'fallback carries conversation id for debug + reassurance',
    );
    assert.deepEqual(this.transitions, [], 'no navigation fired');
  });

  test('truly empty stream with no conversation_id keeps the bare fallback', async function (assert) {
    globalThis.fetch = () =>
      Promise.resolve(fakeSSEResponse([{ type: 'RUN_FINISHED' }]));

    await this.service.sendMessage('hello?');

    const assistant = this.service.messages[1];
    assert.strictEqual(
      assistant.content,
      "(no response from agent) — it's safe to try again.",
    );
  });

  test('unauthed send short-circuits with the friendly log-in copy and never touches fetch', async function (assert) {
    // Doug 2026-06-06: chat panel rendered on signup; users tried to send
    // and got a long hang before the api 401 surfaced. The defense-in-
    // depth short-circuit answers locally so there is no network at all.
    this.service.session.isAuthenticated = false;
    let fetched = false;
    globalThis.fetch = () => {
      fetched = true;
      return Promise.resolve(fakeSSEResponse([{ type: 'RUN_FINISHED' }]));
    };

    await this.service.sendMessage('can you help me?');

    assert.notOk(fetched, 'fetch was never called');
    const assistant = this.service.messages[1];
    assert.ok(
      assistant.content.includes('need you to log in first'),
      'shows the log-in copy',
    );
    assert.notOk(this.service.isStreaming, 'streaming flag stays false');
  });

  test('truly empty stream attaches a Retry elicitation carrying the original message', async function (assert) {
    // The operator-facing affordance from the no-response fallback work
    // item: a Retry button that re-sends what the user just typed,
    // routed through the existing elicitation rendering path
    // (Chat::Message already renders elicitation.actions as buttons and
    // dispatches {message: ...} actions back through chat.sendMessage).
    globalThis.fetch = () =>
      Promise.resolve(fakeSSEResponse([{ type: 'RUN_FINISHED' }]));

    await this.service.sendMessage('what jobs do I have open?');

    const assistant = this.service.messages[1];
    assert.ok(assistant.elicitation, 'elicitation attached');
    assert.deepEqual(
      assistant.elicitation.actions,
      [{ label: 'Retry', message: 'what jobs do I have open?' }],
      'retry carries the original user message verbatim',
    );
  });
});
