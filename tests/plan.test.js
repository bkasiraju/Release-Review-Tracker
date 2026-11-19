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
  const {Description__c:desc,...core}=writes[1][2];
  assert.deepEqual(core,{Name:'ABL epic',Team__c:T,Project__c:'a1PEE00000PRJ0001A',Planned_Release__c:REL,Planned_Story_Points__c:9.5,Priority__c:2});
  assert.match(desc,/Workstreams:/);assert.match(desc,/Planned release: /);
  const saved=(await plan.getPlan(store,T)).plan;assert.equal(saved.epics[0].gusId,'a0XEE00000EPC0001A');assert.equal(saved.epics[1].gusId,'');assert.equal(saved.projects[0].gusId,'a1PEE00000PRJ0001A');
  const log2=[];await plan.commitPlan(sfMock(log2),store,T,true);assert.equal(log2.filter(x=>x[0]==='c').length,0);assert.equal(log2.filter(x=>x[0]==='u').length,0);
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
test('incremental saves send only deltas and never duplicate epics',async()=>{
  const store=mkStore(),log=[],sf=()=>sfMock(log),writes=()=>log.filter(x=>x[0]==='c'||x[0]==='u');
  await plan.savePlan(store,T,draft(),null);
  // 1. first full save creates project + epic
  let r=await plan.commitPlan(sf(),store,T,true);assert.equal(writes().length,2);
  // 2. immediate re-save with no edits: nothing is sent
  log.length=0;let pre=await plan.commitPlan(sf(),store,T,false);assert.equal(pre.preview.items[0].action,'unchanged');assert.deepEqual(pre.preview.counts,{create:0,update:0,unchanged:1});
  r=await plan.commitPlan(sf(),store,T,true);assert.equal(writes().length,0);assert.equal(r.results[0].skipped,true);
  // 3. new workstream on a saved epic: one update (effort grows), no create
  let g=await plan.getPlan(store,T),p=g.plan;p.epics[0].workstreams.push({id:'w9',name:'Docs',days:3,engIds:[],engNames:[]});await plan.savePlan(store,T,p,g.revision);
  log.length=0;pre=await plan.commitPlan(sf(),store,T,false);const it=pre.preview.items[0];assert.equal(it.action,'update');assert.deepEqual(it.workstreams.map(w=>w.flag),['unchanged','unchanged','new']);assert.match(it.delta[0],/New workstream: Docs/);
  r=await plan.commitPlan(sf(),store,T,true);assert.equal(log.filter(x=>x[0]==='c').length,0);const u=log.filter(x=>x[0]==='u');assert.equal(u.length,1);assert.equal(u[0][3].Planned_Story_Points__c,12.5);
  // 4. and again: nothing
  log.length=0;await plan.commitPlan(sf(),store,T,true);assert.equal(writes().length,0);
  // 5. changed days on one workstream: update only
  g=await plan.getPlan(store,T);p=g.plan;p.epics[0].workstreams[0].days=8;await plan.savePlan(store,T,p,g.revision);
  log.length=0;pre=await plan.commitPlan(sf(),store,T,false);assert.deepEqual(pre.preview.items[0].workstreams.map(w=>w.flag),['changed','unchanged','unchanged']);await plan.commitPlan(sf(),store,T,true);assert.equal(log.filter(x=>x[0]==='u').length,1);assert.equal(log.filter(x=>x[0]==='c').length,0);
  // 6. new epic alongside an unchanged one: only the new epic is created
  g=await plan.getPlan(store,T);p=g.plan;p.epics.push({id:'e5',projectId:'p1',name:'Second epic',line:'ABL',releaseId:REL,releaseName:'MQ 266',workstreams:[{id:'w5',name:'A',days:2}]});await plan.savePlan(store,T,p,g.revision);
  log.length=0;await plan.commitPlan(sf(),store,T,true);assert.deepEqual(writes().map(w=>w[0]+w[1]),['cADM_Epic__c']);
  // 7. a BTL workstream is not part of the ABL save, so adding one is not a delta
  g=await plan.getPlan(store,T);p=g.plan;p.epics[0].workstreams.push({id:'w6',name:'Later',days:5,line:'BTL'});await plan.savePlan(store,T,p,g.revision);
  log.length=0;await plan.commitPlan(sf(),store,T,true);assert.equal(writes().length,0);
  // 8. two unsaved epics with the same name are blocked rather than linked to one GUS epic
  const d=plan.cleanPlan(draft());d.epics.push({...d.epics[0],id:'e7'});assert.match(plan.review(d,new Set([REL]),{id:PROG,name:'x'}).blockers[0].problems.join(' '),/same name/);
});
test('createProject / createEpic write the mandatory GUS fields and reuse duplicates',async()=>{
  const log=[],sf=sfMock(log);
  const p=await plan.createProject(sf,T,{name:'M9: New',method:'Method X'});
  assert.equal(p.created,true);assert.equal(p.programId,PROG);
  assert.deepEqual(log.find(x=>x[0]==='c'&&x[1]==='PPM_Project__c')[2],{Name:'M9: New',Program__c:PROG,V2MOM_Method__c:'Method X'});
  const e=await plan.createEpic(sf,T,{name:'Epic A',releaseId:REL,effort:5,leadId:ENG,priority:0,project:{gusId:'a1PEE00000PRJ0001A'}});
  assert.equal(e.created,true);
  const f=log.find(x=>x[0]==='c'&&x[1]==='ADM_Epic__c')[2];
  assert.equal(f.Team__c,T);assert.equal(f.Project__c,'a1PEE00000PRJ0001A');assert.equal(f.Planned_Release__c,REL);assert.equal(f.Development_Lead__c,ENG);assert.equal(f.OwnerId,ENG);assert.equal(f.Planned_Story_Points__c,5);
  await assert.rejects(plan.createEpic(sf,T,{name:'E',releaseId:REL,project:{gusId:'a1PEE00000PRJ0001A'}}),/development lead/);
  await assert.rejects(plan.createEpic(sf,T,{name:'E',leadId:ENG,releaseId:REL,project:{gusId:'a1PEE00000PRJ0001A'}}),/priority/);
  await assert.rejects(plan.createEpic(sf,T,{name:'',releaseId:REL,project:{gusId:'a1PEE00000PRJ0001A'}}),/epic name/);
  const l2=[],e2=await plan.createEpic(sfMock(l2),T,{name:'No release',leadId:ENG,priority:0,releaseId:'',project:{gusId:'a1PEE00000PRJ0001A'}});
  assert.equal(e2.created,true);assert.equal('Planned_Release__c' in l2.find(x=>x[0]==='c'&&x[1]==='ADM_Epic__c')[2],false);
  await assert.rejects(plan.createEpic(sf,T,{name:'x'.repeat(81),leadId:ENG,releaseId:REL,project:{gusId:'a1PEE00000PRJ0001A'}}),/at most 80/);
  await assert.rejects(plan.createEpic(sf,T,{name:'E',leadId:ENG,releaseId:'a1EEE00000OTHER01A',project:{gusId:'a1PEE00000PRJ0001A'}}),/planned releases/);
  await assert.rejects(plan.createEpic(sfMock([],{failEpic:true}),T,{name:'E2',leadId:ENG,priority:0,releaseId:REL,project:{gusId:'a1PEE00000PRJ0001A'}}),/rejected the epic/);
});
test('syncEpics writes grid edits to GUS epics of this team only and reports failures',async()=>{
  const log=[],base=sfMock(log),sf={...base,async query(q){if(/FROM ADM_Epic__c/.test(q))return {records:/a0XEE00000EPC0001A/.test(q)?[{Id:'a0XEE00000EPC0001A'}]:[]};return base.query(q);}};
  const r=await plan.syncEpics(sf,T,[{gusId:'a0XEE00000EPC0001A',name:'Renamed',leadId:ENG,releaseId:'',effort:7.5},{gusId:'a0XEE00000OTHER01',name:'x'},{gusId:'a0XEE00000EPC0001A',name:'y'.repeat(81)}]);
  assert.deepEqual(r.results.map(x=>x.ok),[true,false,false]);
  assert.deepEqual(log.find(x=>x[0]==='u'&&x[1]==='ADM_Epic__c')[3],{Name:'Renamed',Development_Lead__c:ENG,OwnerId:ENG,Planned_Release__c:null,Planned_Story_Points__c:7.5});
  assert.match(r.results[1].err,/does not belong/);assert.match(r.results[2].err,/at most 80/);
});

