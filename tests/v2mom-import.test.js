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
