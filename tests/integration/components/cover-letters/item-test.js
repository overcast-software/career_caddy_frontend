import { module, test } from 'qunit';
import { setupRenderingTest } from 'career-caddy-frontend/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
module('Integration | Component | cover-letters/item', function (hooks) {
  setupRenderingTest(hooks);

  test('it renders', async function (assert) {
    // Set any properties with this.set('myProperty', 'value');
    // Handle any actions with this.set('myAction', function(val) { ... });

    this.coverLetter = {
      resume: {
        name: 'resume Name',
      },
      jobPost: {
        title: 'jobPost title',
        company: {
          name: 'company Name',
        },
      },
      content: 'cover letter content',
    };

    await render(hbs`<CoverLetters::Item @coverLetter={{this.coverLetter}}/>`);

    assert.dom('article.panel-card').exists();
    assert
      .dom('article.panel-card')
      .hasText(
        'Cover Letter for resume: resume Name for jobpost: jobPost title at company Name Export to DOCX cover letter content',
      );

    // We don't use yield
    // Template block usage:
    // await render(hbs`
    //   <CoverLetters::Item>
    //     template block text
    //   </CoverLetters::Item>
    // `);

    // assert.dom().hasText('template block text');
  });
});
