import { module, test } from 'qunit';
import { sanitizeAppHref } from 'career-caddy-frontend/components/chat/message';

module('Unit | Component | chat/message | sanitizeAppHref', function () {
  test('passes through bare app paths unchanged', function (assert) {
    assert.strictEqual(sanitizeAppHref('/job-posts/1'), '/job-posts/1');
    assert.strictEqual(
      sanitizeAppHref('/questions/7/answers/19'),
      '/questions/7/answers/19',
    );
  });

  test('strips hallucinated hostname + scheme for app routes', function (assert) {
    assert.strictEqual(
      sanitizeAppHref('example.com/job-posts/1'),
      '/job-posts/1',
    );
    assert.strictEqual(
      sanitizeAppHref('https://example.com/job-posts/1/questions/7'),
      '/job-posts/1/questions/7',
    );
    assert.strictEqual(
      sanitizeAppHref('http://careercaddy.online/resumes/42'),
      '/resumes/42',
    );
  });

  test('returns null for genuinely external URLs (not app routes)', function (assert) {
    assert.strictEqual(
      sanitizeAppHref('https://linkedin.com/jobs/view/123'),
      null,
    );
    assert.strictEqual(sanitizeAppHref('https://google.com/search'), null);
  });

  test('returns null for empty or non-string input', function (assert) {
    assert.strictEqual(sanitizeAppHref(''), null);
    assert.strictEqual(sanitizeAppHref(null), null);
    assert.strictEqual(sanitizeAppHref(undefined), null);
    assert.strictEqual(sanitizeAppHref(42), null);
  });
});
