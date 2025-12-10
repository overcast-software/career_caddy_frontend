import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import ArrayProxy from '@ember/array/proxy';

export default class CompaniesListComponent extends Component {
  @tracked query = '';

  onInput = (event) => {
    this.query = event?.target?.value ?? '';
  };

  get companies() {
    const source = this.args.companies ?? [];
    const list = ArrayProxy.create({ content: source });

    const q = ((this.args.query ?? this.query) ?? '').trim().toLowerCase();

    let filteredList = list;

    if (q) {
      filteredList = list.filter((company) => {
        const searchableText = [
          company.get ? company.get('displayName') : company.displayName,
          company.get ? company.get('name') : company.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(q);
      });
    }

    const items = Array.isArray(filteredList)
      ? filteredList
      : filteredList?.toArray
      ? filteredList.toArray()
      : [];

    items.sort((a, b) => {
      const an =
        (a.get ? a.get('name') : a.name) ||
        (a.get ? a.get('displayName') : a.displayName) ||
        '';
      const bn =
        (b.get ? b.get('name') : b.name) ||
        (b.get ? b.get('displayName') : b.displayName) ||
        '';
      return an.localeCompare(bn);
    });

    return items;
  }
}
