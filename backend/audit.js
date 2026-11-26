'use strict';
/**
 * Audit log: who changed what, per team. Every successful mutating dashboard action appends one event to that team's
 * record in the shared ContentVersion store (actions that are not tied to a team go to the "shared" record). Events carry
 * the person, time, area and a short human summary only: never tokens, message bodies or full payloads.
 * Writes are best effort and bounded: a failed or slow audit write never fails or delays the change itself.
 */
const {randomUUID}=require('crypto');
const SF_ID=/^[a-zA-Z0-9]{15,18}$/;
const RETENTION_DAYS=180,MAX_EVENTS=1500,MERGE_MS=10*60e3,DAY=864e5,SHARED='shared';
const AREAS=['Release plan','Epics & workstreams','GUS records','Release review','Sprint actions','Team settings','Messaging'];
const text=(v,max)=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const nm=o=>o&&typeof o==='object'?text(o.name||o.Name||o.label||o.title||o.subject||o.workName||'',120):'';
const n=a=>Array.isArray(a)?a.length:0;
const q=s=>s?` "${s}"`:'';

/** action -> how it is audited. `when` can skip non-writes (previews); `team` finds the team; `say` builds the summary. */
const RULES={
  'plan-save':{area:'Release plan',merge:true,say:()=>'Edited the release plan'},
  'plan-commit':{area:'Release plan',when:b=>b.confirm===true,say:b=>'Saved the plan to GUS'+(b.includeBtl?' (including below-the-line)':'')},
  'plan-v2mom-import':{area:'Release plan',say:()=> 'Imported V2MOM measures into the plan'},
  'plan-smart-goal-save':{area:'Epics & workstreams',say:b=>'Saved the SMART goal'+q(text(b.gusId,20))},
  'plan-sync-epics':{area:'Epics & workstreams',say:b=>`Synced ${n(b.epics)} epic(s) to GUS`},
  'plan-sync-workstreams':{area:'Epics & workstreams',say:b=>`Synced ${n(b.items)} workstream(s) to GUS`},
  'plan-create-project':{area:'Epics & workstreams',say:b=>'Created project'+q(nm(b.project))},
  'plan-move-project':{area:'Epics & workstreams',say:b=>'Moved project'+q(nm(b.project))},
  'plan-delete-project':{area:'Epics & workstreams',say:b=>'Deleted project'+q(nm(b.project))},
  'plan-create-epic':{area:'Epics & workstreams',say:b=>'Created epic'+q(nm(b.epic))},
  'plan-adopt-epic':{area:'Epics & workstreams',say:b=>'Adopted epic'+q(nm(b.epic))},
  'plan-delete-epic':{area:'Epics & workstreams',say:b=>'Deleted epic'+q(nm(b.epic))},
  'plan-create-workstream':{area:'Epics & workstreams',say:b=>'Created workstream'+q(nm(b.workstream))},
  'plan-backlog-assign':{area:'Epics & workstreams',say:(b,p)=>{const r=(p&&p.results||[]).filter(x=>x.ok).length;return `Pulled ${r} TD/CARR item(s) into an epic as workstreams`;}},
  'plan-move-workstream':{area:'Epics & workstreams',say:b=>'Moved workstream'+q(nm(b.workstream))},
  'plan-delete-workstream':{area:'Epics & workstreams',say:b=>'Deleted workstream'+q(nm(b.workstream))},
  'gus-update':{area:'GUS records',say:b=>{const u=Array.isArray(b.updates)?b.updates:[];const f=u[0]||{};return u.length>1?`Updated ${u.length} GUS records`:'Updated GUS record'+q(text(f.id,20));},
    detail:(b)=> (Array.isArray(b.updates)?b.updates:[]).slice(0,8).flatMap(u=>Object.entries(u&&u.fields||{}).slice(0,6).map(([k,v])=>text(`${u.id}: ${k} → ${v&&typeof v==='object'?'(changed)':v}`,160)))},
  'sal-save':{area:'Sprint actions',say:b=>'Raised an action item'+q(text(b.workName||b.subject,80))},
  'sal-resolve':{area:'Sprint actions',say:b=>b.resolved===false?'Re-opened an action item':'Resolved an action item'},
  'sal-edit':{area:'Sprint actions',say:()=> 'Edited an action item'},
  'sal-eta':{area:'Sprint actions',say:b=>'Changed an action item ETA'+(b.eta?' to '+text(b.eta,12):'')},
  'sal-delete':{area:'Sprint actions',say:()=> 'Deleted an action item'},
  'hub-champion-save':{area:'Team settings',say:()=> 'Updated the Trust Champion'},
  'hub-rotation-save':{area:'Team settings',say:()=> 'Updated the rotation'},
  'save-team':{area:'Team settings',team:b=>b.id||b.teamId||(b.team&&b.team.Id),say:b=>'Saved team settings'+q(nm(b.team)||text(b.name,80))},
  'delete-team':{area:'Team settings',team:b=>b.id||b.teamId,say:()=> 'Removed a team from ReleaseIQ'},
  'set-review-default':{area:'Release review',say:b=>b.releaseId?'Set the default review release':'Cleared the default review release'},
  'slack-channels-save':{area:'Messaging',say:()=> 'Changed Slack channel settings'},
  'post-slack-send':{area:'Messaging',say:()=> 'Sent a Slack message'},
  'deck-slack-send':{area:'Messaging',say:()=> 'Shared the epic review deck to Slack'},
  'post-chatter':{area:'Messaging',say:()=> 'Posted to GUS Chatter'},
  'epic-chat-post':{area:'Messaging',say:()=> 'Posted an epic comment'},
  // Release Review actions are tied to a release, which is not owned by one team: they go to the shared record.
  'save-release':{area:'Release review',release:true,say:b=>(b.id?'Edited release':'Created release')+q(text(b.name,100))},
  'use-planned-release':{area:'Release review',release:true,say:b=>'Started tracking a planned release'+q(text(b.name,100))},
  'delete-release':{area:'Release review',release:true,say:b=>'Deleted release'+q(text(b.confirmation,100))},
  'save-epic-status':{area:'Release review',release:true,say:b=>'Changed Epic Status'+(b.previousStatus?` from ${text(b.previousStatus,30)}`:'')+' to '+text(b.value,30)},
  'save-review-status':{area:'Release review',release:true,say:b=>'Set Review Status'+(b.value?' to '+text(b.value,40):' (cleared)')},
  'save-path-to-green':{area:'Release review',release:true,say:()=> 'Saved Path to Green'},
  'save-draft':{area:'Release review',release:true,merge:true,say:b=>'Saved a monthly update draft'+(b.month?' for '+text(b.month,10):'')},
  'publish-month':{area:'Release review',release:true,say:b=>'Published the monthly review'+(b.month?' for '+text(b.month,10):'')},
  'set-year':{area:'Release review',release:true,say:()=> 'Changed the review year'},
  'save-settings':{area:'Release review',release:true,say:()=> 'Changed review settings'},
  'save-v2mom-mapping':{area:'Release review',release:true,say:()=> 'Changed a V2MOM mapping'},
  'save-v2mom-reference':{area:'Release review',say:()=> 'Changed a V2MOM reference'},
  'sync':{area:'Release review',release:true,say:()=> 'Synced a health comment to GUS'}
};
const audited=action=>Object.prototype.hasOwnProperty.call(RULES,action);

