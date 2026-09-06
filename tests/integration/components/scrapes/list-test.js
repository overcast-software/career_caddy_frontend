import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// scrapes/list is migrated onto <ResponsiveList>: both a card <ul> and a
// table live in the DOM at once (CSS picks one at md/768). The CI browser
// can't resize, so assert CLASS PRESENCE + DOM structure, not visibility.
module('Integration | Component | scrapes/list', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set('scrapes', [
      {
        id: '1',
        url: 'https://boards.greenhouse.io/acme/jobs/1234567890/very/long/path/that/must/truncate',
        status: 'completed',
        scrapedAt: new Date('2026-01-15T00:00:00Z'),
        company: { id: '5', name: 'Acme' },
        jobPost: { id: '20', title: 'Staff Engineer' },
      },
    ]);
  });

  test('renders BOTH trees — a md:hidden card <ul> and a hidden md:block table', async function (assert) {
    await render(hbs`<Scrapes::List @scrapes={{this.scrapes}} />`);

    assert
      .dom('ul.md\\:hidden > li')
      .exists({ count: 1 }, 'one card per scrape');
    assert.dom('div.hidden.md\\:block table').exists('a real table at ≥md');
    // Default columns: URL, Company, Job Post, Status, Scraped At, Actions.
    assert.dom('table thead th').exists({ count: 6 }, 'all six columns');
  });

  test('the URL is the card title and truncates rather than overflowing', async function (assert) {
    await render(hbs`<Scrapes::List @scrapes={{this.scrapes}} />`);

    // URL is the bold primary line; the anchor carries the truncate clamp so a
    // long URL never overflows the card at 390px.
    assert
      .dom('ul.md\\:hidden li:first-child .col-span-2.font-semibold a.truncate')
      .exists('url is the card title and is truncated');
    assert
      .dom('ul.md\\:hidden li:first-child a.truncate')
      .hasClass('max-w-xs', 'url anchor is width-clamped');
  });

  test('Retry works from a card', async function (assert) {
    let retried = null;
    this.set('retryScrape', (scrape) => {
      retried = scrape;
    });
    await render(
      hbs`<Scrapes::List @scrapes={{this.scrapes}} @onRetry={{this.retryScrape}} />`,
    );

    const cardRetry = this.element.querySelector(
      'ul.md\\:hidden li:first-child .border-t button',
    );
    assert.ok(cardRetry, 'a Retry button lives in the card action row');
    assert.strictEqual(
      cardRetry.textContent.trim(),
      'Retry',
      'the card action is the Retry button',
    );

    await click(cardRetry);
    assert.strictEqual(
      retried,
      this.scrapes[0],
      'clicking card Retry fires @onRetry with the scrape',
    );
  });
});
