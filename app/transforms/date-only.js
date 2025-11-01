import Transform from '@ember-data/serializer/transform';

export default class DateOnlyTransform extends Transform {
  serialize(date) {
    if (!date) return null;

    // Ensure we have a Date object
    if (!(date instanceof Date)) return null;

    // Format as YYYY-MM-DD using local date parts
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  deserialize(value) {
    if (!value) return null;

    // If already a Date, return as-is
    if (value instanceof Date) return value;

    // Parse YYYY-MM-DD string and create local date
    if (typeof value === 'string') {
      const [year, month, day] = value.split('-').map(Number);
      if (year && month && day) {
        return new Date(year, month - 1, day);
      }
    }

    return null;
  }
}
