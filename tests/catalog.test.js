'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const plan=require('../backend/plan'),{SEED_PROJECTS}=require('../backend/seed-projects');
const A='a00B0000000w4ZhIAI',B='a00B0000000w4ZiIAI',ENG='005EE00000ENG0001A';
const mkStore=()=>{const mem={};let n=0;return {shared:true,mem,async get(t,id){return mem[id]||null;},async put(t,id,v,exp){const cur=mem[id];if(exp!==undefined&&(cur?.revision??null)!==exp)throw Error('This record changed. Reload and try again.');mem[id]={...v,revision:'r'+(++n),updatedAt:'now'};return mem[id];}};};
const win={start:'2026-11-16',end:'2027-01-29'};

test('seed projects: 24 HRP measures, names within the GUS limit, no-ref measures say so',()=>{
  assert.equal(SEED_PROJECTS.length,24);
  for(const p of SEED_PROJECTS){assert.ok(p.name.length<=80,p.name);assert.match(p.name,/^HRP M\d/);assert.ok(p.method);}
  assert.equal(new Set(SEED_PROJECTS.map(p=>p.id)).size,24);
  const by=n=>SEED_PROJECTS.find(p=>p.short==='HRP M'+n);
  assert.equal(by('1.1.1').method,'HPS M2.1.1 | HPS M2.1.2 | HPS M2.3.1');
  assert.equal(by('1.2.2.5').method,'NO V2MOM Reference');
  assert.equal(by('5.5.1').method,'HPS M6.2.2');
});

test('every team lists the seeded projects with their V2MOM method',async()=>{
  const store=mkStore();
  const a=(await plan.getPlan(store,A)).plan,b=(await plan.getPlan(store,B)).plan;
  assert.equal(a.projects.length,24);assert.equal(b.projects.length,24);
  assert.equal(b.projects.find(p=>p.short==='HRP M5.5.1').method,'HPS M6.2.2');
  const again=(await plan.getPlan(store,A)).plan;assert.equal(again.projects.length,24);
});

test('removing a shared project hides it for that team only',async()=>{
  const store=mkStore();
  const a=(await plan.getPlan(store,A)).plan,gone=a.projects[0].id;
  a.projects=a.projects.filter(p=>p.id!==gone);a.hiddenProjects=[gone];
  const saved=await plan.savePlan(store,A,a,null);
  assert.ok(!saved.plan.projects.some(p=>p.id===gone));assert.equal(saved.plan.projects.length,23);
  const reloaded=(await plan.getPlan(store,A)).plan;assert.ok(!reloaded.projects.some(p=>p.id===gone));
  const b=(await plan.getPlan(store,B)).plan;assert.ok(b.projects.some(p=>p.id===gone));assert.equal(b.projects.length,24);
});

test('a seed bump or a method edit by one team reaches the others, removals stay put',async()=>{
  const store=mkStore();
  const a=(await plan.getPlan(store,A)).plan;a.projects[1].method='HPS M9.9.9';
  await plan.savePlan(store,A,a,null);
  const b=(await plan.getPlan(store,B)).plan;assert.equal(b.projects[1].method,'HPS M9.9.9');
});

test('leave, holiday and on-call are saved per team in the plan and read back',async()=>{
  const store=mkStore(),a=(await plan.getPlan(store,A)).plan;
  a.window=win;a.people={[ENG]:{name:'Ann',leave:3,holiday:2,oncall:4,total:50}};
  await plan.savePlan(store,A,a,null);
  const got=(await plan.getPlan(store,A)).plan.people[ENG];
  assert.deepEqual(got,{name:'Ann',leave:3,holiday:2,oncall:4,total:50});
  assert.deepEqual((await plan.getPlan(store,B)).plan.people,{});
});

test('a project edit keeps seedVersion so the catalog is not re-seeded on every read',async()=>{
  const store=mkStore(),a=(await plan.getPlan(store,A)).plan;a.projects[0].method='HPS M1.1.1';
  await plan.savePlan(store,A,a,null);
  const doc=store.mem['plan-projects'];assert.equal(doc.seedVersion,1);assert.equal(doc.projects.length,24);
});

test('commit treats a shared project linked to another program as unlinked and uses this team\'s own',async()=>{
  const store=mkStore(),T1='a00B0000000w4ZnIAI',PROG='a1FEE00000PROGYYA',REL='a1EEE00000REL0001A',made=[];
  const base=(await plan.getPlan(store,T1)).plan,p0=base.projects[0];
  p0.gusId='a1PEE00000OTHER01A';p0.programId='a1FEE00000OTHERPA';
  base.epics=[{id:'e1',projectId:p0.id,name:'Epic',line:'ABL',releaseId:REL,releaseName:'R',workstreams:[{id:'w1',name:'x',days:3}]}];
  await plan.savePlan(store,T1,base,null);
  const sf={async query(q){if(/Scrum_Team/.test(q))return {records:[{Name:'Team Gamma'}]};if(/PPM_Program/.test(q))return {records:[{Id:PROG,Name:'Team Gamma - 268'}]};if(/Planned_Release__c/.test(q))return {records:[{Id:REL}]};if(/FROM PPM_Project__c/.test(q))return {records:[{Id:'a1PEE00000OWN0001A'}]};return {records:[]};},
    async create(o,f){made.push([o,f]);return {success:true,id:'a1XEE00000EPIC001A'};},async update(){return {success:true};}};
  const r=await plan.commitPlan(sf,store,T1,true,false,true);
  assert.equal(r.failed,0);const ep=made.find(m=>m[0]==='ADM_Epic__c');assert.equal(ep[1].Project__c,'a1PEE00000OWN0001A');
});

