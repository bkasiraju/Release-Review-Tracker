'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const actions=require('../backend/actions');
const MQ='a00B0000000w4ZhIAI';
function mem(){let doc=null,rev=0;return {async get(){return doc?{...doc}:null;},async put(t,id,v,exp){if(exp!==undefined&&(doc?.revision??null)!==exp)throw Error('This record changed. Reload and try again.');doc={...v,revision:'r'+(++rev)};return {...doc};}};}
const sf={async query(){return {records:[{Member_Name__c:'005000000000001AAA',Member_Name__r:{Name:'Ann'},Role__c:''},{Member_Name__c:'005000000000002AAA',Member_Name__r:{Name:'Bob'},Role__c:''}]};}};
const base={workId:'a07A00000000001AAA',workName:'W-12345678',subject:'s',assignee:'Ann',assigneeId:'005000000000001AAA',ownerId:'005000000000002AAA',details:'Fix it',eta:'2026-11-20',priority:'High'};
test('saves, lists and resolves action items for team members only',async()=>{
  const store=mem();
  const r=await actions.save(store,sf,MQ,base);assert.equal(r.items.length,1);assert.equal(r.item.owner,'Bob');assert.equal(r.item.status,'open');
  await assert.rejects(()=>actions.save(store,sf,MQ,{...base,ownerId:'005000000000009AAA'}),/member of this team/);
  await assert.rejects(()=>actions.save(store,sf,MQ,{...base,eta:'bad'}),/ETA/);
  await assert.rejects(()=>actions.save(store,sf,MQ,{...base,priority:'P9'}),/priority/);
  await assert.rejects(()=>actions.save(store,sf,'x',base),/Unknown team/);
  const done=await actions.resolve(store,MQ,{id:r.item.id,resolved:true});assert.equal(done.items[0].status,'resolved');
  const re=await actions.resolve(store,MQ,{id:r.item.id,resolved:false});assert.equal(re.items[0].status,'open');
  assert.equal((await actions.list(store,MQ)).items.length,1);
});

test('retention: items older than 30 days are dropped on list and save, history is purged only when safe',async()=>{
  const store=mem();const sfx=sf;
  const old=new Date(Date.now()-31*864e5).toISOString(),young=new Date(Date.now()-29*864e5).toISOString();
  await store.put('actions',MQ,{items:[{id:'a',createdAt:old,status:'open'},{id:'b',createdAt:young,status:'open'}]},null);
  const l=await actions.list(store,MQ);assert.deepEqual(l.items.map(x=>x.id),['b']);assert.equal(l.retentionDays,30);
  assert.deepEqual((await store.get()).items.map(x=>x.id),['b']);assert.equal((await store.get()).snapshot,true);
  await assert.rejects(()=>actions.save(store,sfx,MQ,{...base,eta:'2027-06-01'}),/within 30 days/);
  let purged=0;const s2={...mem(),async list(){return [{teamId:MQ,items:[],snapshot:false}];},async put(){return {teamId:MQ,items:[]};},async purgeOlderThan(){purged++;return {purged:1,failed:0};}};
  assert.match((await actions.sweep(s2,true)).skipped,/not converted/);assert.equal(purged,0);
  const s3={async list(){return [{teamId:MQ,items:[],snapshot:true}];},async purgeOlderThan(t,d){purged++;assert.equal(t,'actions');assert.equal(d,30);return {purged:1,failed:0};}};
  assert.equal((await actions.sweep(s3,true)).purged,1);assert.equal(purged,1);
});

test('deletes an action item',async()=>{
  const store=mem();const r=await actions.save(store,sf,MQ,base);
  await assert.rejects(()=>actions.remove(store,MQ,{id:'nope'}),/not found/);
  assert.equal((await actions.remove(store,MQ,{id:r.item.id})).items.length,0);
});

test('setEta updates only the ETA of an open action item and validates the date',async()=>{
  const store=mem(),r=await actions.save(store,sf,MQ,{...base,eta:new Date(Date.now()+864e5).toISOString().slice(0,10)});
  const eta=new Date(Date.now()+3*864e5).toISOString().slice(0,10);
  const out=await actions.setEta(store,MQ,{id:r.item.id,eta});assert.equal(out.items[0].eta,eta);assert.equal(out.items[0].details,'Fix it');assert.equal(out.items[0].status,'open');
  await assert.rejects(()=>actions.setEta(store,MQ,{id:r.item.id,eta:'bad'}),/ETA/);
  await assert.rejects(()=>actions.setEta(store,MQ,{id:r.item.id,eta:new Date(Date.now()+60*864e5).toISOString().slice(0,10)}),/within/);
  await assert.rejects(()=>actions.setEta(store,MQ,{id:'nope',eta}),/not found/);
});

test('update edits details, owner, priority and ETA of an existing item without creating a duplicate',async()=>{
  const store=mem(),eta=new Date(Date.now()+864e5).toISOString().slice(0,10),r=await actions.save(store,sf,MQ,{...base,eta});
  const out=await actions.update(store,sf,MQ,{id:r.item.id,details:'New text',eta,priority:'Low',ownerId:'005000000000001AAA'});
  assert.equal(out.items.length,1);assert.equal(out.items[0].details,'New text');assert.equal(out.items[0].priority,'Low');assert.equal(out.items[0].owner,'Ann');assert.equal(out.items[0].workName,'W-12345678');
  await assert.rejects(()=>actions.update(store,sf,MQ,{id:r.item.id,details:'',eta,priority:'Low',ownerId:'005000000000001AAA'}),/Describe/);
  await assert.rejects(()=>actions.update(store,sf,MQ,{id:r.item.id,details:'x',eta,priority:'Low',ownerId:'005000000000009AAA'}),/member/);
});
