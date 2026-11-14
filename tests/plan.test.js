'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const plan=require('../backend/plan'),{handleRequest}=require('../backend');
const T='a00B0000000w4ZhIAI',REL='a1EEE00000REL0001A',PROG='a1FEE00000PROG001A',ENG='005EE00000ENG0001A';
const mkStore=()=>{const mem={};let n=0;return {shared:true,mem,async get(t,id){return mem[id]||null;},async put(t,id,v,exp){const cur=mem[id];if(exp!==undefined&&(cur?.revision??null)!==exp)throw Error('This record changed. Reload and try again.');mem[id]={...v,revision:'r'+(++n),updatedAt:'now'};return mem[id];}};};
const draft=()=>({window:{start:'2026-11-16',end:'2027-01-29'},people:{[ENG]:{name:'Ann',leave:3,holiday:2}},
  projects:[{id:'p1',name:'M1: Baseline',programId:PROG,programName:'Program A',theme:'M1'}],
  epics:[{id:'e1',projectId:'p1',name:'ABL epic',line:'ABL',priority:2,releaseId:REL,releaseName:'MQ 266',workstreams:[{id:'w1',name:'API',engId:ENG,engName:'Ann',days:6.5},{id:'w2',name:'Tests',engId:ENG,engName:'Ann',days:3}]},
         {id:'e2',projectId:'p1',name:'BTL epic',line:'BTL',workstreams:[{id:'w3',name:'x',days:4}]}]});
const sfMock=(log,opts={})=>({async query(q){log.push(['q',q]);if(/FROM ADM_Planned_Release__c/.test(q))return {records:[{Id:REL}]};if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:'Message Queue'}]};if(/FROM PPM_Program__c/.test(q))return {records:[{Id:PROG,Name:'MQ - 268'}]};return {records:[]};},
  async create(o,f){log.push(['c',o,f]);if(opts.failEpic&&o==='ADM_Epic__c')return {success:false,errors:['BAD']};return {success:true,id:o==='PPM_Project__c'?'a1PEE00000PRJ0001A':'a0XEE00000EPC0001A'};},
  async update(o,id,f){log.push(['u',o,id,f]);return {success:true};}});