test('syncEpics moves an epic to a project in the team program only; refreshEpics reads current GUS values',async()=>{
  const PJ='a1PEE00000PRJ0001A',BAD='a1PEE00000PRJ0002A',EP='a0XEE00000EPC0001A',upd=[];
  const sf={async query(q){
      if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:'Message Queue'}]};
      if(/FROM PPM_Program__c/.test(q))return {records:[{Id:'a1QEE00000PRG0001A',Name:'MQ - 2026 Q4'}]};
      if(/FROM PPM_Project__c/.test(q))return {records:q.includes(PJ)?[{Id:PJ}]:[]};
      if(/FROM ADM_Epic__c WHERE Id IN/.test(q))return {records:[{Id:EP,Name:'E',Project__c:PJ,Project__r:{Name:'HRP M1'},Planned_Release__c:'',OwnerId:''}]};
      if(/FROM ADM_Epic__c/.test(q))return {records:[{Id:EP}]};
      return {records:[]};},
    async update(o,id,f){upd.push(f);return {success:true};}};
  const r=await plan.syncEpics(sf,T,[{gusId:EP,projectId:PJ},{gusId:EP,projectId:BAD}]);
  assert.deepEqual(r.results.map(x=>x.ok),[true,false]);assert.equal(upd.length,1);assert.equal(upd[0].Project__c,PJ);assert.match(r.results[1].err,/not in this team/);
  const g=await plan.refreshEpics(sf,T,[EP,'junk']);assert.equal(g.epics[0].projectId,PJ);assert.equal(g.epics[0].projectName,'HRP M1');
});

