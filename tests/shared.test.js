const {test}=require('node:test'),assert=require('node:assert/strict');const {ContentStore}=require('../backend/store');
function fixture(){const rows=[],links=[];let sequence=0,fail=false,failCommit=false;const org='00D000000000001';
 function sf(user){return {query:async q=>{
  if(q.includes('FROM Organization'))return {records:[{Id:org}],done:true};
  if(q.includes('FROM ContentDocumentLink')){const doc=q.match(/ContentDocumentId = '([^']+)'/)[1];return {records:links.filter(l=>l.ContentDocumentId===doc&&l.LinkedEntityId===org),done:true};}
  let list=rows.filter(r=>r.owner===user||links.some(l=>l.ContentDocumentId===r.ContentDocumentId));const exact=q.match(/Title = '([^']+)'/),key=q.match(/WHERE Id = '([^']+)'/);if(exact)list=list.filter(r=>r.Title===exact[1]);if(key)list=list.filter(r=>r.Id===key[1]);return {records:list.slice().reverse(),done:true};},
  create:async(object,value)=>{if(object==='ContentDocumentLink'){if(fail||(failCommit&&rows.find(r=>r.ContentDocumentId===value.ContentDocumentId)?.Description.startsWith('cfs-pending:')))return {success:false,errors:['Sharing denied']};links.push({...value,Id:'06A000000000001'});return {success:true,id:'06A000000000001'};}
   const key=String(++sequence).padStart(12,'0');rows.push({...value,Id:'068'+key,ContentDocumentId:'069'+key,owner:user});return {success:true,id:'068'+key};},
  update:async(object,key,values)=>{const row=rows.find(r=>r.Id===key);assert.equal(row.owner,user);Object.assign(row,values);return {success:true};}};}
 return {sf,rows,links,deny:()=>fail=true,denyCommit:()=>failCommit=true};
}
test('two user connections read and append to the same organization-shared GUS journal',async()=>{
 const f=fixture(),a=new ContentStore(f.sf('a'),{shared:true}),b=new ContentStore(f.sf('b'),{shared:true});
 const first=await a.put('release','one',{id:'one',name:'Shared release'},null);assert.equal((await b.get('release','one')).revision,first.revision);
 const second=await b.put('release','one',{...first,name:'Shared edit'},first.revision);assert.equal((await a.get('release','one')).name,'Shared edit');assert.equal((await a.get('release','one')).revision,second.revision);
 assert.ok(f.links.every(l=>l.ShareType==='V'&&l.Visibility==='AllUsers'));
});
test('sharing failure never publishes an owner-only committed change',async()=>{
 const f=fixture(),a=new ContentStore(f.sf('a'),{shared:true});await a.put('release','one',{id:'one',name:'Before'},null);const old=await a.get('release','one');f.deny();
 await assert.rejects(()=>a.put('release','one',{...old,name:'Private must not publish'},old.revision),/share/i);assert.equal((await a.get('release','one')).name,'Before');assert.equal((await new ContentStore(f.sf('b'),{shared:true}).get('release','one')).name,'Before');
});

test('failure sharing a commit leaves the previous revision visible to both users',async()=>{
 const f=fixture(),a=new ContentStore(f.sf('a'),{shared:true}),b=new ContentStore(f.sf('b'),{shared:true});const old=await a.put('release','one',{id:'one',name:'Before'},null);f.denyCommit();
 await assert.rejects(()=>a.put('release','one',{...old,name:'Must not become private'},old.revision),/share/i);assert.equal((await a.get('release','one')).name,'Before');assert.equal((await b.get('release','one')).name,'Before');assert.ok(f.rows.some(r=>r.Description.startsWith('cfs-pending:')));
});
