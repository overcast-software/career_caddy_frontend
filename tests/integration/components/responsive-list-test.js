import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The CI browser can't resize, and both trees are in the DOM by design
// (CSS `md:hidden` / `hidden md:block` picks one at runtime). So these
// assertions check CLASS PRESENCE and DOM structure, not visibility.
module('Integration | Component | responsive-list', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.set('items', [
      { id: '1', title: 'Alpha', company: 'Acme' },
      { id: '2', title: 'Beta', company: 'Globex' },
    ]);
  });

  test('renders BOTH trees — a md:hidden card <ul> and a hidden md:block table', async function (assert) {
    await render(hbs`
      <ResponsiveList @items={{this.items}} @emptyMessage="Nothing here.">
        <:header as |h|>
          <h.col>Title</h.col>
          <h.col>Company</h.col>
        </:header>
        <:row as |item r|>
          <r.cell @primary={{true}}>{{item.title}}</r.cell>
          <r.cell @label="Company">{{item.company}}</r.cell>
        </:row>
      </ResponsiveList>
    `);

    // Card tree
    const cardList = this.element.querySelector('ul.md\\:hidden');
    assert.ok(cardList, 'card <ul> carries the md:hidden switch');
    assert.dom('ul.md\\:hidden > li').exists({ count: 2 }, 'one card per item');
    assert
      .dom('ul.md\\:hidden dl.grid')
      .exists({ count: 2 }, 'each card uses the labeled dl grid');

    // Table tree
    const tableWrap = this.element.querySelector('div.hidden.md\\:block');
    assert.ok(tableWrap, 'table wrapper carries the hidden md:block switch');
    assert.dom('div.hidden.md\\:block table').exists('a real table at ≥md');
    assert.dom('table thead th').exists({ count: 2 }, 'two header columns');
    assert.dom('table tbody tr').exists({ count: 2 }, 'one row per item');
  });

  test('@when=false drops the header col AND the paired cell in BOTH trees', async function (assert) {
    this.set('showCompany', false);
    await render(hbs`
      <ResponsiveList @items={{this.items}}>
        <:header as |h|>
          <h.col>Title</h.col>
          <h.col @when={{this.showCompany}}>Company</h.col>
        </:header>
        <:row as |item r|>
          <r.cell @primary={{true}}>{{item.title}}</r.cell>
          <r.cell @label="Company" @when={{this.showCompany}}>{{item.company}}</r.cell>
        </:row>
      </ResponsiveList>
    `);

    // Header lost its second column.
    assert.dom('table thead th').exists({ count: 1 }, 'gated header col gone');
    // Table rows carry only the primary cell.
    assert
      .dom('table tbody tr:first-child td')
      .exists({ count: 1 }, 'gated table cell gone');
    // Cards lost the Company dt/dd pair.
    assert
      .dom('ul.md\\:hidden')
      .doesNotContainText('Company', 'gated card label gone');
    assert
      .dom('ul.md\\:hidden')
      .doesNotContainText('Acme', 'gated card value gone');
  });

  test('@when defaults to true — an unset gate keeps the column', async function (assert) {
    await render(hbs`
      <ResponsiveList @items={{this.items}}>
        <:header as |h|>
          <h.col>Title</h.col>
          <h.col @when={{this.missing}}>Company</h.col>
        </:header>
        <:row as |item r|>
          <r.cell @primary={{true}}>{{item.title}}</r.cell>
          <r.cell @label="Company" @when={{this.missing}}>{{item.company}}</r.cell>
        </:row>
      </ResponsiveList>
    `);

    assert
      .dom('table thead th')
      .exists({ count: 2 }, 'undefined @when is treated as true');
  });

  test('@primary is the card title line and the font-medium table cell; @actions slots a bottom action row', async function (assert) {
    await render(hbs`
      <ResponsiveList @items={{this.items}}>
        <:header as |h|>
          <h.col>Title</h.col>
          <h.col @align="right">Actions</h.col>
        </:header>
        <:row as |item r|>
          <r.cell @primary={{true}}>{{item.title}}</r.cell>
          <r.cell @actions={{true}}>
            <button type="button" class="act">Go</button>
          </r.cell>
        </:row>
      </ResponsiveList>
    `);

    // Card: primary renders as a full-width title line, not a dt/dd pair.
    assert
      .dom('ul.md\\:hidden li:first-child .col-span-2.font-medium')
      .hasText('Alpha', 'primary is the card title line');
    // Card: actions render in a bordered bottom row holding the button.
    assert
      .dom('ul.md\\:hidden li:first-child .border-t button.act')
      .exists('actions slot into the card bottom row');

    // Table: primary cell is font-medium; header actions col is right-aligned.
    assert
      .dom('table tbody tr:first-child td.font-medium')
      .hasText('Alpha', 'primary is the font-medium table cell');
    assert
      .dom('table thead th:last-child')
      .hasClass('text-right', '@align="right" right-aligns the header col');
    assert
      .dom('table tbody tr:first-child td:last-child button.act')
      .exists('actions render inside the table row');
  });

  test('empty @items renders the EmptyState message and neither tree', async function (assert) {
    this.set('items', []);
    await render(hbs`
      <ResponsiveList @items={{this.items}} @emptyMessage="No job posts found.">
        <:header as |h|><h.col>Title</h.col></:header>
        <:row as |item r|><r.cell @primary={{true}}>{{item.title}}</r.cell></:row>
      </ResponsiveList>
    `);

    assert.dom(this.element).hasText('No job posts found.');
    assert.dom('table').doesNotExist('no table tree when empty');
    assert.dom('ul.md\\:hidden').doesNotExist('no card tree when empty');
  });
});