test('createWorkstream makes a parent User Story with the R<release>_<team>_Workstream theme, idempotently',async()=>{
  const EP='a0XEE00000EPC0001A',TAG='a1TEE00000TAG0001A',log=[],themes=new Map(),assigned=new Set();let nid=0,work=null;
  const sf={async query(q){log.push(['q',q]);
      if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:'Message Queue'}]};
      if(/FROM ADM_Epic__c/.test(q))return {records:q.includes(EP)?[{Id:EP,Name:'E'}]:[]};
      if(/FROM ADM_Product_Tag__c/.test(q))return {records:q.includes(TAG)?[{Id:TAG}]:[]};
      if(/FROM RecordType/.test(q))return {records:[{Id:'0129000000006gDAAQ'}]};
      if(/FROM ADM_Work__c/.test(q))return {records:work?[{Id:work}]:[]};
      if(/FROM ADM_Theme__c/.test(q)){const n=/Name = '((?:[^'\\]|\\.)*)'/.exec(q)[1];return {records:themes.has(n)?[{Id:themes.get(n)}]:[]};}
      if(/FROM ADM_Theme_Assignment__c/.test(q)){const m=/Theme__c = '(\w+)' AND Work__c = '(\w+)'/.exec(q);return {records:assigned.has(m[1]+m[2])?[{Id:'x'}]:[]};}
      return {records:[]};},
    async create(o,f){log.push(['c',o,f]);const id=o.slice(4,7)+'EE0000000'+String(++nid).padStart(6,'0');
      if(o==='ADM_Work__c')work=id;if(o==='ADM_Theme__c')themes.set(f.Name,id);if(o==='ADM_Theme_Assignment__c')assigned.add(f.Theme__c+f.Work__c);return {success:true,id};}};
  const inp={epicGusId:EP,name:'API changes',assigneeId:ENG,tagId:TAG,};
  const r=await plan.createWorkstream(sf,T,inp);
  const w=log.find(x=>x[0]==='c'&&x[1]==='ADM_Work__c')[2];
  assert.deepEqual(w,{Subject__c:'WS: API changes',Epic__c:EP,Scrum_Team__c:T,RecordTypeId:'0129000000006gDAAQ',Product_Tag__c:TAG,Details__c:'Workstream "API changes" of epic "E". Engineers add their work items as child stories of this story (Parent).',Assignee__c:ENG});
  assert.equal(r.created,true);assert.deepEqual(r.themes,['R268_MQ_Workstream']);assert.equal(log.filter(x=>x[1]==='ADM_Theme_Assignment__c').length,1);
  const again=await plan.createWorkstream(sf,T,inp);   // retry: nothing duplicated
  assert.equal(again.created,false);assert.equal(log.filter(x=>x[0]==='c').length,3);
  await assert.rejects(plan.createWorkstream(sf,T,{...inp,epicGusId:'a0XEE00000OTHER01A'}),/does not belong/);
  await assert.rejects(plan.createWorkstream(sf,T,{...inp,tagId:'a1TEE00000OTHER01A'}),/product tag/);
  await assert.rejects(plan.createWorkstream(sf,T,{...inp,tagId:''}),/product tag/);
  await assert.rejects(plan.createWorkstream(sf,T,{...inp,epicGusId:''}),/not in GUS yet/);
  await assert.rejects(plan.createWorkstream(sf,T,{...inp,name:' '}),/workstream name/);
});

