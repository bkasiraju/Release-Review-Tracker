const {test}=require('node:test');const assert=require('node:assert/strict');
const {handleRequest}=require('../backend');
test('handler denies arbitrary query and object writes',async()=>{
  const sf={query:async()=>({records:[],done:true})};
  const r=await handleRequest({sf,request:{body:{action:'query',soql:'SELECT Id FROM User'}}});assert.equal(r.ok,false);assert.match(r.error,/Unknown/);
});
test('connection returns a bounded identity without tokens',async()=>{
  const sf={query:async()=>({records:[],done:true}),identity:async()=>({username:'person@gus.com',organization_id:'org',accessToken:'secret'})};
  const r=await handleRequest({sf,request:{body:{action:'connection'}}});assert.equal(r.ok,true);assert.equal(r.payload.username,'person@gus.com');assert.ok(!JSON.stringify(r).includes('secret'));
});
test('missing connection and unknown actions produce useful safe errors',async()=>{
  const r=await handleRequest({request:{body:{action:'state'}}});assert.equal(r.ok,false);assert.match(r.error,/connection/);
});
test('local server guards cross-site writes and never serves backend files',async()=>{
  const {createServer}=require('../server');const s=createServer({sf:null});await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;
  try{
    let res=await fetch(base+'/backend/index.js');assert.equal(res.status,404);
    res=await fetch(base+'/api/handler',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'});assert.equal(res.status,403);
    res=await fetch(base+'/');assert.equal(res.status,200);assert.match(await res.text(),/Release/);
  }finally{await new Promise(r=>s.close(r));}
});
