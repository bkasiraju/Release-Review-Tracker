const test = require('node:test');
const assert = require('node:assert/strict');
const PlanIO = require('../public/plan-io.js');

test('write produces a zip with the expected parts and escapes cell text', () => {
  const b = PlanIO.write({ sheets: [{ name: 'Plan', header: true, rows: [['A'], ['x & <y>']], validations: [{ sqref: 'A2:A9', formula: 'Lists!$A$2:$A$3' }] }, { name: 'Lists', rows: [['L']] }] });
  assert.equal(b[0], 0x50); assert.equal(b[1], 0x4b);
  const text = Buffer.from(b).toString('latin1');
  for (const part of ['xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/styles.xml']) assert.ok(text.includes(part), part);
  assert.ok(text.includes('x &amp; &lt;y&gt;'));
  assert.ok(text.includes('<dataValidation type="list"'));
  const eocd = b.length - 22; assert.equal(b[eocd], 0x50); assert.equal(b[eocd + 10], 7);
});