test('column search text covers epic and workstream values',()=>{
  const src=require('node:fs').readFileSync(require('node:path').join(__dirname,'../public/plan.js'),'utf8');
  assert.match(src,/function colText\(k,e,p\)/);assert.match(src,/data-cf="\$\{k\}"/);
});

test('findEpics resolves a W-number to its epic, an epic Id, or a name, from any project',async()=>{
  const T1='a00B0000000w4ZnIAI',qs=[];
  const row={Id:'a3QEE000002q44n2AA',Name:'Other epic',Team__r:{Name:'Team X'},Project__c:'a1PEE00000OTHER01A',Project__r:{Name:'Other proj'}};
  const sf={async query(q){qs.push(q);if(/FROM ADM_Work__c/.test(q))return {records:[{Epic__c:'a3QEE000002q44n2AA'}]};return {records:[row]};}};
  let r=await plan.findEpics(sf,T1,'W-12345678');
  assert.equal(r.epics[0].id,'a3QEE000002q44n2AA');assert.equal(r.epics[0].projectName,'Other proj');assert.match(qs.join('\n'),/Name = 'W-12345678'/);
  qs.length=0;r=await plan.findEpics(sf,T1,'https://gus.lightning.force.com/lightning/r/ADM_Epic__c/a3QEE000002q44n2AA/view');
  assert.match(qs[0],/Id = 'a3QEE000002q44n2AA'/);
  qs.length=0;await plan.findEpics(sf,T1,"it's 100%");assert.match(qs[0],/Name LIKE '%it\\'s 100\\%%'/);
  await assert.rejects(plan.findEpics(sf,T1,'ab'),/at least 3/);
});

test('an epic of another team is only tagged to the project on commit',async()=>{
  const store=mkStore(),T1='a00B0000000w4ZnIAI',PROG='a1FEE00000PROGYYA',OWN='a1PEE00000OWN0001A',updates=[];
  const base=(await plan.getPlan(store,T1)).plan,p0=base.projects[0];
  base.epics=[{id:'e1',projectId:p0.id,name:'Foreign epic',line:'ABL',releaseId:'',gusId:'a3QEE000002q44n2AA',foreign:true,workstreams:[]}];
  await plan.savePlan(store,T1,base,null);
  const sf={async query(q){if(/Scrum_Team/.test(q))return {records:[{Name:'Team Gamma'}]};if(/PPM_Program/.test(q))return {records:[{Id:PROG,Name:'Team Gamma - 268'}]};if(/FROM PPM_Project__c/.test(q))return {records:[{Id:OWN}]};return {records:[]};},
    async create(){return {success:true,id:OWN};},async update(o,id,f){updates.push([o,id,f]);return {success:true};}};
  const r=await plan.commitPlan(sf,store,T1,true,false,true);
  assert.equal(r.failed,0);const u=updates.find(x=>x[0]==='ADM_Epic__c');
  assert.deepEqual(Object.keys(u[2]),['Project__c']);assert.equal(u[2].Project__c,OWN);
});

test('commit looks up the real team of an epic instead of trusting the saved foreign flag',async()=>{
  const store=mkStore(),T1='a00B0000000w4ZnIAI',PROG='a1FEE00000PROGYYA',OWN='a1PEE00000OWN0001A',updates=[];
  const base=(await plan.getPlan(store,T1)).plan,p0=base.projects[0];
  base.epics=[{id:'e1',projectId:p0.id,name:'Sneaky epic',line:'ABL',releaseId:'',gusId:'a3QEE000002q44n2AA',foreign:false,workstreams:[]}];
  await plan.savePlan(store,T1,base,null);
  const sf={async query(q){if(/FROM ADM_Epic__c WHERE Id IN/.test(q))return {records:[{Id:'a3QEE000002q44n2AA',Team__c:'a00B0000000OTHER99'}]};if(/Scrum_Team/.test(q))return {records:[{Name:'Team Gamma'}]};if(/PPM_Program/.test(q))return {records:[{Id:PROG,Name:'Team Gamma - 268'}]};if(/FROM PPM_Project__c/.test(q))return {records:[{Id:OWN}]};return {records:[]};},
    async create(){return {success:true,id:OWN};},async update(o,id,f){updates.push([o,id,f]);return {success:true};}};
  const r=await plan.commitPlan(sf,store,T1,true,false,true);
  assert.equal(r.failed,0);const u=updates.find(x=>x[0]==='ADM_Epic__c');
  assert.deepEqual(Object.keys(u[2]),['Project__c']);
});

test('cleanPlan keeps added and removed engineers, dropping malformed ids',()=>{
  const c=plan.cleanPlan({window:win,hiddenEng:[ENG,'bad',ENG],extraEng:[{id:A,name:'Added Person'},{id:'nope',name:'x'},{id:A,name:'Added Person'}]});
  assert.deepEqual(c.hiddenEng,[ENG]);
  assert.deepEqual(c.extraEng,[{id:A,name:'Added Person'}]);
});

test('a team onboarded without shared projects starts empty, others keep the catalog; only the first load asks',async()=>{
  const store=mkStore();
  const first=(await plan.getPlan(store,A,async()=>true)).plan;
  assert.equal(first.projects.length,0);assert.equal(first.hiddenProjects.length,24);
  const other=(await plan.getPlan(store,B,async()=>false)).plan;assert.equal(other.projects.length,24);
  await plan.savePlan(store,A,first,null);
  let asked=false;const again=(await plan.getPlan(store,A,async()=>{asked=true;return true;})).plan;
  assert.equal(asked,false);assert.equal(again.projects.length,0);
});
