'use strict';
const test=require('node:test'),assert=require('node:assert');
const {merge3}=require('../public/plan-merge.js');
const mk=()=>({projects:[{id:'p1',name:'P'}],epics:[{id:'e1',name:'Epic 1',priority:1,engIds:['a'],workstreams:[{id:'w1',name:'WS',days:2}],actions:[]},{id:'e2',name:'Epic 2',priority:2,workstreams:[],actions:[]}]});
test('non-overlapping edits merge silently',()=>{
  const b=mk(),a=mk(),t=mk();a.epics[0].priority=5;t.epics[1].name='Renamed';t.epics[0].workstreams[0].days=4;
  const r=merge3(b,a,t);assert.deepEqual(r.conflicts,[]);
  assert.equal(r.plan.epics[0].priority,5);assert.equal(r.plan.epics[1].name,'Renamed');assert.equal(r.plan.epics[0].workstreams[0].days,4);
});
test('added items from both sides are kept',()=>{
  const b=mk(),a=mk(),t=mk();a.epics.push({id:'e3',name:'Mine'});t.epics.push({id:'e4',name:'Theirs'});a.epics[0].actions.push({id:'a1',text:'x'});t.epics[0].actions.push({id:'a2',text:'y'});
  const r=merge3(b,a,t);assert.deepEqual(r.conflicts,[]);
  assert.deepEqual(r.plan.epics.map(e=>e.id).sort(),['e1','e2','e3','e4']);assert.equal(r.plan.epics.find(e=>e.id==='e1').actions.length,2);
});
test('same field changed differently is reported, mine wins',()=>{
  const b=mk(),a=mk(),t=mk();a.epics[0].priority=5;t.epics[0].priority=7;
  const r=merge3(b,a,t);assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0].label,'Epic 1');assert.equal(r.conflicts[0].field,'priority');
  assert.equal(r.conflicts[0].mine,5);assert.equal(r.conflicts[0].theirs,7);assert.equal(r.plan.epics[0].priority,5);
});
test('same change on both sides is not a conflict',()=>{
  const b=mk(),a=mk(),t=mk();a.epics[0].priority=5;t.epics[0].priority=5;assert.deepEqual(merge3(b,a,t).conflicts,[]);
});
test('delete vs untouched deletes; delete vs edit is reported',()=>{
  let b=mk(),a=mk(),t=mk();t.epics.splice(1,1);
  let r=merge3(b,a,t);assert.deepEqual(r.conflicts,[]);assert.equal(r.plan.epics.length,1);
  b=mk();a=mk();t=mk();t.epics.splice(1,1);a.epics[1].name='Edited';
  r=merge3(b,a,t);assert.equal(r.conflicts.length,1);assert.equal(r.plan.epics.length,2);
});
test('id lists merge as sets',()=>{
  const b=mk(),a=mk(),t=mk();a.epics[0].engIds=['a','b'];t.epics[0].engIds=['a','c'];
  const r=merge3(b,a,t);assert.deepEqual(r.conflicts,[]);assert.deepEqual(r.plan.epics[0].engIds.sort(),['a','b','c']);
});
