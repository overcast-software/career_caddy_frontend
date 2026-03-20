import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import ArrayProxy from '@ember/array/proxy';
export default class CompaniesIndexController extends Controller {
  @service flashMessages;
  @service store;
  @tracked query = '';

  onInput = (event) => {
    this.query = event?.target?.value ?? '';
  };

  get companies() {
    const source = this.model;
    const list = ArrayProxy.create({ content: source });
    const q = this.query.trim().toLowerCase();
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

  @action async deleteCompany(company) {
    console.log(company);
    const name = company.name;
    try {
      await company.destroyRecord();
      this.flashMessages.success(`deleted ${name}`);
    } catch {
      this.flashMessages.danger('Failed to delete company');
    }
  }

  get sortedCompanies() {
    const list = this.model;
    if (!list || typeof list.length !== 'number') return [];
    const copy = Array.prototype.slice.call(list);
    return copy.sort((a, b) => {
      const an = Number(a.id);
      const bn = Number(b.id);
      if (Number.isFinite(an) && Number.isFinite(bn)) {
        // numeric descending
        return bn - an;
      }
      // Fallback: string compare descending when IDs aren't numeric
      return String(a.id).localeCompare(String(b.id)) * -1;
    });
  }
}
