import { setupTest } from 'career-caddy-frontend/tests/helpers';
import { module, test } from 'qunit';

const DAY_MS = 24 * 60 * 60 * 1000;

module('Unit | Model | invitation', function (hooks) {
  setupTest(hooks);

  test('it exists', function (assert) {
    const store = this.owner.lookup('service:store');
    const model = store.createRecord('invitation', {});
    assert.ok(model, 'model exists');
  });

  test('status derives from acceptedAt / expiresAt', function (assert) {
    const store = this.owner.lookup('service:store');
    // store.push() takes ALREADY-normalized data: camelCase keys AND
    // post-transform values. Transforms run in the serializer's
    // normalize pass, not in push — an ISO *string* here would stay a
    // string, and `new Date() > '2026-…'` coerces to NaN and silently
    // reads as `pending`. The api's snake_case `expires_at` only
    // appears on the ajax-response side below, which does go through
    // normalizeResponse and does get the date transform.
    store.push({
      data: {
        type: 'invitation',
        id: '800',
        attributes: { expiresAt: new Date(Date.now() - DAY_MS) },
      },
    });
    assert.strictEqual(
      store.peekRecord('invitation', '800').status,
      'expired',
      'a past expiry reads as expired',
    );
  });

  // resend() is bucket 1 — a verb on a resource through apiAction, so
  // it inherits the adapter's ensureFreshToken preflight and the
  // 401 → refresh → retry. It used to be a hand-built fetch in
  // app/controllers/admin/invitations.js with a hand-set Authorization
  // header, which forfeited both: on an expired JWT the admin got a
  // hard failure where every other verb transparently recovers.
  module('apiAction verbs', function (hooks) {
    hooks.beforeEach(function () {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('invitation');
      this.ajaxCalls = [];
      this.ajaxResponse = { data: null };
      adapter.ajax = (url, method, options) => {
        this.ajaxCalls.push({ url, method, options });
        return Promise.resolve(this.ajaxResponse);
      };
    });

    test('resend() POSTs with no payload to /invitations/:id/resend/', async function (assert) {
      const store = this.owner.lookup('service:store');
      store.push({
        data: {
          type: 'invitation',
          id: '900',
          attributes: { email: 'invitee@example.com' },
        },
      });
      const invitation = store.peekRecord('invitation', '900');
      await invitation.resend();

      assert.strictEqual(this.ajaxCalls.length, 1);
      assert.strictEqual(this.ajaxCalls[0].method, 'POST');
      assert.true(
        this.ajaxCalls[0].url.endsWith('/invitations/900/resend/'),
        `URL ${this.ajaxCalls[0].url} ends with the verb path`,
      );
      assert.strictEqual(
        this.ajaxCalls[0].options,
        undefined,
        'no body — resend takes no payload',
      );
    });

    test('resend() auto-pushes the refreshed expiry onto the live record', async function (assert) {
      // This is why the controller no longer follows resend() with
      // store.findAll('invitation', { reload: true }). The api returns
      // the updated Invitation resource, apiAction pushes it, and the
      // record the admin table is already rendering flips expired →
      // pending on its own — no collection refetch.
      const store = this.owner.lookup('service:store');
      store.push({
        data: {
          type: 'invitation',
          id: '901',
          attributes: {
            email: 'invitee@example.com',
            expiresAt: new Date(Date.now() - DAY_MS),
          },
        },
      });
      const invitation = store.peekRecord('invitation', '901');
      assert.strictEqual(invitation.status, 'expired', 'starts expired');

      const renewed = new Date(Date.now() + 7 * DAY_MS).toISOString();
      this.ajaxResponse = {
        data: {
          type: 'invitation',
          id: '901',
          attributes: {
            email: 'invitee@example.com',
            expires_at: renewed,
          },
        },
      };

      const resolved = await invitation.resend();

      assert.strictEqual(
        resolved,
        invitation,
        'resolves to the same identity-mapped record the table renders',
      );
      assert.strictEqual(
        invitation.status,
        'pending',
        'the pushed expiry flips status without a findAll',
      );
    });
  });
});