const who=new Map();
/** The signed-in person: name and GUS user id, looked up once per runtime. Falls back to the username. */
async function actor(sf){
  let id={};try{if(sf&&typeof sf.identity==='function')id=await sf.identity()||{};}catch(_){/* optional */}
  const uid=id.user_id||id.userId||sf&&sf.userId||'',key=uid||id.username||'unknown';
  if(who.has(key))return who.get(key);
  let name=id.display_name||id.name||'';
  if(!name&&SF_ID.test(uid)){try{name=((await sf.query(`SELECT Name FROM User WHERE Id = '${uid}' LIMIT 1`)).records||[])[0]?.Name||'';}catch(_){/* keep username */}}
  const a={id:uid||'',name:text(name||id.username||'Unknown user',80),username:''};who.set(key,a);return a;
}

const prune=(events,now=Date.now())=>events.filter(e=>now-Date.parse(e.ts)<RETENTION_DAYS*DAY).slice(-MAX_EVENTS);
const put=(store,id,events,rev)=>(store.putSnapshot||store.put).call(store,'audit',id,{teamId:id,events,snapshot:true},rev);

/** Describe a successful action, or return null when it is not an audited change. */
function describe(action,b,payload){
  const r=RULES[action];if(!r||(r.when&&!r.when(b)))return null;
  const teamRaw=r.team?r.team(b):r.release?'':b.teamId,team=SF_ID.test(String(teamRaw||''))?String(teamRaw):SHARED;
  let detail=[];try{detail=r.detail?r.detail(b).filter(Boolean):[];}catch(_){/* summary is enough */}
  return {team,area:r.area,action,summary:text(r.say(b||{},payload),200),detail,merge:!!r.merge,releaseId:r.release&&/^[a-f0-9-]{36}$/.test(String(b.releaseId||b.id||''))?String(b.releaseId||b.id):''};
}

