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

test('provisioning creates the seeded projects in this team\'s own program and saves the links per team',async()=>{
  const store=mkStore(),T1='a00B0000000w4ZjIAI',T2='a00B0000000w4ZkIAI',made=[],existing=new Set(['HRP M1.1.1 - HRP meets all defined goals on the E360 dashboard']);
  const sf=(prog)=>({async query(q){
    if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:prog==='MQ - 268'?'Message Queue':'Team Alpha'}]};
    if(/FROM PPM_Program__c/.test(q))return {records:[{Id:'a1FEE00000PROG'+prog.length+'A',Name:prog}]};
    const m=q.match(/FROM PPM_Project__c WHERE Name = '(.*)' AND/);if(m&&existing.has(m[1].replace(/\\'/g,"'")))return {records:[{Id:'a1PEE00000EXIST1A'}]};
    return {records:[]};},
    async create(o,f){made.push([f.Program__c,f.Name,f.V2MOM_Method__c]);return {success:true,id:'a1PEE0000000'+String(made.length).padStart(3,'0')+'A'};},
    async update(){return {success:true};}});
  const r1=await plan.provisionProjects(sf('MQ - 268'),store,T1);
  assert.equal(r1.created,23);assert.equal(r1.linked,1);assert.equal(r1.failed,0);
  const p1=(await plan.getPlan(store,T1)).plan.projects;
  assert.ok(p1.every(p=>p.gusId&&p.programName==='MQ - 268'));
  assert.ok(made.every(m=>m[0]==='a1FEE00000PROG'+'MQ - 268'.length+'A'));
  assert.equal(made.find(m=>/M5\.5\.1/.test(m[1]))[2],'HPS M6.2.2');
  // another team still has no GUS link until it is provisioned, and gets its own ids
  const p2=(await plan.getPlan(store,T2)).plan.projects;assert.equal(p2.length,24);assert.ok(p2.every(p=>!p.gusId));
  const r2=await plan.provisionProjects(sf('Team Alpha - 268'),store,T2);assert.equal(r2.created+r2.linked,24);
  const again=await plan.provisionProjects(sf('MQ - 268'),store,T1);assert.equal(again.created+again.linked,0);
});

test('provisioning reports a team with no GUS program instead of failing',async()=>{
  const store=mkStore(),sf={async query(q){return {records:/Scrum_Team/.test(q)?[{Name:'Ghost'}]:[]};}};
  const r=await plan.provisionProjects(sf,store,'a00B0000000w4ZlIAI');assert.equal(r.created,0);assert.match(r.errors[0],/No GUS program/);
});