test('plan is cleaned: bad ids, negative days and oversize text are dropped',()=>{
  const c=plan.cleanPlan({people:{"x' OR 1":{leave:5},[ENG]:{leave:-2,holiday:'3'}},epics:[{name:'a'.repeat(400),line:'zzz',releaseId:'bad id',workstreams:[{days:-4,engId:'nope'}]}]});
  assert.deepEqual(Object.keys(c.people),[ENG]);assert.equal(c.people[ENG].leave,0);assert.equal(c.people[ENG].holiday,3);assert.equal(c.people[ENG].oncall,0);assert.equal(plan.cleanPlan({people:{[ENG]:{oncall:'4.5'}}}).people[ENG].oncall,4.5);
  assert.equal(c.epics[0].name.length,255);assert.equal(c.epics[0].line,'BTL');assert.equal(c.epics[0].releaseId,'');assert.equal(c.epics[0].workstreams[0].days,0);assert.equal(c.epics[0].workstreams[0].engId,'');
});
test('plan round-trips through the handler per team and rejects stale revisions',async()=>{
  const store=mkStore(),ctx=(b)=>({request:{body:b},sf:{},gus:{},store});
  const s1=await handleRequest(ctx({action:'plan-save',teamId:T,plan:draft(),revision:null}));assert.equal(s1.ok,true);
  const g=await handleRequest(ctx({action:'plan-get',teamId:T}));assert.equal(g.payload.plan.epics.length,2);
  const stale=await handleRequest(ctx({action:'plan-save',teamId:T,plan:draft(),revision:null}));assert.equal(stale.ok,false);
  assert.equal((await handleRequest(ctx({action:'plan-get',teamId:'bad id'}))).ok,false);
});
test('review only covers ABL epics and reports blockers',()=>{
  const d=plan.cleanPlan(draft());const r=plan.review(d,new Set([REL]),{id:PROG,name:'MQ - 268'});
  assert.equal(r.items.length,1);assert.equal(r.skipped,1);assert.equal(r.items[0].effort,9.5);assert.deepEqual(r.blockers,[]);
  d.epics[0].releaseId='';d.epics[0].workstreams.forEach(w=>w.days=0);
  assert.equal(plan.review(d,new Set([REL]),{id:PROG,name:'MQ - 268'}).blockers[0].problems.length,2);
  assert.match(plan.review(plan.cleanPlan(draft()),new Set([REL]),null).blockers[0].problems[0],/No “268” program/);
});
test('commit creates project then epic for ABL only, saves effort, and stores GUS ids so a retry updates',async()=>{
  const store=mkStore(),log=[];await plan.savePlan(store,T,draft(),null);
  const pre=await plan.commitPlan(sfMock(log),store,T,false);assert.equal(pre.preview.items.length,1);assert.equal(log.filter(x=>x[0]!=='q').length,0);
  const r=await plan.commitPlan(sfMock(log),store,T,true);assert.equal(r.failed,0);
  const writes=log.filter(x=>x[0]==='c');assert.deepEqual(writes.map(w=>w[1]),['PPM_Project__c','ADM_Epic__c']);
  assert.deepEqual(writes[0][2],{Name:'M1: Baseline',Program__c:PROG});
  assert.deepEqual(writes[1][2],{Name:'ABL epic',Team__c:T,Project__c:'a1PEE00000PRJ0001A',Planned_Release__c:REL,Planned_Story_Points__c:9.5,Priority__c:2});
  const saved=(await plan.getPlan(store,T)).plan;assert.equal(saved.epics[0].gusId,'a0XEE00000EPC0001A');assert.equal(saved.epics[1].gusId,'');assert.equal(saved.projects[0].gusId,'a1PEE00000PRJ0001A');
  const log2=[];await plan.commitPlan(sfMock(log2),store,T,true);assert.equal(log2.filter(x=>x[0]==='c').length,0);assert.equal(log2.filter(x=>x[0]==='u').length,1);
});
test('commit refuses blocked plans and a failed epic leaves no id so it can be retried',async()=>{
  const store=mkStore(),bad=draft();bad.epics[0].releaseId='';await plan.savePlan(store,T,bad,null);
  await assert.rejects(()=>plan.commitPlan(sfMock([]),store,T,true),/Fix 1 epic/);
  const store2=mkStore();await plan.savePlan(store2,T,draft(),null);
  const r=await plan.commitPlan(sfMock([],{failEpic:true}),store2,T,true);assert.equal(r.failed,1);assert.equal((await plan.getPlan(store2,T)).plan.epics[0].gusId,'');
  assert.equal((await plan.getPlan(store2,T)).plan.projects[0].gusId,'a1PEE00000PRJ0001A'); // created project is remembered so the retry reuses it
});
test('default team preference is kept per user in the settings journal',async()=>{
  const store=mkStore(),{handleRequest}=require('../backend'),sf={userId:'005EE00000USER001A',async query(){return {records:[]};}};
  const call=b=>handleRequest({request:{body:b},sf,gus:{},store});
  assert.equal((await call({action:'pref-get'})).payload.defaultTeam,null);
  assert.equal((await call({action:'pref-set',defaultTeam:T})).ok,true);
  assert.equal((await call({action:'pref-get'})).payload.defaultTeam,T);
  assert.equal((await call({action:'pref-set',defaultTeam:null})).ok,true);
  assert.equal((await call({action:'pref-get'})).payload.defaultTeam,null);
  assert.equal((await call({action:'pref-set',defaultTeam:"x' OR 1"})).ok,false);
});

test('cleanPlan keeps workstream priority', () => {
  const c = require('../backend/plan.js').cleanPlan;
  const out = c({ epics: [{ id: 'e1', projectId: 'p1', workstreams: [{ id: 'w1', priority: 2 }, { id: 'w2', priority: '' }] }] });
  assert.equal(out.epics[0].workstreams[0].priority, 2);
  assert.equal(out.epics[0].workstreams[1].priority, null);
});

test('cleanPlan keeps sheet-parity fields and rejects non-http docs', () => {
  const c = require('../backend/plan.js').cleanPlan;
  const o = c({ epics: [{ id: 'e1', projectId: 'p1', theme: 'Feature GA', hrp: '5.5', v2mom: '5.5.2', estimate: 35, status: 'In Progress', doc: 'javascript:alert(1)', owners: [], workstreams: [{ id: 'w1', status: 'Bogus', engIds: [] }] }] }).epics[0];
  assert.equal(o.theme, 'Feature GA'); assert.equal(o.v2mom, '5.5.2'); assert.equal(o.estimate, 35);
  assert.equal(o.status, 'In Progress'); assert.equal(o.doc, ''); assert.equal(o.workstreams[0].status, '');
});

test('review includes below-the-line epics only when asked', () => {
  const { review } = require('../backend/plan.js');
  const plan = { projects: [{ id: 'p1', name: 'M1: X', gusId: '' }], epics: [
    { id: 'e1', projectId: 'p1', name: 'A', line: 'ABL', workstreams: [{ days: 1 }] },
    { id: 'e2', projectId: 'p1', name: 'B', line: 'BTL', workstreams: [{ days: 1 }] }] };
  assert.equal(review(plan, null, { id: 'x', name: 'P' }, false).items.length, 1);
  const all = review(plan, null, { id: 'x', name: 'P' }, true);
  assert.equal(all.items.length, 2); assert.equal(all.skipped, 0);
});
