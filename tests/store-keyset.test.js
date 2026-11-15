const test=require('node:test'),assert=require('node:assert');
const {ContentStore}=require('../backend/store.js');
test('reads the full history by keyset when queryMore/request are unavailable',async()=>{
  const all=Array.from({length:5},(_,i)=>({Id:'a0000000000000'+(100-i),Title:'t',Description:'x',CreatedDate:`2026-11-15T10:00:0${5-i}.000+0000`}));
  const seen=[];
  const sf={query:async q=>{seen.push(q);const m=q.match(/CreatedDate < (\S+) OR/);const start=m?all.findIndex(r=>r.CreatedDate===m[1])+1:0;const part=all.slice(start,start+2);return {records:part,done:start+2>=all.length};}};
  const st=new ContentStore(sf);
  const rows=await st.query("SELECT Id FROM ContentVersion WHERE Title = 't'",l=>st.after("Title = 't'",l));
  assert.equal(rows.length,5);assert.equal(seen.length,3);assert.match(seen[1],/CreatedDate < 2026-11-15T10:00:04\.000\+0000/);
});
test('still fails clearly without a continuation path',async()=>{
  const st=new ContentStore({query:async()=>({records:[{Id:'x'}],done:false})});
  await assert.rejects(()=>st.query('q'),/queryMore/);
});
