import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The modifier listens on the nearest `.course-main` ancestor because the app
// shell makes that the scroller and the window never scrolls. So the fixture
// has to be a REAL scroller: a fixed height with taller content, or scrollTop
// silently stays 0 and every assertion passes for the wrong reason.
//
// `media="all"` because the default gate is phone-only and the test browser
// is not a phone; the mechanics under test are the same at any width.
const SCROLLER = hbs`
  <div class="course-main" style="height:100px;overflow-y:auto" data-test-scroller>
    <div class="tee-box" {{hide-on-scroll media="all"}} data-test-bar></div>
    <div style="height:2000px"></div>
  </div>
`;

const HIDDEN = '-translate-y-full';

function scrollTo(scroller, top) {
  scroller.scrollTop = top;
  scroller.dispatchEvent(new Event('scroll'));
  return settled();
}

module('Integration | Modifier | hide-on-scroll', function (hooks) {
  setupRenderingTest(hooks);

  test('installs the transition classes and starts visible', async function (assert) {
    await render(SCROLLER);

    assert.dom('[data-test-bar]').hasClass('transition-transform');
    assert
      .dom('[data-test-bar]')
      .doesNotHaveClass(HIDDEN, 'visible on first paint');
  });

  test('the fixture actually scrolls', async function (assert) {
    await render(SCROLLER);
    const scroller = this.element.querySelector('[data-test-scroller]');

    scroller.scrollTop = 200;
    assert.strictEqual(
      scroller.scrollTop,
      200,
      'scrollTop sticks — otherwise the rest of this module is vacuous',
    );
  });

  test('hides on scroll-down and returns on scroll-up', async function (assert) {
    await render(SCROLLER);
    const scroller = this.element.querySelector('[data-test-scroller]');

    await scrollTo(scroller, 200);
    assert.dom('[data-test-bar]').hasClass(HIDDEN, 'hidden after scroll-down');

    await scrollTo(scroller, 100);
    assert
      .dom('[data-test-bar]')
      .doesNotHaveClass(HIDDEN, 'back after scroll-up');
  });

  test('ignores movement below the threshold', async function (assert) {
    await render(SCROLLER);
    const scroller = this.element.querySelector('[data-test-scroller]');

    await scrollTo(scroller, 4);
    assert
      .dom('[data-test-bar]')
      .doesNotHaveClass(HIDDEN, '4px of jitter is not a gesture');
  });

  test('stays visible while still near the top', async function (assert) {
    await render(SCROLLER);
    const scroller = this.element.querySelector('[data-test-scroller]');

    // Past the 8px threshold but not past the 24px reveal-above floor, so a
    // short page does not flicker its subnav away on the first flick.
    await scrollTo(scroller, 16);
    assert.dom('[data-test-bar]').doesNotHaveClass(HIDDEN);
  });

  test('honours an explicit threshold', async function (assert) {
    await render(hbs`
      <div class="course-main" style="height:100px;overflow-y:auto" data-test-scroller>
        <div class="tee-box" {{hide-on-scroll threshold=300 media="all"}} data-test-bar></div>
        <div style="height:2000px"></div>
      </div>
    `);
    const scroller = this.element.querySelector('[data-test-scroller]');

    await scrollTo(scroller, 200);
    assert
      .dom('[data-test-bar]')
      .doesNotHaveClass(HIDDEN, '200px is below a 300px threshold');

    await scrollTo(scroller, 600);
    assert.dom('[data-test-bar]').hasClass(HIDDEN);
  });

  test('never hides while the media query does not match', async function (assert) {
    await render(hbs`
      <div class="course-main" style="height:100px;overflow-y:auto" data-test-scroller>
        <div class="tee-box" {{hide-on-scroll media="not all"}} data-test-bar></div>
        <div style="height:2000px"></div>
      </div>
    `);
    const scroller = this.element.querySelector('[data-test-scroller]');

    await scrollTo(scroller, 200);
    assert
      .dom('[data-test-bar]')
      .doesNotHaveClass(
        HIDDEN,
        'phone-only by default: a non-matching query leaves the bar in place',
      );
  });

  test('is inert when there is no scroller to listen on', async function (assert) {
    await render(
      hbs`<div class="tee-box" {{hide-on-scroll}} data-test-bar></div>`,
    );

    assert
      .dom('[data-test-bar]')
      .doesNotHaveClass(
        'transition-transform',
        'no scroller found → nothing wired up, bar left permanently visible',
      );
    assert.dom('[data-test-bar]').doesNotHaveClass(HIDDEN);
  });
});
