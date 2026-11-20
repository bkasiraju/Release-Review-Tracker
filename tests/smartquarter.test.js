const test = require('node:test'), assert = require('node:assert');
const { fiscalQuarter } = require('../backend/plan');
test('fiscal quarter from release end date', () => {
  const c = { '2027-01-29': 'Q4', '2026-11-02': 'Q4', '2026-12-31': 'Q4', '2026-02-01': 'Q1', '2026-04-30': 'Q1', '2026-05-01': 'Q2', '2026-08-15': 'Q3', '2026-10-31': 'Q3', '': '', 'x': '' };
  for (const [d, q] of Object.entries(c)) assert.strictEqual(fiscalQuarter(d), q, d);
});
