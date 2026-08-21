const test = require('node:test');
const assert = require('node:assert/strict');
const { asDate, asText } = require('../src/utils/input-validation');

test('date parsing rejects null, blank, numeric, and invalid values', () => {
  assert.equal(asDate(null), null);
  assert.equal(asDate(''), null);
  assert.equal(asDate('   '), null);
  assert.equal(asDate(0), null);
  assert.equal(asDate('not-a-date'), null);
});

test('date parsing accepts ISO dates', () => {
  assert.equal(asDate('2026-09-15').toISOString(), '2026-09-15T00:00:00.000Z');
});

test('text parsing trims strings and rejects other types', () => {
  assert.equal(asText('  Project Alpha  '), 'Project Alpha');
  assert.equal(asText(null), '');
  assert.equal(asText(123), '');
});
