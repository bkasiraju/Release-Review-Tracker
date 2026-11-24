const test=require('node:test'),assert=require('node:assert');
const {parseSheets}=require('../backend/v2mom-import');
const plan=require('../backend/plan');
const sheet=[['M1) Keep Trust'],['V2MOM Ref','#','HRP Measure','Primary Owner(s)'],['HPS M1.1','1.1','Section',''],['HPS M1.1.1','1.1.1','Meet goals','Jane Doe'],['HPS M1.1.2','1.1.2','Other goals','Raj Patel']];
test('parseSheets filters by owner',()=>{
  const r=parseSheets({M1:sheet},{owners:'jane'});
  assert.equal(r.measures.length,1);assert.equal(r.measures[0].code,'1.1.1');
  assert.equal(parseSheets({M1:sheet},{owners:''}).measures.length,2);
});
test('importV2mom requires a selection and a known program',async()=>{
  const T='a00000000000000AAA';
  await assert.rejects(plan.importV2mom({},{},T,{items:[]}),/Select at least one/);
  const sf={query:async()=>({records:[]})};
  await assert.rejects(plan.importV2mom(sf,{},T,{programName:'Nope',items:[{code:'1.1.1',name:'x'}]}),/No GUS program named/);
});
test('parseSheets reads the HTML snapshot layout (HRP# / Title / Owner, method heading row, multi-line title)',()=>{
  const rows=[['M1 · Keep Trust'],['HRP#','Title','Status','Owner','Comment'],['1.1.1','Meets goals\n\n- Security bugs\n- Availability','green','Amit Kumar, Jane Doe',''],['1.2','Section','','',''],['1.2.1','Other','red','Raj Patel','']];
  const r=parseSheets({M1:rows},{owners:'amit kumar'});
  assert.equal(r.skipped.length,0);assert.equal(r.measures.length,1);
  assert.equal(r.measures[0].name,'Meets goals');assert.equal(r.measures[0].method,'M1: Keep Trust');
});
test('a tab named M3 is method M3 even if a title cell names another method',()=>{
  const rows=[['M2) Something else'],['HRP#','Title','Owner'],['3.1.1','Goal','Jane']];
  assert.equal(parseSheets({M3:rows},{}).measures[0].method,'M3');
});
test('re-importing measures already on the dashboard changes nothing and creates nothing',async()=>{
  const {SEED_PROJECTS}=require('../backend/seed-projects');
  const mem={};const store={shared:true,async get(t,id){return mem[id]||null;},async put(t,id,v){mem[id]={...v,revision:(mem[id]?.revision||0)+1};return mem[id];}};
  const calls=[];const sf={query:async q=>({records:/PPM_Program__c/.test(q)?[{Id:'a0P000000000001AAA',Name:'Prog'}]:[]}),create:async(...a)=>{calls.push(a);return {success:true,id:'a0Q000000000009AAA'};},update:async(...a)=>{calls.push(a);return {success:true};}};
  const T='a00B0000000w4ZhIAI',p=SEED_PROJECTS[0];
  const r=await plan.importV2mom(sf,store,T,{programName:'Prog',prefix:'hrp',items:[{code:'1.1.1',name:p.name,short:p.short,method:'changed'},{code:'9.9.9',name:'HRP M9.9.9 - New',short:'HRP M9.9.9',method:'M9'}]});
  assert.equal(r.skipped,1);assert.equal(r.added,1);
  assert.equal(calls.filter(c=>c[0]==='PPM_Project__c').length,1);
  const pl=(await plan.getPlan(store,T)).plan;
  assert.equal(pl.projects.find(x=>x.id===p.id).method,p.method);
  assert.ok(pl.projects.some(x=>x.short==='HRP M9.9.9'));
});