test('listEpics returns the team epics for the add-existing picker',async()=>{
  const sf={async query(q){assert.match(q,new RegExp(`Team__c = '${T}'`));return {records:[{Id:'a3QEE000002pXaH2AU',Name:'E1',Project__c:'a1PEE00000PRJ0001A',Project__r:{Name:'M1',V2MOM_Method__c:'meth',Program__c:PROG,Program__r:{Name:'MQ - 268'}},Planned_Release__c:REL,Planned_Release__r:{Name:'MQ 268'},Development_Lead__c:ENG,Development_Lead__r:{Name:'Ann'},Planned_Story_Points__c:12}]};}};
  const r=await plan.listEpics(sf,T);
  assert.deepEqual(r.epics[0],{id:'a3QEE000002pXaH2AU',name:'E1',projectId:'a1PEE00000PRJ0001A',projectName:'M1',method:'meth',programId:PROG,programName:'MQ - 268',releaseId:REL,releaseName:'MQ 268',leadId:ENG,leadName:'Ann',points:12});
});
test('deleteProject only deletes an empty project in the team program',async()=>{
  const PID='a1PEE00000PRJ0001A',del=[];
  const mk=(o={})=>({async query(q){if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:'Message Queue'}]};if(/FROM PPM_Program__c/.test(q))return {records:[{Id:PROG,Name:'MQ - 268'}]};if(/FROM PPM_Project__c/.test(q))return {records:o.foreign?[]:[{Id:PID,Name:'M9: Gone'}]};if(/COUNT\(\)/.test(q))return {totalSize:o.epics||0,records:[]};return {records:[]};},
    async delete(obj,id){if(o.refuse)throw new Error('insufficient access rights');del.push([obj,id]);}});
  const r=await plan.deleteProject(mk(),T,{gusId:PID});assert.equal(r.deleted,true);assert.deepEqual(del,[['PPM_Project__c',PID]]);
  await assert.rejects(plan.deleteProject(mk({epics:2}),T,{gusId:PID}),/still has 2 epics/);
  await assert.rejects(plan.deleteProject(mk({foreign:true}),T,{gusId:PID}),/not in this team/);
  await assert.rejects(plan.deleteProject(mk({refuse:true}),T,{gusId:PID}),/refused to delete/);
  await assert.rejects(plan.deleteProject(mk(),T,{gusId:'bad id'}),/not in GUS/);
  assert.equal(del.length,1);
});

