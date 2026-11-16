'use strict';
/**
 * Sprint Action Log: per-team action items raised against sprint work items, stored in the shared
 * ContentVersion store as one record per team. Owners must be members of that team (checked server-side).
 */
const {randomUUID}=require('crypto');
const hub=require('./hub');
const PRIORITIES=['Critical','High','Medium','Low'],MAX_ITEMS=500,RETENTION_DAYS=30,DAY=864e5;
const SF_ID=/^[a-zA-Z0-9]{15,18}$/;
const text=(v,max)=>String(v==null?'':v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max);
const fresh=(x,now)=>now-Date.parse(x.createdAt)<RETENTION_DAYS*DAY;
const prune=(items,now=Date.now())=>items.filter(x=>fresh(x,now));
const put=(store,teamId,items,rev)=>(store.putSnapshot||store.put).call(store,'actions',teamId,{teamId,items,snapshot:true},rev);
let lastSweep=0;
async function read(store,teamId){hub.requireTeam(teamId);const doc=await store.get('actions',teamId);return doc||{items:[]};}
/** Enforce the 30-day retention on one team's record: drop expired items, rewrite a clean snapshot, then delete old saved files. */
async function enforce(store,teamId,cur){
  const items=Array.isArray(cur.items)?cur.items:[],kept=prune(items);
  if(kept.length!==items.length||(cur.revision&&!cur.snapshot)){const saved=await put(store,teamId,kept,cur.revision??null);cur={...saved,items:kept};}
  return cur;
}
/** Housekeeping must never delay or fail a request: give it 8 seconds, then carry on. */
const bounded=p=>Promise.race([p,new Promise(r=>setTimeout(()=>r(null),8000))]).catch(()=>null);
async function purge(store){if(typeof store.purgeOlderThan!=='function')return null;try{return await store.purgeOlderThan('actions',RETENTION_DAYS);}catch(e){return {purged:0,failed:0,error:e.message};}}
/** Apply retention to every team's record (throttled to once every 6 hours per runtime). */
async function sweep(store,force){
  if(!force&&Date.now()-lastSweep<6*3600e3)return null;lastSweep=Date.now();
  if(typeof store.list!=='function')return null;
  try{
    for(const d of await store.list('actions'))if(d&&d.teamId&&(!d.snapshot||(d.items||[]).some(x=>!fresh(x,Date.now()))))try{await enforce(store,d.teamId,d);}catch(_){/* next sweep retries */}
    // Old files are only deleted once every team record is a full snapshot, so no remaining record depends on a deleted journal event.
    if((await store.list('actions')).some(d=>!d||!d.snapshot))return {purged:0,failed:0,skipped:'some team records are not converted yet'};
  }catch(_){return null;}
  return purge(store);
}
async function write(store,teamId,mutate){
  for(let attempt=0;attempt<2;attempt++){
    const cur=await read(store,teamId),items=prune(Array.isArray(cur.items)?cur.items.map(x=>({...x})):[]);
    const out=mutate(items);
    try{const saved=await put(store,teamId,items,cur.revision??null);return {items:saved.items||items,revision:saved.revision,result:out};}
    catch(e){if(attempt===1||!/changed/i.test(e.message))throw e;}
  }
}
async function list(store,teamId){
  const d=await enforce(store,teamId,await read(store,teamId));
  return {items:prune(d.items||[]),revision:d.revision||null,retentionDays:RETENTION_DAYS};
}
async function save(store,sf,teamId,b){
  hub.requireTeam(teamId);
  const wid=text(b.workId,18);if(!SF_ID.test(wid))throw Error('Invalid work item.');
  const name=text(b.workName,30);if(!/^W-\d{3,10}$/.test(name))throw Error('Invalid W-ID.');
  const details=text(b.details,1000);if(!details)throw Error('Describe the action item.');
  const eta=text(b.eta,10);if(!/^\d{4}-\d\d-\d\d$/.test(eta)||Number.isNaN(Date.parse(eta)))throw Error('Pick a valid ETA date.');
  if(Date.parse(eta)>Date.now()+RETENTION_DAYS*DAY)throw Error(`ETA must be within ${RETENTION_DAYS} days — action items are kept for ${RETENTION_DAYS} days.`);
  const priority=PRIORITIES.includes(b.priority)?b.priority:null;if(!priority)throw Error('Pick a priority.');
  const members=(await hub.getMembers(sf,teamId)).members,owner=members.find(m=>m.id===b.ownerId);
  if(!owner)throw Error('The owner must be a member of this team.');
  const assignee=text(b.assignee,120)||'Unassigned';
  const item={id:randomUUID(),workId:wid,workName:name,subject:text(b.subject,240),assignee,assigneeId:SF_ID.test(String(b.assigneeId||''))?b.assigneeId:null,ownerId:owner.id,owner:owner.name,details,eta,priority,sprintId:SF_ID.test(String(b.sprintId||''))?b.sprintId:null,sprintName:text(b.sprintName,120),status:'open',createdAt:new Date().toISOString(),resolvedAt:null};
  const r=await write(store,teamId,items=>{if(items.length>=MAX_ITEMS)throw Error('Action log is full. Resolve and archive older items first.');items.push(item);});
  await bounded(sweep(store,false));
  return {items:r.items,item};
}
async function resolve(store,teamId,b){
  const id=text(b.id,40);let found=false;
  const r=await write(store,teamId,items=>{const it=items.find(x=>x.id===id);if(!it)throw Error('Action item not found.');found=true;const on=b.resolved!==false;it.status=on?'resolved':'open';it.resolvedAt=on?new Date().toISOString():null;});
  await bounded(sweep(store,false));
  return {items:r.items,found};
}
async function setEta(store,teamId,b){
  const id=text(b.id,40),eta=text(b.eta,10);
  if(!/^\d{4}-\d\d-\d\d$/.test(eta)||Number.isNaN(Date.parse(eta)))throw Error('Pick a valid ETA date.');
  if(Date.parse(eta)>Date.now()+RETENTION_DAYS*DAY)throw Error(`ETA must be within ${RETENTION_DAYS} days — action items are kept for ${RETENTION_DAYS} days.`);
  const r=await write(store,teamId,items=>{const it=items.find(x=>x.id===id);if(!it)throw Error('Action item not found.');it.eta=eta;});
  return {items:r.items};
}
async function remove(store,teamId,b){
  const id=text(b.id,40);
  const r=await write(store,teamId,items=>{const i=items.findIndex(x=>x.id===id);if(i<0)throw Error('Action item not found.');items.splice(i,1);});
  return {items:r.items};
}
module.exports={list,save,resolve,setEta,remove,sweep,prune,PRIORITIES,RETENTION_DAYS};
