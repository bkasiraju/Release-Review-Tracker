'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const hub=require('../backend/hub'),{handleRequest}=require('../backend');
const MQ='a00B0000000w4ZhIAI',WID='a07EE00000ABCDEFGH';
const ctx=(sf,body,store)=>({request:{body},sf,gus:{},store:store||{shared:true}});
test('gus-update sends only allow-listed delta fields, in parallel, per record',async()=>{
  const calls=[],sf={async update(o,id,f){calls.push([o,id,f]);return {success:true};}};
  const r=await hub.updateGus(sf,[{object:'ADM_Work__c',id:WID,fields:{Status__c:'Fixed'}},{object:'ADM_Team_Dependency__c',id:WID,fields:{Deliver_By__c:'2026-12-01'}}]);
  assert.deepEqual(r.results.map(x=>x.ok),[true,true]);
  assert.deepEqual(calls[0],['ADM_Work__c',WID,{Status__c:'Fixed'}]);
});
test('gus-update rejects non-allow-listed objects, fields, bad ids and bad values without calling GUS',async()=>{
  let n=0;const sf={async update(){n++;return {success:true};}};
  const bad=[{object:'User',id:WID,fields:{Name:'x'}},{object:'ADM_Work__c',id:WID,fields:{OwnerId:WID}},{object:'ADM_Work__c',id:"x' OR 1=1",fields:{Status__c:'Fixed'}},
    {object:'ADM_Work__c',id:WID,fields:{Story_Points__c:-3}},{object:'ADM_Work__c',id:WID,fields:{Story_Points__c:'5'}},{object:'ADM_Team_Dependency__c',id:WID,fields:{Deliver_By__c:'tomorrow'}},{object:'ADM_Work__c',id:WID,fields:{}}];
  const r=await hub.updateGus(sf,bad);
  assert.ok(r.results.every(x=>!x.ok));assert.equal(n,0);
});
test('one failing record does not block the others and reports GUS errors',async()=>{
  const sf={async update(o,id){if(id===WID)throw new Error('FIELD_CUSTOM_VALIDATION_EXCEPTION');return {success:true};}};
  const r=await hub.updateGus(sf,[{object:'ADM_Work__c',id:WID,fields:{Status__c:'Fixed'}},{object:'ADM_Work__c',id:'a07EE00000ZZZZZZZZ',fields:{Status__c:'Fixed'}}]);
  assert.equal(r.results[0].ok,false);assert.match(r.results[0].error,/VALIDATION/);assert.equal(r.results[1].ok,true);
});
test('bugs default to open P0-P2 for the team and ignore invalid priorities',async()=>{
  const qs=[],sf={async query(q){qs.push(q);return {records:[{Id:WID,Name:'W-1',Subject__c:'s',Status__c:'New',Priority__c:'P1',Assignee__r:{Name:'Ann'},CreatedDate:'2026-11-01T00:00:00Z'}]};}};
  const r=await hub.getBugs(sf,MQ);assert.equal(r.bugs[0].assignee,'Ann');
  assert.match(qs[0],/Priority__c IN \('P0','P1','P2'\)/);assert.match(qs[0],/RecordType\.Name = 'Bug'/);assert.match(qs[0],/NOT IN/);
  await hub.getBugs(sf,MQ,{priorities:['P0',"P1' OR 1=1"]});assert.match(qs[1],/IN \('P0'\)/);
  await assert.rejects(()=>hub.getBugs(sf,"x' OR 1=1"),/Unknown team/);
});
test('TDs split into outgoing (team is dependent) and incoming (team is provider)',async()=>{
  const row=(id,dep,prov)=>({Id:id,Name:id,Dependency_Status__c:'New',Dependent_Team__c:dep,Provider_Team__c:prov,Dependent_Team__r:{Name:'D'},Provider_Team__r:{Name:'P'}});
  const r=await hub.getTds({async query(){return {records:[row('a',MQ,'x'),row('b','y',MQ),row('c',MQ,MQ)]};}},MQ);
  assert.deepEqual(r.outgoing.map(t=>t.id),['a','c']);assert.deepEqual(r.incoming.map(t=>t.id),['b']);
});
test('teams come from GUS with a seeded fallback',async()=>{
  const live=await hub.getTeams({async query(q){return q.includes('ADM_Scrum_Team__c')?{records:[{Id:'a00EE00001w1i6qYAA',Name:'VegaCache FACE'}]}:{records:[]};}});
  assert.equal(live.teams[0].short,'VegaCache FACE');
  const seeded=await hub.getTeams({async query(){return {records:[]};}});assert.equal(seeded.teams.length,2);
});
test('rotation rota is validated, sorted and stored per team through the handler',async()=>{
  const mem={},store={shared:true,async get(t,id){return mem[id]||null;},async put(t,id,v){mem[id]={...v,revision:'r1',updatedAt:'now'};return mem[id];}};
  const saved=await handleRequest(ctx({},{action:'hub-rotation-save',teamId:MQ,rota:{pd:[{name:'B',start:'2026-11-10',end:'2026-11-16'},{name:'A',start:'2026-11-03',end:'2026-11-09'},{name:'bad',start:'x',end:'y'}],trusthero:[]}},store));
  assert.equal(saved.ok,true);assert.deepEqual(saved.payload.rota.pd.map(r=>r.name),['A','B']);
  const got=await handleRequest(ctx({},{action:'hub-rotation',teamId:MQ},store));assert.equal(got.payload.rota.pd.length,2);
  assert.equal((await handleRequest(ctx({},{action:'hub-rotation',teamId:'bad id'},store))).ok,false);
});
test('picklists fall back to defaults when describe is unavailable',async()=>{
  const p=await hub.getPicklists({async request(){throw new Error('no');}});assert.ok(p.workStatus.includes('In Progress'));assert.ok(p.priority.includes('P0'));
});
