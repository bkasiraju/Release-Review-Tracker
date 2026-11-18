'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'../public/plan.js'),'utf8');
const a=src.indexOf('const NAME_ABBR='),b=src.indexOf('// Shows "Suggested');
const smartShorten=new Function(src.slice(a,b)+'\nreturn smartShorten;')();
test('short names are untouched',()=>assert.equal(smartShorten('HRP M1.1.3: Baseline',80),'HRP M1.1.3: Baseline'));
test('acronym expansion is collapsed first',()=>{
  const r=smartShorten('HRP M1.2.5: VegaCache and MQ support Advanced Cross Region Continuity (ACRC) for disaster recovery by Q3',80);
  assert.equal(r,'HRP M1.2.5: VegaCache and MQ support ACRC for disaster recovery by Q3');
});
test('result always fits and keeps the leading code',()=>{
  const long='HRP M2.3.4: Deliver a comprehensive multi-region observability platform for every internal service team across the entire organisation in FY27';
  const r=smartShorten(long,80);assert.ok(r.length<=80,r);assert.ok(r.startsWith('HRP M2.3.4:'),r);
});
test('unbroken text is hard-truncated with an ellipsis',()=>{const r=smartShorten('x'.repeat(200),80);assert.equal(r.length,80);assert.ok(r.endsWith('…'));});