let lastSweep=0,lastError='';
const failure=()=>lastError;
/** Old audit files are deleted at most every 6 hours, in the background; failures are retried at the next sweep. */
function sweep(store){if(Date.now()-lastSweep<6*3600e3||typeof store.purgeOlderThan!=='function')return;lastSweep=Date.now();Promise.resolve().then(()=>store.purgeOlderThan('audit',RETENTION_DAYS)).catch(()=>{lastSweep=0;});}
/** Append one event (retrying once on a concurrent write). Never throws. */
async function record(store,sf,ctx,action,b,payload,service){
  try{
    lastError='';
    if(!store||ctx&&ctx.demo||!audited(action))return null;
    const d=describe(action,b||{},payload);if(!d)return null;
    let release='';if(d.releaseId&&service&&typeof service.release==='function'){try{release=text((await service.release(d.releaseId)).name,100);}catch(_){/* release may be deleted */}}
    const who=await actor(sf),now=Date.now(),ts=new Date(now).toISOString();
    for(let attempt=0;attempt<3;attempt++){
      if(attempt)await new Promise(r=>setTimeout(r,50+Math.random()*250));
      const cur=await store.get('audit',d.team)||{events:[]},events=prune(Array.isArray(cur.events)?cur.events.map(e=>({...e})):[],now),last=events[events.length-1];
      if(d.merge&&last&&last.action===action&&last.actor.id===who.id&&last.actor.name===who.name&&last.release===release&&now-Date.parse(last.ts)<MERGE_MS){last.ts=ts;last.count=(last.count||1)+1;}
      else events.push({id:randomUUID(),ts,actor:who,teamId:d.team===SHARED?'':d.team,area:d.area,action,summary:d.summary,detail:d.detail,release,count:1});
      try{await put(store,d.team,events,cur.revision??null);sweep(store);return true;}catch(e){lastError=text(e&&e.message||e,200);if(attempt===2||!/changed|verified/i.test(e.message))return false;}
    }
  }catch(e){lastError=text(e&&e.message||e,200);/* auditing must never break the change that was already made */}
  return false;
}

/** Events for one team, or for every team ("all"), newest first, limited to the last `days` days. */
async function read(store,b){
  const days=Math.min(RETENTION_DAYS,Math.max(1,Math.floor(Number(b.days)||30))),since=Date.now()-days*DAY;
  const id=String(b.teamId||'all');let docs=[];
  if(id==='all'){if(typeof store.list==='function')docs=await store.list('audit');}
  else{if(id!==SHARED&&!SF_ID.test(id))throw Error('Unknown team');const d=await store.get('audit',id);if(d)docs=[d];}
  const events=docs.filter(Boolean).flatMap(d=>Array.isArray(d.events)?d.events:[]).filter(e=>e&&Date.parse(e.ts)>=since).sort((a,c)=>Date.parse(c.ts)-Date.parse(a.ts));
  return {events:events.slice(0,MAX_EVENTS),days,retentionDays:RETENTION_DAYS,areas:AREAS,truncated:events.length>MAX_EVENTS};
}

module.exports={failure,record,read,describe,audited,AREAS,RETENTION_DAYS,__test:{prune,RULES}};
