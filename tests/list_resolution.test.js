const {test}=require('node:test');const assert=require('node:assert/strict');
const {Gus}=require('../backend/gus');const {handleRequest}=require('../backend');
const VIEW='00B000000000001',ID='a0B000000000001';
const LINK='https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=MAPS_266_Review_Tracker1';
test('an empty SOQL metadata lookup falls back to the visible REST list catalog',async()=>{
  const paths=[];const sf={query:async q=>({records:q.includes('FROM ListView')?[]:[{Id:ID}],done:true}),request:async path=>{paths.push(path);return path.endsWith('/describe')?{query:'SELECT Name FROM ADM_Epic__c',columns:[]}:{listviews:[{id:VIEW,developerName:'MAPS_266_Review_Tracker1',label:'MAPS 266 Review Tracker1'}],done:true};}};
  const out=await new Gus(sf).resolveEpicInputs(LINK);assert.deepEqual(out.ids,[ID]);assert.ok(paths[0].endsWith('/listviews'));assert.ok(paths[1].endsWith('/'+VIEW+'/describe'));
});
test('catalog name lookup follows safe pagination and supports a unique label alias',async()=>{
  const sf={query:async q=>({records:q.includes('FROM ListView')?[]:[{Id:ID}],done:true}),request:async path=>path.endsWith('/describe')?{query:'SELECT Id FROM ADM_Epic__c'}:path.includes('page=2')?{listviews:[{id:VIEW,label:'MAPS 266 Review Tracker1',developerName:'Different_Internal_Name'}],done:true}:{listviews:[],done:false,nextRecordsUrl:'/services/data/v62.0/sobjects/ADM_Epic__c/listviews?page=2'}};
  assert.equal((await new Gus(sf).resolveEpicInputs(LINK)).ids[0],ID);
});
test('ambiguous catalog labels are never resolved to an arbitrary list',async()=>{
  const sf={query:async()=>({records:[],done:true}),request:async()=>({listviews:[{id:VIEW,label:'MAPS 266 Review Tracker1'},{id:'00B000000000002',label:'MAPS 266 Review Tracker1'}],done:true})};
  await assert.rejects(()=>new Gus(sf).resolveEpicInputs(LINK),/multiple|ambiguous/i);
});
test('unresolved names report the API connection and do not assert a sharing problem',async()=>{
  const sf={query:async()=>({records:[],done:true}),request:async()=>({listviews:[],done:true}),identity:async()=>({username:'api-user@gus.com',organization_id:'test-org'})};
  await assert.rejects(()=>new Gus(sf).resolveEpicInputs(LINK),error=>/api-user@gus.com/.test(error.message)&&!/not shared with you/.test(error.message));
});
test('nested signed-in user connection is preferred over the generic Salesforce facade',async()=>{
  let generic=0,viewer=0;const user={query:async()=>{viewer++;return {records:[],done:true};},identity:async()=>({username:'viewer@gus.com'})};
  const out=await handleRequest({sf:{query:async()=>{generic++;return {records:[],done:true};}},invocation:{viewerConnection:user},request:{body:{action:'connection'}}});
  assert.equal(out.ok,true);assert.equal(out.payload.username,'viewer@gus.com');assert.equal(viewer,1);assert.equal(generic,0);
});
