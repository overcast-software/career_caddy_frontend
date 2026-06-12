import Model, { attr, belongsTo } from '@ember-data/model';

// One row per name variant for a Company. Phase A dedupe redesign —
// the api maintains aliases via the extractor (source='extraction'),
// staff manual additions (source='manual'), and the one-shot
// migration backfill of existing Company.name (source='backfill').
//
// name_slug is globally unique on the api side (see
// CompanyAlias migration 0098): two Companies that slug the same
// indicate a duplicate that needs human resolution via the
// merge-into endpoint, surfaced from /admin/companies/:id.
export default class CompanyAliasModel extends Model {
  @attr('string') name;
  @attr('string') nameSlug;
  @attr('string') source;
  @attr('date') createdAt;
  // Inverse intentionally ``null`` until Company re-declares the
  // ``aliases`` hasMany (blocked on the api shipping the
  // CompanySerializer relationship + sub-collection endpoint). See
  // app/models/company.js for the loop reproducer.
  @belongsTo('company', { async: true, inverse: null }) company;
}
