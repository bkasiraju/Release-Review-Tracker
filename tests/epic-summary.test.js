'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const es=require('../backend/epic-summary');
const EP='a1B000000000001AAA';
function svc(){const d=new Map();return {readOnly:false,store:{async get(t,id){return d.get(id)||null;},async put(t,id,v,rev){const c=d.get(id);if((c?.revision??null)!==rev)throw Error('changed');d.set(id,{...v,revision:(c?.revision||0)+1});}}};}
test('saves and returns a summary only for the same fingerprint',async()=>{
  const s=svc();
  assert.equal((await es.get(s,{epicId:EP,fingerprint:'abc12345'})).summary,null);
  await es.save(s,{epicId:EP,fingerprint:'abc12345',summary:{accomplishments:['Shipped X'],learnings:[],planForward:['Do Y'],extra:['no']}});
  const r=await es.get(s,{epicId:EP,fingerprint:'abc12345'});assert.deepEqual(r.summary,{accomplishments:[{text:'Shipped X',refs:[]}],inProgress:[],learnings:[],planForward:[{text:'Do Y',refs:[]}]});
  assert.equal((await es.get(s,{epicId:EP,fingerprint:'def67890'})).summary,null);
  await es.save(s,{epicId:EP,fingerprint:'def67890',summary:{accomplishments:['New'],learnings:[],planForward:[]}});
  assert.equal((await es.get(s,{epicId:EP,fingerprint:'def67890'})).summary.accomplishments[0].text,'New');
  assert.deepEqual(es.clean({accomplishments:[{text:'A',refs:['W-1','<b>x']}]}).accomplishments[0].refs,['W-1','bx']);
});
test('rejects bad ids, fingerprints and empty summaries; caps list sizes',async()=>{
  const s=svc();
  await assert.rejects(es.get(s,{epicId:'x',fingerprint:'abc12345'}));
  await assert.rejects(es.save(s,{epicId:EP,fingerprint:'!!',summary:{accomplishments:['a']}}));
  await assert.rejects(es.save(s,{epicId:EP,fingerprint:'abc12345',summary:{accomplishments:[],learnings:[],planForward:[]}}));
  assert.equal(es.clean({accomplishments:['1','2','3','4','5'],learnings:['a'],planForward:[]}).accomplishments.length,4);
});