test('createWorkstream tags the story with R<release>_<team>_Workstream, reusing an org-wide theme and never leaking HTML',async()=>{
  const EP='a0XEE00000EPC0001A',TAG='a1TEE00000TAG0001A',THEME='a0pEE000001Dfb3YAC';let work=null;const created=[],assigned=[];
  const mk=(o={})=>({async query(q){
      if(/FROM ADM_Epic__c/.test(q))return {records:[{Id:EP,Name:'E',Planned_Release__r:o.rel?{Name:o.rel}:null}]};
      if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:o.team||'Message Queue'}]};
      if(/FROM ADM_Product_Tag__c/.test(q))return {records:[{Id:TAG}]};
      if(/FROM RecordType/.test(q))return {records:[{Id:'0129000000006gDAAQ'}]};
      if(/FROM ADM_Work__c/.test(q))return {records:work?[{Id:work}]:[]};
      if(/FROM ADM_Theme__c/.test(q))return {records:o.exists&&!q.includes('Scrum_Team__c')?[{Id:THEME}]:[]};
      return {records:[]};},
    async create(obj,f){if(obj==='ADM_Work__c'){work='a0WEE0000000000001';return {success:true,id:work};}
      if(obj==='ADM_Theme__c'){created.push(f.Name);return o.fail?{success:false,errors:['A <a href="/x">theme</a> <img src=x denied']}:{success:true,id:'a0pEE000000000NEW1'};}
      assigned.push(f.Theme__c);return {success:true,id:'a0qEE0000000000001'};}});
  const inp={epicGusId:EP,name:'API',tagId:TAG};
  let r=await plan.createWorkstream(mk({exists:true}),T,inp);   // theme owned elsewhere: reused, nothing created
  assert.deepEqual(r.themes,['R268_MQ_Workstream']);assert.deepEqual(r.warnings,[]);assert.deepEqual(created,[]);assert.deepEqual(assigned,[THEME]);
  work=null;r=await plan.createWorkstream(mk({rel:'MAPS 269',team:'Managed Async Processing Service (MAPS)'}),'a00B0000000w4ZiIAI',inp);   // release + team vary
  assert.deepEqual(created,['R269_MAPS_Workstream']);
  work=null;r=await plan.createWorkstream(mk({fail:true}),T,inp);
  assert.ok(r.warnings.length===1&&!/[<>]/.test(r.warnings[0]),JSON.stringify(r.warnings));
});

test('workstream theme short forms per team; unmapped team warns and applies no theme; duplicate wording and object errors are handled',async()=>{
  const EP='a0XEE00000EPC0001A',TAG='a1TEE00000TAG0001A',THEME='a0pEE000001Dfb3YAC';let work,team,created,assigned,first;
  const mk=(o={})=>({async query(q){
      if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:team}]};
      if(/FROM ADM_Epic__c/.test(q))return {records:[{Id:EP,Name:'E'}]};
      if(/FROM ADM_Product_Tag__c/.test(q))return {records:[{Id:TAG}]};
      if(/FROM RecordType/.test(q))return {records:[{Id:'0129000000006gDAAQ'}]};
      if(/FROM ADM_Work__c/.test(q))return {records:work?[{Id:work}]:[]};
      if(/FROM ADM_Theme__c/.test(q)){return {records:o.race&&!first?[{Id:THEME}]:[]};}
      return {records:[]};},
    async create(obj,f){if(obj==='ADM_Work__c'){work='a0WEE0000000000001';return {success:true,id:work};}
      if(obj==='ADM_Theme__c'){created.push(f.Name);first=false;return o.race?{success:false,errors:[{message:'duplicate value found: Name duplicates value on record',statusCode:'DUPLICATE_VALUE'}]}:{success:true,id:'a0pEE000000000NEW1'};}
      assigned.push(f.Theme__c);return {success:true,id:'a0qEE0000000000001'};}});
  const run=async(name,o,id)=>{work=null;team=name;created=[];assigned=[];first=false;return plan.createWorkstream(mk(o),id,{epicGusId:EP,name:'API',tagId:TAG});};
  const ids=['a00B0000000w4ZjIAI','a00B0000000w4ZkIAI','a00B0000000w4ZlIAI','a00B0000000w4ZmIAI','a00B0000000w4ZnIAI','a00B0000000w4ZoIAI'];
  const cases=[['Message Queue','MQ'],['Managed Async Processing Service (MAPS)','MAPS'],['VegaCache FACE','VC-FACE'],['VegaStore','VS'],['Caching Services','VC']];
  for(const [i,[n,sh]] of cases.entries()){const r=await run(n,{},ids[i]);assert.deepEqual(r.themes,[`R268_${sh}_Workstream`],n);assert.deepEqual(created,[`R268_${sh}_Workstream`]);}
  const u=await run('Some Other Team',{},ids[5]);   // no short form: no shared catch-all theme
  assert.deepEqual(u.themes,[]);assert.equal(u.warnings.length,1);assert.match(u.warnings[0],/no theme short form/);assert.deepEqual(created,[]);assert.deepEqual(assigned,[]);
  first=true;work=null;team='Message Queue';created=[];assigned=[];   // lost a creation race: GUS answers DUPLICATE_VALUE, theme is re-found
  const rr=await plan.createWorkstream(mk({race:true}),'a00B0000000w4ZpIAI',{epicGusId:EP,name:'API',tagId:TAG});
  assert.deepEqual(created,['R268_MQ_Workstream']);   // create really ran and lost the race
  assert.deepEqual(rr.warnings,[]);assert.deepEqual(assigned,[THEME]);
});

