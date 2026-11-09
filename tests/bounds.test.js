const {test}=require('node:test');const assert=require('node:assert/strict');
const {Gus}=require('../backend/gus');const {ContentStore}=require('../backend/store');
test('work item queries have a sentinel limit and flag truncated results',async()=>{
  let query='';const sf={describe:async()=>({fields:['Id','Name','Epic__c'].map(name=>({name}))}),query:async q=>{query=q;return {records:Array.from({length:2001},(_,i)=>({Id:String(i),Name:'W-'+i})),done:true};}};
  const out=await new Gus(sf).workItems('a0B000000000001');assert.match(query,/LIMIT 2001$/);assert.equal(out.items.length,2000);assert.equal(out.truncated,true);assert.equal(out.limit,2000);
});
test('an epic with exactly the display limit is not falsely marked truncated',async()=>{
  const sf={describe:async()=>({fields:['Id','Name','Epic__c'].map(name=>({name}))}),query:async()=>({records:Array.from({length:2000},(_,i)=>({Id:String(i),Name:'W-'+i})),done:true})};
  assert.equal((await new Gus(sf).workItems('a0B000000000001')).truncated,false);
});
test('storage enumeration queries unique titles, never all historic descriptions',async()=>{
  const queries=[];const sf={query:async q=>{queries.push(q);return {records:[],done:true};}};
  assert.deepEqual(await new ContentStore(sf).list('epic'),[]);
  assert.match(queries[0],/^SELECT Title FROM ContentVersion/);assert.match(queries[0],/GROUP BY Title/);assert.match(queries[0],/LIMIT 2000$/);
});
test('journal reads have a fixed bound and never decode a truncated journal',async()=>{
  let query='';const sf={query:async q=>{query=q;return {records:Array.from({length:10001},()=>({})),done:true};}};
  await assert.rejects(()=>new ContentStore(sf).get('epic','a0B000000000001'),/archive|maintenance/i);assert.match(query,/LIMIT 10001$/);
});
test('too many saved entities fail explicitly rather than silently hiding releases',async()=>{
  const sf={query:async()=>({records:Array.from({length:2001},(_,i)=>({Title:'CFSMonthlyReview_v1_epic_'+i})),done:true})};
  await assert.rejects(()=>new ContentStore(sf).list('epic'),/2000|archive/i);
});
