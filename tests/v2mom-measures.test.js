const test = require('node:test'), assert = require('node:assert');
const { parseTab, parseRef } = require('../backend/v2mom-measures');
test('parseRef', () => {
  assert.deepStrictEqual(parseRef('HPS M6.2.2'), { key: 'HPS', code: '6.2.2' });
  assert.deepStrictEqual(parseRef('T&P 1.21'), { key: 'T&P', code: '1.21' });
  assert.deepStrictEqual(parseRef('T&P M5.1.1'), { key: 'T&P', code: '5.1.1' });
  assert.strictEqual(parseRef('Meir M5.3.5'), null);
});
test('parseTab reads HPS layout with T&I cross reference and skips headers', () => {
  const rows = [['M6. X'], ['HPS #', 'T&P / T&I V2MOM #', 'Measure', 'Primary Owner(s)', 'Clouds', 'Q1'],
    ['6.2', '', 'Managed Services Expansion', 'HEADER'],
    ['6.2.2', 'T&I 7.1.1', 'Achieve 100% VegaCache adoption\n\nmore', 'Amit Kumar', '', 'Y']];
  assert.deepStrictEqual(parseTab(rows, 'HPS'), { '6.2.2': { title: 'Achieve 100% VegaCache adoption', owner: 'Amit Kumar', xref: 'T&I 7.1.1' } });
});
test('parseTab reads T&P layout', () => {
  const rows = [['#', 'Measure', 'Primary Owner(s)', 'Clouds', 'Q1'], ['M5.1', 'Customers'], ['M5.1.1', 'Establish 15 Lighthouse', 'Kendall Collins']];
  assert.strictEqual(parseTab(rows, 'T&P')['5.1.1'].title, 'Establish 15 Lighthouse');
});
