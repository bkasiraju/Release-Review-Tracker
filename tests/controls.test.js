const {test}=require('node:test'),assert=require('node:assert/strict');const {uniqueOptions,releaseChoices,columnSizes}=require('../public/controls');
test('filter options deduplicate trimmed case variants',()=>assert.deepEqual(uniqueOptions(['On Track',' on track ','Watch','WATCH','']),['On Track','Watch']));
test('identical releases have one choice while distinct scopes retain unique labels',()=>{
 const r={name:'MAPS - 266',year:2026,epicIds:['a','b'],months:[],columns:null};
 const out=releaseChoices([{...r,id:'11111111-old'},{...r,id:'22222222-new',updatedAt:'2026-11-02'},{...r,id:'33333333-other',epicIds:['a']}]);
 assert.equal(out.choices.length,2);assert.equal(out.aliases.get('11111111-old'),'22222222-new');assert.equal(new Set(out.choices.map(r=>r.label)).size,2);
});
test('table width budgets distinguish narrative and metric columns',()=>{
 const [name,health,month,points]=columnSizes(['name','health','month:2026-11','planned']);assert.ok(month>health);assert.ok(name>points);assert.ok(points<130);
});
test('empty Project and short Priority/Owner/Health columns use compact content widths',()=>{
 const rows=[{health:'On Track',extra:{'Project__r.Name':null,'Priority__c':0,'Owner.FirstName':'Anusha'}}];const keys=['gus:Project__r.Name','gus:Priority__c','gus:Owner.FirstName','health'];const names=['Project','Priority','Owner First Name','Health'];const sizes=columnSizes(keys,rows,k=>names[keys.indexOf(k)]);assert.ok(sizes[0]<100);assert.ok(sizes[1]<100);assert.ok(sizes[2]<150);assert.ok(sizes[3]<140);
});

test('work sorting is natural, numeric, stable, non-mutating and keeps missing values last',()=>{const {sortWorkItems}=require('../public/controls');const rows=[{number:'W-10',status:'New',assignee:'Zoe',sprint:'Sprint 10',points:10},{number:'W-2',status:'Closed',assignee:'Amy',sprint:'Sprint 2',points:2},{number:'W-1',status:null,assignee:null,sprint:null,points:null}];assert.deepEqual(sortWorkItems(rows).map(w=>w.number),['W-1','W-2','W-10']);assert.deepEqual(sortWorkItems(rows,'points',-1).map(w=>w.points),[10,2,null]);for(const key of ['status','assignee','sprint']){assert.equal(sortWorkItems(rows,key)[0].number,'W-2');assert.equal(sortWorkItems(rows,key,-1)[0].number,'W-10');assert.equal(sortWorkItems(rows,key,-1).at(-1).number,'W-1');}assert.equal(rows[0].number,'W-10');});
test('same connected list with different display names uses one release slot and backend/UI signatures agree',()=>{const {releaseSignature}=require('../public/controls'),{releaseScope}=require('../backend/service');const r={year:2026,epicIds:['a0B000000000001'],sources:[{id:'00B000000000001'}],inputLinks:'old name URL',name:'MQ - 266'};const newer={...r,id:'new',name:'MQ Review Tracker',inputLinks:'new name URL',updatedAt:'2026-11-03'};assert.equal(releaseSignature(r),releaseScope(r));assert.equal(releaseScope(r),releaseScope(newer));const out=releaseChoices([{...r,id:'old'},newer]);assert.equal(out.choices.length,1);assert.equal(out.aliases.get('old'),'new');assert.notEqual(releaseSignature({...r,year:2027}),releaseSignature(r));assert.notEqual(releaseSignature({...r,sources:[{id:'00B000000000002'}]}),releaseSignature(r));});
test('epic health and development lead sort naturally in both directions with missing values last',()=>{
 const {sortEpics}=require('../public/controls');const rows=[{id:'3',name:'Epic 10',health:'Watch',lead:'Zoe'},{id:'2',name:'Epic 2',health:'On Track',lead:'Amy'},{id:'1',name:'Epic 1',health:null,lead:null}];
 assert.deepEqual(sortEpics(rows).map(r=>r.name),['Epic 1','Epic 2','Epic 10']);for(const key of ['health','lead']){assert.equal(sortEpics(rows,key)[0].id,'2');assert.equal(sortEpics(rows,key,-1)[0].id,'3');assert.equal(sortEpics(rows,key,-1).at(-1).id,'1');}assert.equal(rows[0].id,'3');
});
test('short team labels preserve known acronyms and handle full GUS names',()=>{
 const {shortTeam}=require('../public/controls');for(const [value,want] of [['Managed Async Processing Service (MAPS)','MAPS'],['VegaCache','VC'],['VegaStore','VS'],['Message Queue','MQ'],['MQ','MQ'],['Platform Engineering (PE)','PE'],['','']])assert.equal(shortTeam(value),want);
});
test('default monthly columns use the review window while all discovered months remain selectable',()=>{
 const {reviewMonths,visibleReleaseMonths}=require('../public/controls');const all=['2026-12','2026-11','2026-10','2026-09','2026-08'];assert.deepEqual(reviewMonths('2026-11'),['2026-11','2026-10','2026-09']);assert.deepEqual(reviewMonths('2027-01'),['2027-01','2026-12','2026-11']);assert.deepEqual(visibleReleaseMonths({},all,'2026-11'),['2026-11','2026-10','2026-09']);assert.deepEqual(visibleReleaseMonths({hiddenMonths:['2026-11']},all,'2026-11'),['2026-10','2026-09']);assert.deepEqual(visibleReleaseMonths({visibleMonths:['2026-11','2026-08']},all,'2026-11'),['2026-11','2026-08']);assert.deepEqual(visibleReleaseMonths({visibleMonths:[]},all,'2026-11'),[]);assert.equal(all.length,5);
});
