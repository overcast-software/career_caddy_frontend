import Component from '@glimmer/component';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import move from 'ember-animated/motions/move';
import { easeOut } from 'ember-animated/easings/cosine';

export default class ExperiencesListComponent extends Component {
  @service api;
  @service flashMessages;

  @tracked _localOrder = null;

  get experiences() {
    return this._localOrder ?? this.args.experiences ?? [];
  }

  get lastIndex() {
    return this.experiences.length - 1;
  }

  // ember-animated transition for reorders. `keptSprites` are items that
  // stayed but changed position; animate them to their new slot in
  // parallel.
  *reorderTransition({ keptSprites }) {
    yield Promise.all(
      keptSprites.map((sprite) => move(sprite, { easing: easeOut })),
    );
  }

  get chronologyWarnings() {
    // Reverse-chronological convention: exps[i].startDate should be <=
    // exps[i-1].startDate. Flag both rows of any inverted pair.
    const exps = this.experiences;
    const warnings = {};
    for (let i = 1; i < exps.length; i++) {
      const prev = exps[i - 1]?.startDate;
      const curr = exps[i]?.startDate;
      if (prev && curr && new Date(curr).getTime() > new Date(prev).getTime()) {
        warnings[exps[i - 1].id] = true;
        warnings[exps[i].id] = true;
      }
    }
    return warnings;
  }

  @action moveUp(index) {
    if (index <= 0) return;
    this._swap(index, index - 1);
  }

  @action moveDown(index) {
    const list = this.experiences;
    if (index >= list.length - 1) return;
    this._swap(index, index + 1);
  }

  _swap(a, b) {
    const list = [...this.experiences];
    [list[a], list[b]] = [list[b], list[a]];
    this._localOrder = list;
    this._persist(list);
  }

  _persist(list) {
    const resume = this.args.resume;
    if (!resume) return;
    const ids = list.map((e) => Number(e.id)).filter(Number.isFinite);
    fetch(`${this.api.baseUrl}resumes/${resume.id}/reorder-experiences/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
        ...this.api.headers(),
      },
      body: JSON.stringify({ experience_ids: ids }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Reorder failed (${res.status})`);
      })
      .catch((e) => {
        this.flashMessages.danger(e?.message ?? 'Reorder failed');
      });
  }
}
