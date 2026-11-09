const {test}=require('node:test');const assert=require('node:assert/strict');
const {Service}=require('../backend/service');
const {Gus,parseEpicLinks}=require('../backend/gus');
const {ContentStore}=require('../backend/store');
const {parseComments}=require('../backend/comments');
const ID='a0B000000000001', ID2='a0B000000000002';
class MemoryStore{
  constructor(){this.docs=new Map();}
  async get(type,id){return structuredClone(this.docs.get(type+id)||null);}
  async list(type){return [...this.docs.entries()].filter(([k])=>k.startsWith(type)).map(([,v])=>structuredClone(v));}
  async put(type,id,data,expected){const old=await this.get(type,id);if(expected!==undefined&&(old?.revision??null)!==expected)throw Error('This record changed. Reload and try again.');const v={...structuredClone(data),revision:require('crypto').randomUUID()};this.docs.set(type+id,v);return structuredClone(v);}
}
class FakeGus{
  constructor(){this.rows={[ID]:{id:ID,name:'Epic One',comments:'Sept Update\nKeep\nOct Update\nOld',modified:'2026-10-01T00:00:00Z'}};this.writes=0;}
  async epics(ids){return {epics:ids.filter(id=>this.rows[id]).map(id=>structuredClone(this.rows[id])),unavailable:[]};}
  async epic(id){if(!this.rows[id])throw Error('Epic not visible');return structuredClone(this.rows[id]);}
  async updateComments(id,text,modified){if(this.rows[id].modified!==modified)throw Error('Concurrent update');this.writes++;this.rows[id].comments=text;this.rows[id].modified='2026-11-02T00:00:00Z';return {conditional:true};}
}
async function setup(){const store=new MemoryStore(),gus=new FakeGus(),s=new Service(store,gus);const r=await s.saveRelease({name:'Release 266',year:2026,links:ID});await s.fetch(r.id);return {s,store,gus,r};}
test('validates links, rejects list views and non-GUS links; deduplicates 15/18 IDs',()=>{
  assert.deepEqual(parseEpicLinks(ID+'\nhttps://gus.my.salesforce.com/lightning/r/ADM_Epic__c/'+ID+'/view'),[ID]);
  assert.throws(()=>parseEpicLinks('https://evil.test/'+ID));
  assert.throws(()=>parseEpicLinks('https://gus.my.salesforce.com/lightning/o/ADM_Epic__c/list'));
  assert.throws(()=>parseEpicLinks('https://gus.my.salesforce.com/lightning/r/ADM_Work__c/'+ID+'/view'));
});
test('draft survives fetch and new service instance; sync preserves fresh remote other month',async()=>{
  const {s,store,gus,r}=await setup();
  await s.saveDraft({epicId:ID,month:'2026-10',value:'New',revision:null});
  gus.rows[ID].comments='Sept Update\nRemotely changed\nOct Update\nOld';await s.fetch(r.id);
  const fresh=new Service(store,gus);assert.equal((await fresh.state()).epics[0].drafts['2026-10'].value,'New');
  const result=await fresh.sync(r.id);assert.equal(result.results[0].status,'synced');
  assert.equal(parseComments(gus.rows[ID].comments,2026).months['2026-09'],'Remotely changed');
  assert.equal(Object.keys((await s.state()).epics[0].drafts).length,0);
});
test('same-month remote edit reports conflict and requires explicit rebased draft',async()=>{
  const {s,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-10',value:'Mine',revision:null});
  gus.rows[ID].comments='Oct Update\nTheirs';let out=await s.sync(r.id);
  assert.equal(out.results[0].status,'conflict');assert.equal(gus.writes,0);
  const d=(await s.state()).epics[0].drafts['2026-10'];
  await s.saveDraft({epicId:ID,month:'2026-10',value:'Combined',revision:d.revision,resolve:true,expectedRemote:'Theirs'});
  out=await s.sync(r.id);assert.equal(out.results[0].status,'synced');
});
test('verification failures keep drafts; a later retry recognizes already saved month',async()=>{
  const {s,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-10',value:'Mine',revision:null});
  let reads=0;const original=gus.epic.bind(gus);gus.epic=async id=>{reads++;if(reads===2)throw Error('Verification unavailable');return original(id);};
  let out=await s.sync(r.id);assert.equal(out.results[0].status,'error');assert.ok((await s.state()).epics[0].drafts['2026-10']);
  gus.epic=original;out=await s.sync(r.id);assert.equal(out.results[0].status,'synced');assert.equal(gus.writes,1);
});
test('partial failures do not stop independent epics or discard drafts',async()=>{
  const {s,gus,r}=await setup();gus.rows[ID2]={...gus.rows[ID],id:ID2,name:'Epic Two'};
  const release=await s.saveRelease({...r,links:ID+'\n'+ID2});await s.fetch(release.id);
  for(const id of [ID,ID2])await s.saveDraft({epicId:id,month:'2026-10',value:'New',revision:null});
  const update=gus.updateComments.bind(gus);gus.updateComments=async(id,...a)=>{if(id===ID)throw Error('Write denied');return update(id,...a);};
  const out=await s.sync(r.id);assert.deepEqual(out.results.map(r=>r.status),['error','synced']);
});
test('release revisions protect stale edits and removing membership preserves epic draft',async()=>{
  const {s,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-11',value:'Later',revision:null});
  await s.saveRelease({...r,links:''});await assert.rejects(()=>s.saveRelease({...r,links:ID}),/changed/);
  assert.ok((await s.state()).epics[0].drafts['2026-11']);
});
test('different release years and December/January ambiguity require year resolution',async()=>{
  const {s,gus,r}=await setup();await s.saveRelease({name:'Other',year:2027,links:ID});
  await s.saveDraft({epicId:ID,month:'2026-10',value:'New',revision:null});
  assert.equal((await s.preview(r.id)).items[0].status,'year-conflict');
  await s.setYear({epicId:ID,year:2026,revision:(await s.state()).epics[0].revision});
  assert.equal((await s.preview(r.id)).items[0].status,'ready');
  gus.rows[ID].comments='Dec Update\nEnd\nJan Update\nStart';
  assert.equal((await s.preview(r.id)).items[0].status,'year-conflict');
});
test('ContentVersion store persists compressed chunk sets and detects stale revisions',async()=>{
  const rows=[];const sf={query:async()=>({records:rows.slice().reverse(),done:true}),create:async(_,v)=>{rows.push({...v,Id:'068'+rows.length,CreatedDate:new Date().toISOString()});return {id:'068'+rows.length,success:true};}};
  const a=new ContentStore(sf);const data={id:'one',value:require('crypto').randomBytes(1800).toString('hex')};
  const saved=await a.put('release','one',data,null);assert.ok(rows.length>1);assert.ok(rows.every(r=>r.Description.length<=1000));
  const b=new ContentStore(sf);assert.equal((await b.get('release','one')).value,data.value);
  await assert.rejects(()=>b.put('release','one',data,'wrong'),/changed/);
  assert.equal((await b.list('release'))[0].revision,saved.revision);
});
test('GUS queries all work item pages and conditional comments writes',async()=>{
  let request;const sf={describe:async obj=>({fields:[{name:'Id'},{name:'Name'},{name:'Epic__c'},{name:'Status__c'},{name:'Epic_Health_Comments__c',updateable:true},{name:'LastModifiedDate'}]}),
    query:async q=>({records:[{Id:ID,Name:'W-1'}],done:false,nextRecordsUrl:'/next'}),queryMore:async()=>({records:[{Id:ID2,Name:'W-2'}],done:true}),
    request:async r=>{request=r;return null;}};
  const g=new Gus(sf);const works=await g.workItems(ID);assert.equal(works.items.length,2);
  await g.updateComments(ID,'A','2026-11-02T01:00:00.000Z');assert.ok(request.headers['If-Unmodified-Since']);
  assert.equal(JSON.parse(request.body).Epic_Health_Comments__c,'A');
});
test('mapped legacy years are displayed consistently and sync without duplicate months',async()=>{
  const {s,gus,r}=await setup();gus.rows[ID].comments='Dec Update\nEnd\nJan Update\nStart';await s.fetch(r.id);
  let e=(await s.state()).epics[0];await s.setYear({epicId:ID,year:2026,revision:e.revision,mapping:{'2026-12':'2026-12','2026-01':'2027-01'}});
  e=(await s.state()).epics[0];assert.equal(e.parsed.months['2027-01'],'Start');assert.equal(e.parsed.months['2026-01'],undefined);
  await s.saveDraft({epicId:ID,month:'2027-01',value:'Next year',revision:null});
  const out=await s.sync(r.id);assert.equal(out.results[0].status,'synced');assert.equal(parseComments(gus.rows[ID].comments,2026).months['2027-01'],'Next year');
});
test('failed multi-chunk storage save leaves previous complete snapshot readable',async()=>{
  const rows=[];let fail=false,uploads=0;const sf={query:async()=>({records:rows.slice().reverse(),done:true}),create:async(_,v)=>{if(fail&&++uploads===2)throw Error('Upload interrupted');rows.push({...v,Id:'068'+rows.length,CreatedDate:new Date().toISOString()});return {id:'068'+rows.length,success:true};}};
  const store=new ContentStore(sf);const first=await store.put('release','one',{id:'one',value:'Original'},null);
  fail=true;await assert.rejects(()=>store.put('release','one',{id:'one',value:require('crypto').randomBytes(1800).toString('hex')},first.revision));
  assert.equal((await store.get('release','one')).value,'Original');
});
test('sync only writes the exact epic/month drafts approved in preview',async()=>{
  const {s,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-10',value:'Reviewed',revision:null});
  const preview=await s.preview(r.id);const approved=preview.items.map(i=>({epicId:i.epicId,draftRevisions:i.draftRevisions}));
  const draft=(await s.state()).epics[0].drafts['2026-10'];
  await s.saveDraft({epicId:ID,month:'2026-10',value:'Unreviewed new change',revision:draft.revision});
  const out=await s.sync(r.id,approved);assert.equal(gus.writes,0);assert.equal(out.results[0].status,'error');assert.match(out.results[0].error,/preview/i);
});
test('a new unreviewed month does not get synced with approved drafts',async()=>{
  const {s,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-10',value:'Reviewed',revision:null});
  const preview=await s.preview(r.id);const approved=preview.items.map(i=>({epicId:i.epicId,draftRevisions:i.draftRevisions}));
  await s.saveDraft({epicId:ID,month:'2026-11',value:'Not reviewed',revision:null});
  await s.sync(r.id,approved);assert.equal(gus.writes,0);
});
test('conflict resolution rejects remote changes made after the displayed conflict',async()=>{
  const {s,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-10',value:'Mine',revision:null});
  gus.rows[ID].comments='Oct Update\nTheirs A';const preview=await s.preview(r.id);const conflict=preview.items[0].conflicts[0];
  gus.rows[ID].comments='Oct Update\nTheirs B';
  await assert.rejects(()=>s.saveDraft({epicId:ID,month:'2026-10',value:'Resolution of A',revision:conflict.revision,resolve:true,expectedRemote:conflict.remote}),/changed/);
  assert.equal(gus.writes,0);
});
test('inaccessible optional sprint date does not break the work item sidebar',async()=>{
  const sf={describe:async()=>({fields:[{name:'Id'},{name:'Name'},{name:'Epic__c'},{name:'Status__c'},{name:'Sprint__c',relationshipName:'Sprint__r'}]}),query:async q=>{if(q.includes('Sprint__r.Start_Date__c'))throw Error('No such field');return {records:q.includes("WHERE Epic__c")?[{Id:ID,Name:'W-1',Sprint__r:{Name:'Sprint A'}}]:[],done:true};}};
  const out=await new Gus(sf).workItems(ID);assert.equal(out.items.length,1);assert.ok(out.unavailable.includes('sprintStart'));assert.equal(out.items[0].sprint,'Sprint A');
});
test('concurrent ContentVersion saves retain independently edited draft months',async()=>{
  const rows=[];let n=0;const sf={query:async()=>({records:rows.slice().reverse(),done:true}),create:async(_,v)=>{rows.push({...v,Id:String(++n).padStart(18,'0')});return {id:String(n),success:true};}};
  const store=new ContentStore(sf);const original=await store.put('epic',ID,{id:ID,drafts:{}},null);
  await Promise.allSettled([store.put('epic',ID,{...original,drafts:{'2026-10':{value:'October',revision:'a'}}},original.revision),store.put('epic',ID,{...original,drafts:{'2026-11':{value:'November',revision:'b'}}},original.revision)]);
  const saved=await store.get('epic',ID);assert.equal(saved.drafts['2026-10'].value,'October');assert.equal(saved.drafts['2026-11'].value,'November');
});
test('concurrent edits of the same draft preserve both versions as an explicit storage conflict',async()=>{
  const rows=[];let n=0;const sf={query:async()=>({records:rows.slice().reverse(),done:true}),create:async(_,v)=>{rows.push({...v,Id:String(++n).padStart(18,'0')});return {id:String(n),success:true};}};
  const store=new ContentStore(sf);const original=await store.put('epic',ID,{id:ID,drafts:{}},null);
  await Promise.allSettled([store.put('epic',ID,{...original,drafts:{'2026-10':{value:'A',revision:'a'}}},original.revision),store.put('epic',ID,{...original,drafts:{'2026-10':{value:'B',revision:'b'}}},original.revision)]);
  const saved=await store.get('epic',ID);assert.ok(saved._storageConflicts?.length);const values=JSON.stringify(saved._storageConflicts);assert.ok(values.includes('"A"'));assert.ok(values.includes('"B"'));
});
test('persisted concurrent draft conflicts survive fetch and block GUS sync until resolved',async()=>{
  const {s,store,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-10',value:'B',revision:null});
  let e=await store.get('epic',ID);await store.put('epic',ID,{...e,_storageConflicts:[{path:'drafts.2026-10',previous:{value:'A'},incoming:{value:'B'}}]},e.revision);
  await s.fetch(r.id);assert.equal((await s.preview(r.id)).items[0].status,'draft-conflict');await s.sync(r.id);assert.equal(gus.writes,0);
  e=await store.get('epic',ID);await s.saveDraft({epicId:ID,month:'2026-10',value:'A and B',revision:e.drafts['2026-10'].revision,resolveStorage:true,epicRevision:e.revision});
  assert.equal((await s.preview(r.id)).items[0].status,'ready');
});
test('list-specific field values survive a monthly sync and fetches from other lists',async()=>{
  const {s,store,gus,r}=await setup();let e=await store.get('epic',ID);await store.put('epic',ID,{...e,extra:{'Owner.FirstName':'Avery'}},e.revision);
  gus.rows[ID].extra={};
  await s.saveDraft({epicId:ID,month:'2026-11',value:'New month',revision:null});await s.sync(r.id);
  assert.equal((await store.get('epic',ID)).extra['Owner.FirstName'],'Avery');
  gus.rows[ID].extra={'Other__c':'Second list field'};await s.fetch(r.id);
  e=await store.get('epic',ID);assert.equal(e.extra['Owner.FirstName'],'Avery');assert.equal(e.extra.Other__c,'Second list field');
});
test('release column preferences reject injected HTML and unknown column keys',async()=>{
  const {s,r}=await setup();
  await assert.rejects(()=>s.saveRelease({...r,links:ID,columns:['name','"><img src=x onerror=alert(1)>']}),/column/i);
  await assert.rejects(()=>s.saveRelease({...r,links:ID,columns:['name','gus:Unresolved__c']}),/column/i);
});
module.exports={MemoryStore,FakeGus};
test('host fetch pages one epic at a time and rejects membership changes between pages',async()=>{
  const {s,store,gus,r}=await setup();gus.rows[ID2]={...gus.rows[ID],id:ID2};
  await store.put('release',r.id,{...await s.release(r.id),epicIds:[ID,ID2]});
  const start=await s.fetch(r.id,{});assert.equal(start.nextCursor,0);assert.equal(start.results.length,0);
  const first=await s.fetch(r.id,{cursor:0,fetchRevision:start.fetchRevision});assert.equal(first.results.length,1);assert.equal(first.nextCursor,1);
  const last=await s.fetch(r.id,{cursor:1,fetchRevision:start.fetchRevision});assert.equal(last.results[0].epicId,ID2);assert.equal(last.nextCursor,null);
  await store.put('release',r.id,{...await s.release(r.id),epicIds:[ID]});
  await assert.rejects(()=>s.fetch(r.id,{cursor:0,fetchRevision:start.fetchRevision}),/changed during fetch/);
  await assert.rejects(()=>s.fetch(r.id,{cursor:-1,fetchRevision:start.fetchRevision}),/changed during fetch/);
});
test('single-epic preview and sync do not load unrelated epic journals',async()=>{
  const {s,store,gus,r}=await setup();gus.rows[ID2]={...gus.rows[ID],id:ID2};
  await store.put('release',r.id,{...await s.release(r.id),epicIds:[ID,ID2]});await s.fetch(r.id);
  await s.saveDraft({epicId:ID,month:'2026-10',value:'Changed',revision:null});
  const get=store.get.bind(store);store.get=async(type,id)=>{if(type==='epic'&&id===ID2)throw Error('Unrelated journal read');return get(type,id);};
  const preview=await s.preview(r.id,ID);assert.equal(preview.items.length,1);
  const i=preview.items[0];const out=await s.sync(r.id,[{epicId:ID,epicRevision:i.epicRevision,draftRevisions:i.draftRevisions}]);assert.equal(out.results[0].status,'synced');assert.equal(gus.writes,1);
  await assert.rejects(()=>s.preview(r.id,'a0B000000000003'),/not part of this release/);
});
test('saving a displayed epic hydrates a missing cache using its saved release and displayed month baseline',async()=>{
 const {s,store,r}=await setup();store.docs.delete('epic'+ID);
 const saved=await s.saveDraft({releaseId:r.id,epicId:ID,month:'2026-11',value:'Immediate update',base:'',revision:null,autoSync:true});
 assert.equal(saved.drafts['2026-11'].autoSync,true);assert.equal(saved.drafts['2026-11'].base,'');
 await assert.rejects(()=>s.saveDraft({releaseId:r.id,epicId:ID2,month:'2026-11',value:'No',base:'',autoSync:true}),/part of this release/);
});
test('direct monthly publish changes only its approved month and retains other pending drafts',async()=>{
 const {s,store,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-09',value:'Unapproved September',revision:null});
 const saved=await s.saveDraft({releaseId:r.id,epicId:ID,month:'2026-11',value:'Published November',base:'',revision:null,autoSync:true});
 const result=await s.publishMonth({releaseId:r.id,epicId:ID,month:'2026-11',draftRevision:saved.drafts['2026-11'].revision});
 assert.equal(result.status,'synced');const parsed=parseComments(gus.rows[ID].comments,2026);assert.equal(parsed.months['2026-11'],'Published November');assert.equal(parsed.months['2026-09'],'Keep');
 assert.equal((await store.get('epic',ID)).drafts['2026-09'].value,'Unapproved September');assert.equal((await store.get('epic',ID)).drafts['2026-11'],undefined);
});
test('direct monthly publish retains its draft on conflict and rejects stale revisions',async()=>{
 const {s,store,gus,r}=await setup();const saved=await s.saveDraft({releaseId:r.id,epicId:ID,month:'2026-10',value:'New October',base:'Old',revision:null,autoSync:true});
 gus.rows[ID].comments='Oct Update\nOther writer';
 const result=await s.publishMonth({releaseId:r.id,epicId:ID,month:'2026-10',draftRevision:saved.drafts['2026-10'].revision});
 assert.equal(result.status,'conflict');assert.equal(gus.writes,0);assert.ok((await store.get('epic',ID)).drafts['2026-10']);
 await assert.rejects(()=>s.publishMonth({releaseId:r.id,epicId:ID,month:'2026-10',draftRevision:'stale'}),/changed/);
});
test('a lost draft-save response can be retried with its exact request ID without overwriting competing intent',async()=>{
 const {s,r}=await setup();const request={releaseId:r.id,epicId:ID,month:'2026-11',value:'Retry safely',base:'',revision:null,autoSync:true,requestId:'11111111-1111-4111-8111-111111111111'};
 const saved=await s.saveDraft(request),again=await s.saveDraft(request);assert.equal(again.revision,saved.revision);
 await assert.rejects(()=>s.saveDraft({...request,value:'Different intent'}),/draft changed/);
});
test('discarding or replacing a draft during the publication recheck prevents a GUS write',async()=>{
 const {s,store,gus,r}=await setup();const saved=await s.saveDraft({epicId:ID,month:'2026-11',value:'Queued',revision:null});
 const original=gus.epic.bind(gus);gus.epic=async id=>{const row=await original(id);const e=await store.get('epic',id);await store.put('epic',id,{...e,drafts:{}});return row;};
 await assert.rejects(()=>s.publishMonth({releaseId:r.id,epicId:ID,month:'2026-11',draftRevision:saved.drafts['2026-11'].revision}),/changed before publication/);assert.equal(gus.writes,0);
});
test('direct publishing preserves unrelated legacy headings even when other months have year mappings',async()=>{
 const {s,store,gus,r}=await setup();gus.rows[ID].comments='Sept Update\nKeep September\nOct Update\nOld October';await s.fetch(r.id);let e=await store.get('epic',ID);
 await store.put('epic',ID,{...e,yearMapping:{'2026-09':'2025-09','2026-10':'2025-10'},yearConfirmed:true});
 e=await s.saveDraft({epicId:ID,month:'2025-10',value:'New October',revision:null});
 const out=await s.publishMonth({releaseId:r.id,epicId:ID,month:'2025-10',draftRevision:e.drafts['2025-10'].revision});
 assert.equal(out.status,'synced');assert.ok(gus.rows[ID].comments.startsWith('Sept Update\nKeep September\n'));assert.match(gus.rows[ID].comments,/October 2025 Update:\nNew October/);
});
test('column preferences save independently of list import and preserve release membership',async()=>{
 const {s,store,gus,r}=await setup();gus.resolveEpicInputs=async()=>{throw Error('List metadata unavailable');};
 const saved=await s.saveSettings({releaseId:r.id,revision:(await s.release(r.id)).revision,columns:['name','months','health']});
 assert.deepEqual(saved.columns,['name','months','health']);assert.deepEqual(saved.epicIds,[ID]);assert.equal(saved.name,r.name);
 await assert.rejects(()=>s.saveSettings({releaseId:r.id,revision:r.revision,columns:['name']}),/changed/);
 await assert.rejects(()=>s.saveSettings({releaseId:r.id,revision:saved.revision,columns:['name','<script>']}),/Invalid column/);
});
test('deleting a release hides it in shared state, blocks later mutations and preserves epics and drafts',async()=>{
 const {s,store,gus,r}=await setup();await s.saveDraft({epicId:ID,month:'2026-11',value:'Keep draft',revision:null});
 await s.deleteRelease({releaseId:r.id,revision:r.revision,confirmation:r.name});
 assert.equal((await s.state()).releases.length,0);assert.equal((await store.get('epic',ID)).drafts['2026-11'].value,'Keep draft');assert.equal(gus.writes,0);
 await assert.rejects(()=>s.release(r.id),/deleted/);await assert.rejects(()=>s.saveSettings({releaseId:r.id,revision:r.revision,columns:['name']}),/deleted/);
});
test('delete requires current revision and the exact release name',async()=>{
 const {s,r}=await setup();await assert.rejects(()=>s.deleteRelease({releaseId:r.id,revision:r.revision,confirmation:'wrong'}),/confirm/i);
 await assert.rejects(()=>s.deleteRelease({releaseId:r.id,revision:'old',confirmation:r.name}),/changed/);assert.equal((await s.state()).releases.length,1);
});
test('a release can be recreated with the same scope after deletion',async()=>{
 const {s,r}=await setup();await s.deleteRelease({releaseId:r.id,revision:r.revision,confirmation:r.name});const recreated=await s.saveRelease({name:r.name,year:r.year,links:ID});assert.notEqual(recreated.id,r.id);assert.equal((await s.release(recreated.id)).name,r.name);assert.equal((await s.state()).releases.length,1);
});
test('shared pending drafts cannot be published by automatic reconnect without the original save intent',async()=>{
 const {s,store,gus,r}=await setup();const shared=new Service(store,gus,{shared:true});const saved=await shared.saveDraft({releaseId:r.id,epicId:ID,month:'2026-11',value:'Intended',base:'',revision:null,autoSync:true,requestId:'11111111-1111-4111-8111-111111111111'});
 await assert.rejects(()=>shared.publishMonth({releaseId:r.id,epicId:ID,month:'2026-11',draftRevision:saved.drafts['2026-11'].revision}),/Review and approve/);assert.equal(gus.writes,0);
});
test('executive blurbs use live health comments grouped by measure/team and never query work items',async()=>{
 const {s,gus,r}=await setup();gus.rows[ID].project='Measure 1';gus.rows[ID].team='MQ';gus.rows[ID].comments='October 2026 Update:\nCompleted regional rollout.\nPartner validation remains pending.';gus.workItems=async()=>{throw Error('Work item query must not run');};
 const out=await s.executiveBlurb({releaseIds:[r.id],epicIds:[ID],month:'2026-11',measure:'Measure 1',team:'MQ'});assert.equal(out.measure,'Measure 1');assert.equal(out.team,'MQ');assert.match(out.blurb,/regional rollout/);assert.match(out.blurb,/Partner validation/);assert.equal(out.metrics,undefined);assert.equal(gus.writes,0);
 await assert.rejects(()=>s.executiveBlurb({releaseIds:[r.id],epicIds:[ID2],month:'2026-11',measure:'Measure 1',team:'MQ'}),/not part/);
 await assert.rejects(()=>s.executiveBlurb({releaseIds:[r.id],epicIds:[ID],month:'2026-11',measure:'Wrong measure',team:'MQ'}),/measure or team changed/);
});

test('executive planning ignores stale cached grouping and generates missing-measure team updates',async()=>{
 const {s,gus,r}=await setup();gus.rows[ID].project=null;gus.rows[ID].team='MQ';gus.rows[ID].comments='November 2026 Update:\nCompleted regional rollout. Partner validation remains pending.';
 const plan=await s.executivePlan({releaseIds:[r.id],month:'2026-11'});assert.equal(plan.groups.length,1);assert.equal(plan.groups[0].measure,'Measure not set in GUS');assert.equal(plan.groups[0].team,'MQ');
 const out=await s.executiveBlurb({...plan.groups[0],releaseIds:[r.id],month:'2026-11'});assert.match(out.blurb,/regional rollout/);assert.equal(gus.writes,0);
 gus.rows[ID].project='Fresh measure';const fresh=await s.executivePlan({releaseIds:[r.id],month:'2026-11'});assert.equal(fresh.groups[0].measure,'Fresh measure');await assert.rejects(()=>s.executivePlan({releaseIds:['unknown'],month:'2026-11'}),/no longer available/);
});

test('every unique selected epic is planned separately, including an unmapped measure',async()=>{const {s,gus}=await setup();gus.rows[ID2]={id:ID2,name:'Second epic',comments:'November 2026 Update:\nWe completed validation.',team:'MQ',project:null};gus.rows[ID].team='MQ';const r=await s.saveRelease({name:'Full scope',year:2026,links:ID+'\n'+ID2});assert.deepEqual(r.columns,['project','name','health','lead','months','pathToGreen']);const plan=await s.executivePlan({releaseIds:[r.id,r.id],month:'2026-11'});assert.equal(plan.groups.length,2);assert.ok(plan.groups.every(g=>g.epicIds.length===1));assert.deepEqual(new Set(plan.groups.flatMap(g=>g.epicIds)),new Set([ID,ID2]));for(const g of plan.groups){const out=await s.executiveBlurb({...g,releaseIds:[r.id],month:'2026-11'});assert.equal(out.epicId,g.epicIds[0]);assert.ok(out.epicName&&out.blurb);}assert.equal(gus.writes,0);});
test('AI monthly draft validates release membership, reads evidence and never publishes',async()=>{const {s,gus,r}=await setup();gus.workItems=async(id,options)=>{assert.equal(id,ID);assert.equal(options.details,true);return {items:[{title:'Regional encryption validation',status:'Closed'}],unavailable:[]};};gus.rows[ID].extra={Description__c:'Deliver encryption support'};const before=JSON.stringify(gus.rows);const out=await s.monthlySummary({releaseId:r.id,epicId:ID,month:'2026-11',useSdk:true});assert.ok(out.blurb&&out.ai.message);assert.equal(out.epicId,ID);assert.equal(gus.writes,0);assert.equal(JSON.stringify(gus.rows),before);await assert.rejects(()=>s.monthlySummary({releaseId:r.id,epicId:ID2,month:'2026-11'}),/not part/);});
test('saved releases can grow past five without altering existing releases or epics',async()=>{const {s,r,gus}=await setup();const before=JSON.stringify(gus.rows);for(let i=2;i<=7;i++)await s.saveRelease({name:'Release '+i,year:2026,links:ID});assert.equal((await s.state()).releases.length,7);assert.equal((await s.release(r.id)).name,r.name);const edited=await s.saveRelease({id:r.id,revision:r.revision,name:'Renamed release',year:2026,links:ID});assert.equal(edited.id,r.id);assert.equal((await s.state()).releases.length,7);assert.equal(JSON.stringify(gus.rows),before);});
test('editing a retained list alias can separate its year beyond five; membership refresh retains stable scope',async()=>{const {s,gus}=await setup();const view='00B000000000001';gus.resolveEpicInputs=async()=>({ids:[ID],sources:[{id:view}],columns:[]});const a=await s.saveRelease({name:'List A',year:2026,links:'https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=One'});await s.saveRelease({name:'List alias',year:2026,links:a.inputLinks});delete gus.resolveEpicInputs;for(let i=1;i<=3;i++)await s.saveRelease({name:'Manual '+i,year:2026,links:ID});gus.resolveEpicInputs=async()=>({ids:[ID],sources:[{id:view}],columns:[]});const edited=await s.saveRelease({id:a.id,revision:a.revision,name:a.name,year:2027,links:a.inputLinks});assert.equal(edited.year,2027);const {releaseScope}=require('../backend/service');assert.equal(releaseScope(a),releaseScope({...a,epicIds:[ID,ID2]}));assert.notEqual(releaseScope(a),releaseScope({...a,inputLinks:a.inputLinks+'\n'+ID2}));});
test('hidden month preferences persist through fetch and release edits without changing health comments',async()=>{
 const {s,store,gus,r}=await setup();const comments=gus.rows[ID].comments;
 let saved=await s.saveSettings({releaseId:r.id,revision:(await s.release(r.id)).revision,hiddenMonths:['2026-09','2026-09','2026-11']});
 assert.deepEqual(saved.hiddenMonths,['2026-09','2026-11']);await s.fetch(r.id);saved=await s.release(r.id);assert.deepEqual(saved.hiddenMonths,['2026-09','2026-11']);
 saved=await s.saveRelease({id:r.id,revision:saved.revision,name:r.name,year:r.year,links:ID});assert.deepEqual(saved.hiddenMonths,['2026-09','2026-11']);
 await assert.rejects(()=>s.saveSettings({releaseId:r.id,revision:saved.revision,hiddenMonths:['2026-13']}),/month/i);
 await assert.rejects(()=>s.saveSettings({releaseId:r.id,revision:saved.revision,hiddenMonths:'2026-09'}),/hidden months/i);
 saved=await s.saveSettings({releaseId:r.id,revision:saved.revision,hiddenMonths:[]});assert.deepEqual(saved.hiddenMonths,[]);assert.equal(gus.rows[ID].comments,comments);assert.equal(gus.writes,0);
});
test('automatic refresh uses shared cache for one hour while manual fetch bypasses it',async()=>{
 const {s,store,gus,r}=await setup();let queries=0;const original=gus.epics.bind(gus);gus.epics=async(...args)=>{queries++;return original(...args);};
 const other=new Service(store,gus);assert.equal((await other.fetch(r.id,{automatic:true})).cached,true);assert.equal(queries,0);
 const start=await other.fetch(r.id,{});assert.equal(start.cached,undefined);gus.rows[ID].name='Manually refreshed latest title';await other.fetch(r.id,{cursor:0,fetchRevision:start.fetchRevision});const finished=await other.finishFetch({releaseId:r.id,fetchRevision:start.fetchRevision});assert.ok(finished.lastGusRefreshAt);assert.equal(queries,1);assert.equal((await s.state()).epics[0].name,'Manually refreshed latest title');assert.equal((await s.fetch(r.id,{automatic:true})).cached,true);assert.equal(queries,1);
 const cached=await store.get('epic',ID);await store.put('epic',ID,{...cached,fetchedAt:new Date(Date.now()-3600001).toISOString()},cached.revision);const expired=await s.fetch(r.id,{automatic:true});assert.notEqual(expired.cached,true);await s.fetch(r.id,{cursor:0,fetchRevision:expired.fetchRevision});assert.equal(queries,2);
});
test('freshness requires every cached epic and unchanged fetches save fresh timestamps',async()=>{
 const {s,store,r}=await setup();let old=await store.get('epic',ID);const stale=new Date(Date.now()-7200000).toISOString();await store.put('epic',ID,{...old,fetchedAt:stale},old.revision);await s.fetch(r.id);assert.ok(Date.parse((await store.get('epic',ID)).fetchedAt)>Date.parse(stale));
 const release=await s.release(r.id);await store.put('release',r.id,{...release,epicIds:[ID,ID2]},release.revision);assert.notEqual((await s.fetch(r.id,{automatic:true})).cached,true);await assert.rejects(()=>s.finishFetch({releaseId:r.id,fetchRevision:(release.revision)}),/changed/);const latest=await s.release(r.id);await assert.rejects(()=>s.finishFetch({releaseId:r.id,fetchRevision:latest.revision}),/not saved/);
});

test('individual epic saves cannot extend a completed release refresh window',async()=>{
 const {s,store,r}=await setup();const release=await s.release(r.id);await store.put('release',r.id,{...release,lastGusRefreshAt:new Date(Date.now()-3600001).toISOString()},release.revision);assert.notEqual((await s.fetch(r.id,{automatic:true})).cached,true);
});
test('explicit visible months validate, persist through release edits, and preserve epic history',async()=>{
 const {s,store,gus,r}=await setup(),comments=gus.rows[ID].comments;let saved=await s.saveSettings({releaseId:r.id,revision:r.revision,visibleMonths:['2026-11','2026-10','2026-09','2026-08','2026-08']});assert.deepEqual(saved.visibleMonths,['2026-11','2026-10','2026-09','2026-08']);await s.fetch(r.id);saved=await s.saveRelease({id:r.id,revision:saved.revision,name:r.name,year:r.year,links:ID});assert.deepEqual(saved.visibleMonths,['2026-11','2026-10','2026-09','2026-08']);await assert.rejects(()=>s.saveSettings({releaseId:r.id,revision:saved.revision,visibleMonths:['2026-13']}),/month/i);saved=await s.saveSettings({releaseId:r.id,revision:saved.revision,visibleMonths:[]});assert.deepEqual(saved.visibleMonths,[]);assert.equal(gus.rows[ID].comments,comments);assert.equal(gus.writes,0);
});
test('read-only hover summary uses displayed engineer text, live health and delivery evidence without saving',async()=>{
 const {s,store,gus,r}=await setup();gus.rows[ID].health='On Track';gus.rows[ID].pathToGreen='Complete partner validation';gus.workItems=async()=>({items:[{title:'Partner validation',status:'In Progress',description:'Validate rollout readiness'}],unavailable:[]});const before=JSON.stringify(await store.get('epic',ID)),comments=gus.rows[ID].comments;
 const result=await s.monthlySummary({releaseId:r.id,epicId:ID,month:'2026-10',previewOnly:true,displayedText:'Engineer update: readiness review completed.',useSdk:true});assert.match(result.ai.message,/Engineer update: readiness review completed/);assert.match(result.ai.message,/"epicHealth":"On Track"/);assert.match(result.ai.message,/"pathToGreen":"Complete partner validation"/);assert.match(result.ai.message,/Validate rollout readiness/);assert.equal(JSON.stringify(await store.get('epic',ID)),before);assert.equal(gus.rows[ID].comments,comments);assert.equal(gus.writes,0);await assert.rejects(()=>s.monthlySummary({releaseId:r.id,epicId:ID,month:'2026-10',previewOnly:true,displayedText:'x'.repeat(50001)}),/50,000/);
});

test('existing and new source lists follow column order; custom choices survive until GUS definition changes',async()=>{
 const {s,gus,store,r}=await setup();const first=[{key:'project',field:'Project__r.Name',label:'Project'},{key:'name',field:'Name',label:'Epic Name'},{key:'health',field:'Health__c',label:'Health'},{key:'lead',field:'Development_Lead__r.Name',label:'Development Lead'},{key:'months',field:'Epic_Health_Comments__c',label:'Epic Health Comments'},{key:'pathToGreen',field:'Path_to_Green__c',label:'Path to Green'}];
 let cols=first;gus.resolveEpicInputs=async()=>({ids:[ID],sources:[{id:'00B000000000001',definitionSource:'live-gus'}],columns:cols});
 let created=await s.saveRelease({name:'Linked source',year:2026,links:'https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName=Review'});assert.deepEqual(created.columns,first.map(c=>c.key));
 // Simulate a pre-upgrade linked release with legacy mandatory columns and no mode.
 created=await store.put('release',created.id,{...created,columnMode:undefined,columns:['name','health','months','pathToGreen','lead']},created.revision);
 await s.fetch(created.id);created=await s.release(created.id);assert.deepEqual(created.columns,first.map(c=>c.key));
 let custom=await s.saveSettings({releaseId:created.id,revision:created.revision,columns:['project','name','health','pathToGreen','months']});assert.equal(custom.columnMode,'custom');await s.fetch(created.id);assert.deepEqual((await s.release(created.id)).columns,custom.columns);
 cols=[first[0],first[1],first[3],{key:'gus:Priority__c',field:'Priority__c',label:'Priority'},first[2],first[4]];
 await s.fetch(created.id);let changed=await s.release(created.id);assert.deepEqual(changed.columns,cols.map(c=>c.key));assert.equal(changed.columnMode,'gus');assert.equal(changed.columns.includes('pathToGreen'),false);
 const restored=await s.saveSettings({releaseId:changed.id,revision:changed.revision,columns:['name','health'],columnMode:'gus'});assert.deepEqual(restored.columns,cols.map(c=>c.key));assert.equal(gus.writes,0);
});

test('monthly work read attaches bounded, month-filtered status history and closure dates',async()=>{
 const {Gus}=require('../backend/gus');const queries=[];const g=new Gus({query:async q=>{queries.push(q);return {records:q.includes('FROM ADM_Work__History')?[{ParentId:ID,CreatedDate:'2026-11-05T00:00:00Z',OldValue:'In Progress',NewValue:'Closed'}]:[{Id:ID,Name:'W-1',Subject__c:'Regional rollout',Status__c:'Closed',Epic__c:ID,Closed_On__c:'2026-11-05T00:00:00Z'}]};}});g.fields=async()=>['Name','Subject__c','Status__c','Closed_On__c','Epic__c'];const out=await g.workItems(ID,{details:true,month:'2026-11'});assert.equal(out.items[0].closedAt,'2026-11-05T00:00:00Z');assert.equal(out.items[0].statusChanges[0].from,'In Progress');assert.equal(out.historyUnavailable,false);assert.match(queries[1],/CreatedDate >= 2026-11-01T00:00:00Z AND CreatedDate < 2026-12-01T00:00:00Z/);assert.match(queries[1],/LIMIT 2001/);
});
test('status history permission failure is disclosed without inventing transition dates',async()=>{
 const {Gus}=require('../backend/gus');const g=new Gus({query:async q=>{if(q.includes('FROM ADM_Work__History'))throw Error('No field history access');return {records:[{Id:ID,Name:'W-1',Subject__c:'Regional rollout',Status__c:'Ready for Review'}]};}});g.fields=async()=>['Name','Subject__c','Status__c','Epic__c'];const out=await g.workItems(ID,{details:true,month:'2026-11'});assert.equal(out.historyUnavailable,true);assert.equal(out.items[0].statusChanges,undefined);
});
