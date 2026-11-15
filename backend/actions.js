'use strict';
/**
 * Sprint Action Log: per-team action items raised against sprint work items, stored in the shared
 * ContentVersion store as one record per team. Owners must be members of that team (checked server-side).
 */
const {randomUUID}=require('crypto');
const hub=require('./hub');
const PRIORITIES=['Critical','High','Medium','Low'],MAX_ITEMS=500;
const SF_ID=/^[a-zA-Z0-9]{15,18}$/;
const text=(v,max)=>String(v==null?'':v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max);
const rec=(items)=>({items});
async function read(store,teamId){hub.requireTeam(teamId);const doc=await store.get('actions',teamId);return doc||{items:[]};}
async function write(store,teamId,mutate){
  for(let attempt=0;attempt<2;attempt++){
    const cur=await read(store,teamId),items=Array.isArray(cur.items)?cur.items.map(x=>({...x})):[];
    const out=mutate(items);
    try{const saved=await store.put('actions',teamId,rec(items),cur.revision??null);return {items:saved.items||items,revision:saved.revision,result:out};}
    catch(e){if(attempt===1||!/changed/i.test(e.message))throw e;}
  }
}
async function list(store,teamId){const d=await read(store,teamId);return {items:d.items||[],revision:d.revision||null};}
async function save(store,sf,teamId,b){
  hub.requireTeam(teamId);
  const wid=text(b.workId,18);if(!SF_ID.test(wid))throw Error('Invalid work item.');
  const name=text(b.workName,30);if(!/^W-\d{3,10}$/.test(name))throw Error('Invalid W-ID.');
  const details=text(b.details,1000);if(!details)throw Error('Describe the action item.');
  const eta=text(b.eta,10);if(!/^\d{4}-\d\d-\d\d$/.test(eta)||Number.isNaN(Date.parse(eta)))throw Error('Pick a valid ETA date.');
  const priority=PRIORITIES.includes(b.priority)?b.priority:null;if(!priority)throw Error('Pick a priority.');
  const members=(await hub.getMembers(sf,teamId)).members,owner=members.find(m=>m.id===b.ownerId);
  if(!owner)throw Error('The owner must be a member of this team.');
  const assignee=text(b.assignee,120)||'Unassigned';
  const item={id:randomUUID(),workId:wid,workName:name,subject:text(b.subject,240),assignee,assigneeId:SF_ID.test(String(b.assigneeId||''))?b.assigneeId:null,ownerId:owner.id,owner:owner.name,details,eta,priority,sprintId:SF_ID.test(String(b.sprintId||''))?b.sprintId:null,sprintName:text(b.sprintName,120),status:'open',createdAt:new Date().toISOString(),resolvedAt:null};
  const r=await write(store,teamId,items=>{if(items.length>=MAX_ITEMS)throw Error('Action log is full. Resolve and archive older items first.');items.push(item);});
  return {items:r.items,item};
}
async function resolve(store,teamId,b){
  const id=text(b.id,40);let found=false;
  const r=await write(store,teamId,items=>{const it=items.find(x=>x.id===id);if(!it)throw Error('Action item not found.');found=true;const on=b.resolved!==false;it.status=on?'resolved':'open';it.resolvedAt=on?new Date().toISOString():null;});
  return {items:r.items,found};
}
module.exports={list,save,resolve,PRIORITIES};
