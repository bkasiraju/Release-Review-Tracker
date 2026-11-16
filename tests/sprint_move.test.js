'use strict';
const test = require('node:test'), assert = require('node:assert');
const sprint = require('../backend/sprint');
const T = '0Z1000000000001', S1 = 'a0F000000000001', S2 = 'a0F000000000002';
const mk = () => {
  const updates = [];
  return { updates, query: async q => ({ done: true, records:
    q.includes('FROM ADM_Sprint__c') && q.includes(`Id = '${S1}'`) ? [{ Id: S1, Name: 'S1', Start_Date__c: '2026-11-01' }]
    : q.includes('FROM ADM_Sprint__c') ? [{ Id: S2, Name: 'S2' }]
    : [{ Id: 'a07000000000001', Name: 'W-1', Status__c: 'In Progress' }, { Id: 'a07000000000002', Name: 'W-2', Status__c: 'Closed' }] }),
    update: async (o, id, d) => { updates.push([o, id, d]); return { success: true }; } };
};
test('moves only open items to the next sprint', async () => {
  const sf = mk();
  const r = await sprint.moveToNextSprint(sf, T, S1, ['a07000000000001', 'a07000000000002']);
  assert.deepStrictEqual(sf.updates, [['ADM_Work__c', 'a07000000000001', { Sprint__c: S2 }]]);
  assert.equal(r.skipped, 1); assert.equal(r.moved.length, 1); assert.equal(r.next.Id, S2);
});
test('rejects bad ids', async () => {
  await assert.rejects(sprint.moveToNextSprint(mk(), T, S1, ["x' OR 1=1"]));
});
