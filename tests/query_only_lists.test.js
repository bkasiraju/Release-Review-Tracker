const {test}=require('node:test');const assert=require('node:assert/strict');
const {Gus}=require('../backend/gus');
const VIEW='00B000000000001',ID='a0B000000000001';
const URL='https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=MAPS_266_Review_Tracker1';
const definition={id:VIEW,developerName:'MAPS_266_Review_Tracker1',objectApiName:'ADM_Epic__c',label:'MAPS 266 Review Tracker1',query:"SELECT Name FROM ADM_Epic__c WHERE Health__c = 'Watch'",columns:[{fieldNameOrPath:'Name',label:'Epic Name'},{fieldNameOrPath:'Epic_Health_Comments__c',label:'Epic Health Comments'}],verifiedAt:'2026-11-02T00:00:00Z',digest:'verified-digest'};
test('query-only hosts execute the exact verified list filters for multiple current records',async()=>{
  const queries=[];let rows=[{Id:ID},{Id:'a0B000000000002'}];const sf={query:async q=>{queries.push(q);return {records:q.includes('FROM ListView')?[]:rows,done:true};}};
  const g=new Gus(sf,{definitions:[definition]});const out=await g.resolveEpicInputs(URL);
  assert.equal(out.ids.length,2);assert.match(queries[1],/WHERE Health__c = 'Watch' LIMIT 501$/);
  assert.equal(out.sources[0].definitionSource,'verified-definition');assert.equal(out.sources[0].definitionVerifiedAt,definition.verifiedAt);
  rows=[{Id:ID}];assert.equal((await g.resolveEpicInputs(URL)).ids.length,1);
});
test('query-only hosts accept verified direct list IDs and preserve visible columns',async()=>{
  const sf={query:async()=>({records:[{Id:ID}],done:true})};const out=await new Gus(sf,{definitions:[definition]}).resolveEpicInputs(URL.replace('MAPS_266_Review_Tracker1',VIEW));
  assert.equal(out.ids.length,1);assert.ok(out.columns.some(c=>c.key==='months'));
});
test('unregistered lists require an actual definition instead of guessed filters',async()=>{
  const sf={query:async()=>({records:[],done:true})};await assert.rejects(()=>new Gus(sf,{definitions:[]}).resolveEpicInputs(URL),/verified.*definition|connect.*list/i);
});
test('recreated list IDs cannot accidentally reuse an earlier definition',async()=>{
  const sf={query:async q=>({records:q.includes('FROM ListView')?[{Id:'00B000000000002'}]:[{Id:ID}],done:true})};
  await assert.rejects(()=>new Gus(sf,{definitions:[definition]}).resolveEpicInputs(URL),/definition|list.view/i);
});
