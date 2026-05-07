import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { PROFESSION_OPTIONS } from 'career-caddy-frontend/components/resumes/title/form';

module('Integration | Component | resumes/title/form', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    await render(hbs`<Resumes::Title::Form />`);

    assert.dom().includesText('Title');
    assert.dom().includesText('Name');
    assert.dom().includesText('Notes');

    // Template block usage:
    await render(hbs`
      <Resumes::Title::Form>
        template block text
      </Resumes::Title::Form>
    `);

    assert.dom().includesText('template block text');
  });

  test('it renders the profession select with every canonical option', async function (assert) {
    await render(hbs`<Resumes::Title::Form />`);

    assert.dom('select[name="profession"]').exists();
    // Placeholder + every canonical archetype.
    assert
      .dom('select[name="profession"] option')
      .exists({ count: PROFESSION_OPTIONS.length + 1 });
    for (const option of PROFESSION_OPTIONS) {
      assert.dom('select[name="profession"]').includesText(option);
    }
  });

  test('profession defaults to the placeholder when resume.profession is unset', async function (assert) {
    this.set('resume', { profession: null });
    await render(hbs`<Resumes::Title::Form @resume={{this.resume}} />`);

    assert.dom('select[name="profession"]').hasValue('');
  });

  test('profession reflects resume.profession on first render', async function (assert) {
    this.set('resume', { profession: 'Product Management' });
    await render(hbs`<Resumes::Title::Form @resume={{this.resume}} />`);

    assert.dom('select[name="profession"]').hasValue('Product Management');
  });

  test('changing the select writes through to the resume', async function (assert) {
    const resume = { profession: null };
    this.set('resume', resume);
    await render(hbs`<Resumes::Title::Form @resume={{this.resume}} />`);

    await fillIn('select[name="profession"]', 'Data / BI');
    assert.strictEqual(resume.profession, 'Data / BI');
  });

  test('selecting the placeholder option clears profession to null', async function (assert) {
    const resume = { profession: 'Marketing' };
    this.set('resume', resume);
    await render(hbs`<Resumes::Title::Form @resume={{this.resume}} />`);

    await fillIn('select[name="profession"]', '');
    assert.strictEqual(resume.profession, null);
  });
});
