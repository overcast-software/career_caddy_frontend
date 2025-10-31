import { helper } from '@ember/component/helper';

export default helper(function truncate([value, limit = 300]) {
  if (value == null) return '';
  if (typeof value !== 'string') return String(value);

  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;

  // Find last whitespace before limit
  const cutPoint = trimmed.lastIndexOf(' ', limit);
  if (cutPoint > 0) {
    return trimmed.substring(0, cutPoint) + '…';
  }

  // No whitespace found, cut at limit
  return trimmed.substring(0, limit) + '…';
});
