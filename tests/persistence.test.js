const {test}=require('node:test');const assert=require('node:assert/strict');
const {ContentStore}=require('../backend/store');const {Service}=require('../backend/service');
const {parseComments}=require('../backend/comments');
test('complete release lifecycle survives new GUS-backed store instances',async()=>{
  const rows=[];let counter=0;
  const sf={query:async q=>{const exact=q.match(/Title = '([^']+)'/),prefix=q.match(/Title LIKE '([^']+)%'/),many=q.match(/Title IN \(([^)]+)\)/),titles=many?[...many[1].matchAll(/'([^']+)'/g)].map(m=>m[1]):null;return {records:rows.filter(r=>exact?r.Title===exact[1]:titles?titles.includes(r.Title):r.Title.startsWith(prefix[1].replace(/\\_/g,'_'))).slice().reverse(),done:true};},
    create:async(_,values)=>{rows.push({...values,Id:String(++counter).padStart(18,'0')});return {id:String(counter),success:true};}};
  const id='a0B000000000001';let remote={id,name:'Persistence test',comments:'October 2026 Update:\nKeep',modified:'2026-11-01T00:00:00Z'};
  const gus={epics:async()=>({epics:[structuredClone(remote)]}),epic:async()=>structuredClone(remote),updateComments:async(_,text)=>{remote.comments=text;return {conditional:true};}};
  let service=new Service(new ContentStore(sf),gus);
  const r=await service.saveRelease({name:'Release 266',year:2026,links:id});await service.fetch(r.id);
  await service.saveDraft({epicId:id,month:'2026-11',value:'Persistent November draft',revision:null});
  service=new Service(new ContentStore(sf),gus);let state=await service.state();assert.equal(state.releases.length,1);assert.equal(state.epics[0].drafts['2026-11'].value,'Persistent November draft');
  const preview=await service.preview(r.id);const result=await service.sync(r.id,preview.items.map(i=>({epicId:i.epicId,draftRevisions:i.draftRevisions,epicRevision:i.epicRevision})));
  assert.equal(result.results[0].status,'synced');assert.equal(parseComments(remote.comments,2026).months['2026-10'],'Keep');
  const start=await service.fetch(r.id,{});await service.fetch(r.id,{cursor:0,fetchRevision:start.fetchRevision});await service.finishFetch({releaseId:r.id,fetchRevision:start.fetchRevision});const viewer=new Service(new ContentStore(sf),gus);assert.equal((await viewer.fetch(r.id,{automatic:true})).cached,true);assert.ok((await viewer.state()).releases[0].lastGusRefreshAt);
  const latest=await viewer.release(r.id);await viewer.saveSettings({releaseId:r.id,revision:latest.revision,visibleMonths:['2026-11','2026-10','2026-09','2026-08']});assert.equal((await new Service(new ContentStore(sf),gus).state()).releases[0].visibleMonths.length,4);
  state=await new Service(new ContentStore(sf),gus).state();assert.equal(Object.keys(state.epics[0].drafts).length,0);assert.equal(state.epics[0].parsed.months['2026-11'],'Persistent November draft');
});
