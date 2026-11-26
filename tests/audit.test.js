'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const audit=require('../backend/audit');
const T1='a00B0000000w4ZhIAI',T2='a00B0000000w4ZiIAI';
function mem(){const docs=new Map();let rev=0;return {docs,async get(t,id){const d=docs.get(id);return d?{...d}:null;},async list(){return [...docs.values()];},
  async putSnapshot(t,id,v,exp){const cur=docs.get(id);if(exp!==undefined&&(cur?.revision??null)!==exp)throw Error('This record changed. Reload and try again.');const d={...v,revision:'r'+(++rev)};docs.set(id,d);return d;}};}
const sf={async identity(){return {user_id:'005000000000001AAA',username:'ann@x.com'};},async query(){return {records:[{Name:'Ann Lee'}]};}};

test('records who changed what per team, and reads it back newest first',async()=>{
  const s=mem();
  await audit.record(s,sf,{},'plan-create-epic',{teamId:T1,epic:{name:'Epic A'}},{});
  await audit.record(s,sf,{},'plan-delete-epic',{teamId:T2,epic:{name:'Epic B'}},{});
  const r=await audit.read(s,{teamId:T1});assert.equal(r.events.length,1);
  assert.equal(r.events[0].actor.name,'Ann Lee');assert.equal(r.events[0].summary,'Created epic "Epic A"');assert.equal(r.events[0].area,'Epics & workstreams');assert.equal(r.events[0].teamId,T1);
  const all=await audit.read(s,{teamId:'all'});assert.deepEqual(all.events.map(e=>e.summary),['Deleted epic "Epic B"','Created epic "Epic A"']);
  await assert.rejects(()=>audit.read(s,{teamId:'bad id'}),/Unknown team/);
});

test('previews and unaudited actions write nothing; only Release Planner actions are audited',async()=>{
  const s=mem();
  await audit.record(s,sf,{},'plan-commit',{teamId:T1,confirm:false},{});
  await audit.record(s,sf,{},'plan-get',{teamId:T1},{});
  assert.equal(s.docs.size,0);
  for(const a of ['save-review-status','gus-update','sal-save','post-chatter','save-team'])await audit.record(s,sf,{},a,{teamId:T1,releaseId:'11111111-1111-1111-1111-111111111111',value:'x'},{});
  assert.equal(s.docs.size,0,'only Release Planner actions are audited');
});

test('autosaves within ten minutes merge into one event; demo mode and failures never throw',async()=>{
  const s=mem();
  await audit.record(s,sf,{},'plan-save',{teamId:T1},{auditChanges:[]});assert.equal(s.docs.size,0,'a save with no real change is not recorded');
  for(let i=0;i<3;i++)await audit.record(s,sf,{},'plan-save',{teamId:T1},{auditChanges:[`Epic “E”: priority P1 → P${i}`]});
  const ev=(await audit.read(s,{teamId:T1})).events;assert.equal(ev.length,1);assert.equal(ev[0].count,3);assert.equal(ev[0].detail.length,3);assert.match(ev[0].detail[2],/P1 → P2/);
  await audit.record(s,sf,{demo:true},'plan-create-epic',{teamId:T1,epic:{name:'x'}},{});assert.equal((await audit.read(s,{teamId:T1})).events.length,1);
  const broken={async get(){throw Error('down');}};assert.equal(await audit.record(broken,sf,{},'plan-create-epic',{teamId:T1},{}),false);
});

test('old events are dropped and never include free text beyond the summary limit',async()=>{
  const old=new Date(Date.now()-200*864e5).toISOString(),young=new Date().toISOString();
  assert.equal(audit.__test.prune([{ts:old},{ts:young}]).length,1);
  const d=audit.describe('plan-create-epic',{teamId:T1,epic:{name:'x'.repeat(500)}},{});assert.ok(d.summary.length<=200);
});

test('the real ContentStore accepts the audit record type',()=>{
  const {ContentStore}=require('../backend/store');
  assert.doesNotThrow(()=>new ContentStore({}).title('audit',T1));
  assert.doesNotThrow(()=>new ContentStore({}).title('audit','shared'));
});

test('planChanges lists added, removed and edited items with old and new values',()=>{
  const planner=require('../backend/plan');const base={projects:[{id:'p1',name:'Proj'}],epics:[{id:'e1',name:'Epic A',priority:1,workstreams:[{id:'w1',name:'WS1',days:2}]},{id:'e2',name:'Gone',workstreams:[]}],window:{}};
  const next={projects:[{id:'p1',name:'Proj'}],epics:[{id:'e1',name:'Epic A',priority:0,workstreams:[{id:'w1',name:'WS1',days:5},{id:'w2',name:'New WS',days:1}]},{id:'e3',name:'Fresh',workstreams:[]}],window:{}};
  const c=planner.planChanges(base,next).join('\n');
  assert.match(c,/Epic “Epic A”: priority P1 → P0/);assert.match(c,/Workstream “WS1”: days 2 → 5/);assert.match(c,/Workstream added to “Epic A”: “New WS”/);assert.match(c,/Epic added: “Fresh”/);assert.match(c,/Epic removed: “Gone”/);
});
