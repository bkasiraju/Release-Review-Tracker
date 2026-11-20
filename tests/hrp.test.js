const test = require('node:test'), assert = require('node:assert/strict');
const hrp = require('../backend/hrp');

test('HRP measures are numbered by group and position, skipping group headers', async () => {
  const rows = [
    { MeasureName__c: '<p>Engineering (group header)</p>', MeasureGroupId__c: '1.1' },
    { MeasureName__c: 'HRP meets goals\n\n- Security bugs\n- Availability\n\nSecurity Bugs:\n- Track 1', MeasureGroupId__c: '1.1', Measure_Owners__c: 'A B, C D', Status__c: 'On Track', Method__r: { Name: 'M1' } },
    { MeasureName__c: 'Availability &amp; SLO\n1) No Sev0s', MeasureGroupId__c: '1.1' },
    { MeasureName__c: 'Next group', MeasureGroupId__c: '1.2' }
  ];
  const m = hrp.parse(rows);
  assert.deepEqual(Object.keys(m), ['1.1.1', '1.1.2', '1.2.1']);
  assert.equal(m['1.1.1'].title, 'HRP meets goals');
  assert.match(m['1.1.1'].body, /^- Security bugs/);
  assert.deepEqual(m['1.1.1'].owners, ['A B', 'C D']);
  assert.equal(m['1.1.2'].title, 'Availability & SLO');
  const sf = { query: async q => { assert.match(q, /HRP FY27 V2MOM/); return { records: rows }; } };
  assert.ok((await hrp.getMeasures(sf, true)).measures['1.1.1']);
});