test('theme short forms need whole words, and GUS error objects read as text',async()=>{
  const EP='a0XEE00000EPC0001A',TAG='a1TEE00000TAG0001A';
  const sf=team=>({async query(q){
      if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:team}]};
      if(/FROM ADM_Epic__c/.test(q))return {records:[{Id:EP,Name:'E'}]};
      if(/FROM ADM_Product_Tag__c/.test(q))return {records:[{Id:TAG}]};
      if(/FROM RecordType/.test(q))return {records:[{Id:'0129000000006gDAAQ'}]};
      return {records:[]};},
    async create(o){return o==='ADM_Work__c'?{success:false,errors:[{message:'<b>Field</b> required',statusCode:'REQUIRED_FIELD_MISSING'},{statusCode:'ONLY_CODE'}]}:{success:true,id:'a0pEE000000000NEW1'};}});
  await assert.rejects(plan.createWorkstream(sf('Roadmaps Team'),'a00B0000000w4ZqIAI',{epicGusId:EP,name:'API',tagId:TAG}),e=>/Field required, ONLY_CODE/.test(e.message)&&!/[<>]|\[object/.test(e.message));
  const ok=(team,id)=>({...sf(team),async create(o){return {success:true,id:'a0WEE0000000000001'};}});
  const r=await plan.createWorkstream(ok('Roadmaps Team'),'a00B0000000w4ZrIAI',{epicGusId:EP,name:'API',tagId:TAG});
  assert.deepEqual(r.themes,[]);assert.match(r.warnings[0],/no theme short form/);
  const v=await plan.createWorkstream(ok('VegaCache Interface'),'a00B0000000w4ZsIAI',{epicGusId:EP,name:'API2',tagId:TAG});
  assert.deepEqual(v.themes,['R268_VC_Workstream']);   // \bface\b does not match "Interface"
});

test('SMART goal: saved at the top of the GUS description (replacing the old one); draft falls back to a template; epic must be the team\'s',async()=>{
  const EP='a0XEE00000EPC0001A',upd=[];
  const sf={async query(q){return {records:q.includes(EP)?[{Id:EP,Name:'E',Description__c:'SMART Goal: old goal\n\nBody text'}]:[]};},async update(o,id,f){upd.push(f);return {success:true};}};
  await plan.saveSmartGoal(sf,T,EP,'Deliver X by R268.');
  assert.equal(upd[0].Description__c,'SMART Goal: Deliver X by R268.\n\nBody text');
  await assert.rejects(()=>plan.saveSmartGoal(sf,T,'a0XEE00000EPC0002A','g'),/does not belong/);
  const g=await plan.generateSmartGoal(sf,T,{name:'Queue hardening',release:'R268',workstreams:[{name:'Retry',days:3}],gusId:EP});
  assert.match(g.prompt,/EPIC TITLE: Queue hardening/);assert.match(g.prompt,/Retry \(3d\)/);assert.match(g.prompt,/Body text/);assert.doesNotMatch(g.prompt,/old goal/);assert.equal(g.descriptionUsed,true);assert.equal(g.maxWords,45);
  assert.equal(plan.withSmartGoal('x',''),'x');
});
