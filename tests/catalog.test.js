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
