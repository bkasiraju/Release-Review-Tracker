const {test}=require('node:test');const assert=require('node:assert/strict');
const {Gus}=require('../backend/gus');const {Service}=require('../backend/service');
const ID='a0B000000000001',OTHER='a0B000000000002',VIEW='00B000000000001';
const LINK=`https://gus.my.salesforce.com/lightning/o/ADM_Epic__c/list?filterName=${VIEW}`;
function adapter(rows=[ID,OTHER]){const queries=[];const sf={request:async path=>{assert.match(typeof path==='string'?path:path.url,/ADM_Epic__c\/listviews\/00B000000000001\/describe/);return {id:VIEW,label:'Release 266',query:"SELECT Id, Name FROM ADM_Epic__c WHERE Health__c = 'On Track' ORDER BY Name ASC",columns:[{fieldNameOrPath:'Name',label:'Epic Name'},{fieldNameOrPath:'Health__c',label:'Health'},{fieldNameOrPath:'Epic_Health_Comments__c',label:'Epic Health Comments'},{fieldNameOrPath:'Owner.FirstName',label:'Owner First Name'},{fieldNameOrPath:'Secret__c',label:'Hidden',hidden:true}]};},query:async q=>{queries.push(q);return {records:rows.map(Id=>({Id})),done:true};}};return {gus:new Gus(sf),queries};}
test('one saved epic-list URL resolves many epics and the visible list columns',async()=>{
  const {gus,queries}=adapter();const result=await gus.resolveEpicInputs(LINK+'\n'+ID);
  assert.deepEqual(result.ids,[ID,OTHER]);assert.equal(result.sources[0].label,'Release 266');
  assert.ok(result.columns.some(c=>c.field==='Owner.FirstName'));assert.ok(!result.columns.some(c=>c.field==='Secret__c'));
  assert.match(queries[0],/SELECT Id FROM ADM_Epic__c WHERE Health__c = 'On Track' ORDER BY Name ASC LIMIT 501$/);
});
test('list API errors are actionable and do not fall back to a stale saved list',async()=>{
  const gus=new Gus({query:async()=>({records:[],done:true})});await assert.rejects(()=>gus.resolveEpicInputs(LINK),/list.view|REST|request/i);
  await assert.rejects(()=>gus.resolveEpicInputs('https://evil.test/lightning/o/ADM_Epic__c/list?filterName='+VIEW),/GUS/);
  await assert.rejects(()=>gus.resolveEpicInputs('https://gus.my.salesforce.com/lightning/o/ADM_Work__c/list?filterName='+VIEW),/epic/i);
});
test('oversized lists are rejected without silently truncating epic membership',async()=>{
  const {gus}=adapter(Array.from({length:501},(_,i)=>'a0B'+String(i).padStart(12,'0')));
  await assert.rejects(()=>gus.resolveEpicInputs(LINK),/500/);
});
test('query limit detection never changes quoted filter text',async()=>{
  let query='';const gus=new Gus({request:async()=>({query:"SELECT Name FROM ADM_Epic__c WHERE Name = 'LIMIT 1000' ORDER BY Name"}),query:async q=>{query=q;return {records:[],done:true};}});
  await gus.resolveEpicInputs(LINK);assert.equal(query,"SELECT Id FROM ADM_Epic__c WHERE Name = 'LIMIT 1000' ORDER BY Name LIMIT 501");
});
test('list developer names are resolved safely and recent views are explained',async()=>{
  const {gus,queries}=adapter();const original=gus.sf.query;gus.sf.query=async q=>q.includes('FROM ListView')?{records:[{Id:VIEW}],done:true}:original(q);
  const result=await gus.resolveEpicInputs(LINK.replace(VIEW,'Release_266'));
  assert.equal(result.ids.length,2);await assert.rejects(()=>gus.resolveEpicInputs(LINK.replace(VIEW,'Recent')),/saved list|Recently/i);
});
test('the supplied MAPS list URL resolves its developer name, including pasted Markdown',async()=>{
  const url='https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=MAPS_266_Review_Tracker1';
  const {gus}=adapter();const original=gus.sf.query;gus.sf.query=async q=>{if(q.includes('FROM ListView')){assert.match(q,/DeveloperName = 'MAPS_266_Review_Tracker1'/);return {records:[{Id:VIEW}],done:true};}return original(q);};
  assert.equal((await gus.resolveEpicInputs(`[${url}](${url})`)).ids.length,2);
});
test('Fetch refreshes live list membership while retaining drafts for removed epics',async()=>{
  class Store{constructor(){this.data=new Map();}async get(t,id){return JSON.parse(JSON.stringify(this.data.get(t+id)||null));}async list(t){return [...this.data].filter(([k])=>k.startsWith(t)).map(([,v])=>JSON.parse(JSON.stringify(v)));}async put(t,id,v,expected){const old=await this.get(t,id);if(expected!==undefined&&(old?.revision??null)!==expected)throw Error('changed');const doc={...v,revision:require('crypto').randomUUID()};this.data.set(t+id,doc);return doc;}}
  const store=new Store();let ids=[ID];const {gus}=adapter();gus.resolveEpicInputs=async()=>({ids,sources:[{url:LINK,id:VIEW,label:'Release 266'}],columns:[{key:'name',field:'Name',label:'Epic Name'}]});gus.epics=async list=>({epics:list.map(id=>({id,name:id,comments:'',modified:'now'}))});
  const service=new Service(store,gus);let r=await service.saveRelease({name:'Release',year:2026,links:LINK});await service.fetch(r.id);await service.saveDraft({epicId:ID,month:'2026-11',value:'Keep my draft',revision:null});ids=[OTHER];await service.fetch(r.id);
  r=await service.release(r.id);assert.deepEqual(r.epicIds,[OTHER]);assert.equal(r.inputLinks,LINK);assert.equal((await store.get('epic',ID)).drafts['2026-11'].value,'Keep my draft');
});
