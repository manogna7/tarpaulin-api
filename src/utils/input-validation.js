function asText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function asDate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && !value.trim()) return null;
  if (!(typeof value === 'string' || value instanceof Date)) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = {
  asDate,
  asText,
};
