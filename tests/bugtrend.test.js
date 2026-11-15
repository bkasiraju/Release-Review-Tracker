'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {__test}=require('../backend/hub');
test('bug trend buckets weekly and rebuilds backlog',()=>{
  const now=Date.parse('2026-11-18T12:00:00Z');
  const w=__test.computeBugTrend(['2026-11-17T01:00:00Z','2026-11-10T01:00:00Z','2026-11-11T01:00:00Z'],['2026-11-12T00:00:00Z','2020-01-01T00:00:00Z'],10,now,3);
  assert.deepEqual(w.map(x=>[x.opened,x.closed,x.backlog]),[[0,0,8],[2,1,9],[1,0,10]]);
});
