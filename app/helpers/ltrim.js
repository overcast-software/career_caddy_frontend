import { helper } from '@ember/component/helper';

export default helper(function ltrim([value]) {
  if (typeof value !== 'string') return value;
  return value.replace(/^\s+/, '');
});
