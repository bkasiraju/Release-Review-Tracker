'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const planner=require('../backend/plan');
const T='a00B0000000w4ZhIAI',EP='a1B000000000001AAA',TAG='a1C000000000001AAA',W='a07000000000001AAA',TD='a2D000000000001AAA';
function sf(created){return {
  async query(q){
    if(/FROM ADM_Work__c WHERE Product_Tag__c IN/.test(q)&&/LIMIT 300/.test(q))return {records:[{Id:W,Name:'W-0123456',Subject__c:'PRB: cache evictions',Status__c:'New',Product_Tag__r:{Name:'MQ'},Assignee__r:{Name:'Ann'}}]};
    if(/FROM ADM_Work__c WHERE Id = '/.test(q))return {records:[{Id:W,Name:'W-0123456',Subject__c:'PRB: cache evictions',Status__c:'New',Assignee__c:'005000000000001AAA',Product_Tag__c:TAG}]};
    if(/FROM ADM_Team_Dependency__c WHERE Provider_Team__c/.test(q)&&/LIMIT 300/.test(q))return {records:[{Id:TD,Name:'TD-0350171',Deliverable__c:'Paved path',Dependency_Status__c:'Accepted',Dependent_Team__r:{Name:'Core'}}]};
    if(/FROM ADM_Team_Dependency__c WHERE Id/.test(q))return {records:[{Id:TD,Name:'TD-0350171',Deliverable__c:'Paved path',Dependency_Status__c:'Accepted',Dependent_Team__r:{Name:'Core'}}]};
    if(/Subject__c LIKE 'WS: %' AND Status__c != 'Never'/.test(q))return {records:[{Id:'a07000000000009AAA',Subject__c:'WS: TD-0350171 Paved path',Epic__r:{Name:'Epic X'}}]};
    if(/FROM ADM_Product_Tag__c WHERE Team__c/.test(q))return {records:[{Id:TAG,Name:'MQ'}]};
    if(/FROM ADM_Epic__c WHERE Id/.test(q))return {records:[{Id:EP,Name:'Epic X',Planned_Release__r:{Name:'268'}}]};
    if(/FROM ADM_Product_Tag__c WHERE Id/.test(q))return {records:[{Id:TAG}]};
    if(/FROM RecordType/.test(q))return {records:[{Id:'012000000000001AAA'}]};
    if(/FROM ADM_Scrum_Team__c/.test(q))return {records:[{Name:'MQ Team'}]};
    return {records:[]};
  },
  async create(o,f){created.push([o,f]);return {success:true,id:'a07000000000002AAA'};}};}
test('lists open CARR and TDs and flags the ones already in a workstream',async()=>{
  const r=await planner.listBacklog(sf([]),T);
  assert.equal(r.carr[0].key,'W-0123456');assert.equal(r.carr[0].workstream,'');
  assert.equal(r.td[0].workstream,'Epic X');assert.equal(r.tags[0].id,TAG);
});
test('pulling items creates workstream stories in the epic with the source noted',async()=>{
  const created=[];
  const r=await planner.assignBacklog(sf(created),T,{epicGusId:EP,tagId:TAG,items:[{id:W,kind:'carr'},{id:'bad',kind:'td'}]});
  assert.equal(r.results[0].ok,true);assert.equal(r.results[1].ok,false);
  const ws=created.find(c=>c[0]==='ADM_Work__c')[1];
  assert.match(ws.Subject__c,/^WS: W-0123456 PRB: cache evictions/);assert.equal(ws.Epic__c,EP);assert.equal(ws.Assignee__c,'005000000000001AAA');assert.match(ws.Details__c,/Imported from work item W-0123456/);
});
test('pasted W-/TD- ids resolve and unknown ones are reported missing',async()=>{
  const s=sf([]),q=s.query;
  s.query=async x=>/FROM ADM_Work__c WHERE Name IN/.test(x)?{records:[{Id:W,Name:'W-0123456',Subject__c:'PRB: x',Status__c:'New'}]}:q(x);
  const r=await planner.resolveItems(s,T,{text:'W-0123456, W-9999999'});
  assert.equal(r.items[0].key,'W-0123456');assert.deepEqual(r.missing,['W-9999999']);
  await assert.rejects(planner.resolveItems(s,T,{text:'nothing here'}),/Enter W-numbers/);
});
test('report rows are read from the Analytics API and rejected when the report has no Work ID column',async()=>{
  const s=sf([]),q=s.query;
  s.query=async x=>/FROM ADM_Work__c WHERE (Name|Id) IN/.test(x)?{records:[{Id:W,Name:'W-0123456',Subject__c:'PRB: x',Status__c:'New'}]}:q(x);
  s.request=async()=>({reportMetadata:{name:'Open CARR',reportFormat:'TABULAR',detailColumns:['CUST_NAME']},reportExtendedMetadata:{detailColumnInfo:{CUST_NAME:{entityColumnName:'ADM_Work__c.Name'}}},factMap:{'T!T':{rows:[{dataCells:[{label:'W-0123456',value:W}]}]}}});
  const r=await planner.reportItems(s,T,'https://x/lightning/r/Report/00OEE000001gJ452AE/view');
  assert.equal(r.items[0].key,'W-0123456');assert.equal(r.report,'Open CARR');
  s.request=async()=>({reportMetadata:{name:'R',reportFormat:'TABULAR',detailColumns:['A']},reportExtendedMetadata:{detailColumnInfo:{A:{entityColumnName:'Foo'}}},factMap:{}});
  await assert.rejects(planner.reportItems(s,T,'00OEE000001gJ452AE'),/Work ID or TD column/);
});
