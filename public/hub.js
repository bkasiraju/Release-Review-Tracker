/* Team hub core: shared team context, page registry/router, home tiles, GUS delta-save queue.
 * Pages call Hub.register({id,label,icon,tone,desc,render(el,hub),stat?(home,hub)}) and read Hub.team. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(n,t)=>window.ReviewIcons?window.ReviewIcons.icon(n,t):'';
const call=(a,d)=>window.api(a,d);
const LS='cfs.hub.team';
const ALL={Id:'all',Name:'All CFS teams',short:'All teams'};
const H={teams:[],team:ALL,pages:new Map(),current:null,esc,icon,call,GUS:'https://gus.lightning.force.com/lightning/r/'};
const listeners=new Set();

// ── Team context ────────────────────────────────────────────────────────────
const keyFor=t=>t.short==='MQ'?/message queue|\bmq\b/i:t.short==='MAPS'?/\bmaps\b|managed async/i:new RegExp(String(t.Name).split(/\s+/)[0].replace(/[^a-z0-9]/gi,''),'i');
H.teamMatches=name=>H.team.Id==='all'||!name||keyFor(H.team).test(String(name));
H.hasTeam=()=>H.team.Id!=='all';
H.onTeam=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
H.setTeam=id=>{
  H.team=H.teams.find(t=>t.Id===id)||ALL;
  try{localStorage.setItem(LS,H.team.Id);}catch{/* private mode */}
  $('hub-team').value=H.team.Id;
  window.dispatchEvent(new Event('hub:team'));
  for(const fn of listeners)fn(H.team);
  renderCurrent();
};
H.needTeam=el=>{
  if(H.hasTeam())return false;
  el.innerHTML=`<div class="empty-state hub-empty">${icon('users','blue')}<h3>Select a team</h3><p>This page shows GUS data for one scrum team. Pick MQ, MAPS or VegaCache in the team filter above.</p></div>`;
  return true;
};
let membersCache=new Map();
H.members=async()=>{const id=H.team.Id;if(!membersCache.has(id))membersCache.set(id,call('hub-members',{teamId:id}).then(r=>r.members,e=>{membersCache.delete(id);throw e;}));return membersCache.get(id);};
let picks;H.picklists=()=>picks||(picks=call('hub-picklists',{}).catch(e=>{picks=null;throw e;}));

// ── Registry + router ───────────────────────────────────────────────────────
H.register=page=>{H.pages.set(page.id,page);};
const NAV=['home','sprints','bugs','tests','epics','rotations','tds','links','status'];
function renderNav(){
  $('hub-nav').innerHTML=NAV.filter(id=>H.pages.has(id)).map(id=>{const p=H.pages.get(id),on=id===H.current;
    return `<button data-page="${id}" class="${on?'selected':''}" aria-pressed="${on}" ${on?'aria-current="page"':''}>${icon(p.icon,p.tone)} ${esc(p.label)}</button>`;}).join('');
  document.querySelectorAll('.rail-button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===H.current));
}
function legacy(view){const b=document.querySelector(`[data-view="${view}"]`);if(b)b.click();}
function renderCurrent(){
  const p=H.pages.get(H.current);if(!p||p.legacy)return;
  const el=$('hub-page');el.innerHTML='';
  if(p.needsTeam&&H.needTeam(el))return;
  try{p.render(el,H);}catch(e){el.innerHTML=`<div class="empty-state hub-empty"><h3>Could not load ${esc(p.label)}</h3><p>${esc(e.message)}</p></div>`;}
}
H.go=(id,opts={})=>{
  const p=H.pages.get(id)||H.pages.get('home');id=p.id;
  H.current=id;document.body.dataset.hub=id;
  const own=!p.legacy;$('hub-panel').classList.toggle('hidden',!own);
  if(p.legacy)legacy(p.legacy);
  renderNav();renderCurrent();
  if(!opts.silent&&location.hash!=='#/'+id)history.pushState(null,'','#/'+id);
  window.scrollTo(0,0);
};

// ── Delta saves to GUS ──────────────────────────────────────────────────────
// Optimistic UI; per-record coalescing; one parallel request per flush; only changed fields are sent.
const pending=new Map();let timer=null,inflight=0,lastOk=null;
function chip(){
  const el=$('gus-sync');if(!el)return;
  const n=pending.size+inflight;
  el.className='gus-sync '+(n?'busy':lastOk?'ok':'');
  el.textContent=n?`Saving ${n} change${n>1?'s':''} to GUS…`:lastOk?`Saved to GUS · ${lastOk}`:'';
}
async function flush(){
  timer=null;const batch=[...pending.values()];pending.clear();if(!batch.length)return;
  inflight+=batch.length;chip();
  try{
    const r=await call('gus-update',{updates:batch.map(e=>({object:e.object,id:e.id,fields:e.fields}))});
    r.results.forEach((res,i)=>{const e=batch[i];if(res.ok){e.onDone&&e.onDone(true);}else{e.undo&&e.undo();window.toast?.(`GUS did not save ${e.label||'the change'}: ${res.error}`,true);e.onDone&&e.onDone(false);}});
    if(r.results.some(x=>x.ok))lastOk=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }catch(e){batch.forEach(x=>{x.undo&&x.undo();x.onDone&&x.onDone(false);});window.toast?.('Could not reach GUS: '+e.message,true);}
  finally{inflight-=batch.length;chip();}
}
/** Queue a delta. `undo` restores the UI if GUS rejects it. delay: 0 for pickers, ~500 for typed text. */
H.save=({object,id,fields,undo,label,delay=0,onDone})=>{
  const key=object+':'+id,e=pending.get(key)||{object,id,fields:{},label,undos:[],dones:[]};
  Object.assign(e.fields,fields);e.undos.push(undo);e.dones.push(onDone);
  e.undo=()=>e.undos.slice().reverse().forEach(u=>u&&u());e.onDone=ok=>e.dones.forEach(d=>d&&d(ok));
  pending.set(key,e);chip();
  clearTimeout(timer);timer=setTimeout(flush,delay);
};
/** Generic inline editing: <select|input data-edit="ADM_Work__c" data-id data-field data-type="num|text|date" data-prev>. */
H.bindEdit=(root,apply)=>{
  root.addEventListener('change',ev=>{
    const el=ev.target.closest('[data-edit]');if(!el)return;
    const {edit:object,id,field,type}=el.dataset,prev=el.dataset.prev??'';let raw=el.value,val;
    if(type==='num'){val=raw===''?null:Number(raw);if(val!==null&&(!Number.isFinite(val)||val<0)){el.value=prev;return window.toast?.('Enter a positive number.',true);}}
    else if(type==='date'||type==='ref')val=raw||null;else val=raw;
    if(String(val??'')===String(prev))return;
    const restore=()=>{el.value=prev;el.dataset.prev=prev;apply&&apply(id,field,prev===''?null:(type==='num'?Number(prev):prev),true);el.classList.remove('saving');};
    el.dataset.prev=String(val??'');el.classList.add('saving');
    apply&&apply(id,field,val,false);
    H.save({object,id,fields:{[field]:val},undo:restore,label:el.dataset.label||field,delay:type==='text'?400:0,onDone:()=>el.classList.remove('saving')});
  });
};
H.options=(list,value)=>{const set=[...new Set([...(value&&!list.includes(value)?[value]:[]),...list])];return set.map(o=>`<option${o===value?' selected':''}>${esc(o)}</option>`).join('');};

// ── Home ────────────────────────────────────────────────────────────────────
const fmtDate=d=>d?new Date(d+'T00:00:00').toLocaleDateString([],{month:'short',day:'numeric'}):'';
const daysLeft=end=>Math.max(0,Math.ceil((new Date(end+'T23:59:59')-Date.now())/864e5));
H.currentRota=rows=>{const t=new Date().toISOString().slice(0,10);return (rows||[]).find(r=>r.start<=t&&r.end>=t)||null;};
function tile(p,stat){
  const soon=p.soon;
  return `<button class="hub-tile${soon?' soon':''}" data-go="${p.id}"><span class="hub-tile-head">${icon(p.icon,p.tone)}<strong>${esc(p.label)}</strong>${soon?'<em class="hub-soon">Coming soon</em>':''}</span><span class="hub-tile-stat">${stat&&stat.big!=null?`<b>${esc(stat.big)}</b>`:''}<small>${esc((stat&&stat.text)||p.desc)}</small></span>${stat&&stat.chips?`<span class="hub-tile-chips">${stat.chips}</span>`:''}</button>`;
}
function renderHome(el){
  const team=H.team,teamId=team.Id;
  const stat={};
  const draw=(home,rota)=>{
    const s=home&&home.sprint,pd=H.currentRota(rota&&rota.pd),th=H.currentRota(rota&&rota.trusthero);
    const banner=s?`<section class="hub-banner" aria-label="Current sprint"><div><span class="hub-eyebrow">${s.current?'Current sprint':'Latest sprint'}</span><h2>${esc(s.name)}</h2><p>${fmtDate(s.start)} – ${fmtDate(s.end)}${s.current?` · ${daysLeft(s.end)} day${daysLeft(s.end)===1?'':'s'} left`:''}${s.goal?` · ${esc(s.goal.replace(/\s+/g,' ').slice(0,140))}`:''}</p></div><div class="hub-banner-stat"><b>${s.sayDo!=null?Math.round(s.sayDo)+'%':'—'}</b><small>say-do</small></div></section>`:`<section class="hub-banner muted"><div><span class="hub-eyebrow">Sprint</span><h2>${home?'No sprint found':'Loading sprint…'}</h2></div></section>`;
    const rot=`<section class="hub-rota" aria-label="On rotation now"><span>${icon('rotation','violet')}<b>PD on-call</b> ${pd?esc(pd.name):'<i>not set</i>'}</span><span>${icon('flag','amber')}<b>Trust Hero</b> ${th?esc(th.name):'<i>not set</i>'}</span><button class="text-button" data-go="rotations">Rotations ›</button></section>`;
    const tiles=NAV.filter(id=>id!=='home'&&H.pages.has(id)).map(id=>{const p=H.pages.get(id);return tile(p,p.stat?p.stat(home,{rota,pd,th}):null);}).join('');
    el.innerHTML=`${banner}${rot}<div class="hub-tiles">${tiles}</div>`;
  };
  draw(null,null);
  if(!H.hasTeam()){
    el.querySelector('.hub-banner h2').textContent='All CFS teams';
    el.querySelector('.hub-banner small').textContent='';
    el.querySelector('.hub-banner p')?.remove();
    el.insertAdjacentHTML('beforeend','<p class="note hub-hint">Pick a team in the filter above to see its sprint, bugs, TDs and rotation.</p>');
    return;
  }
  Promise.all([call('hub-home',{teamId}),call('hub-rotation',{teamId}).then(r=>r.rota,()=>null)]).then(([home,rota])=>{if(H.current==='home'&&H.team.Id===teamId)draw(home,rota);})
    .catch(e=>{if(H.current==='home')el.insertAdjacentHTML('afterbegin',`<p class="note error">Could not load team summary: ${esc(e.message)}</p>`);});
}
H.register({id:'home',label:'Overview',icon:'home',tone:'violet',desc:'Team hub',render:renderHome});
H.register({id:'epics',label:'Epics',icon:'scope',tone:'green',desc:'Release epics, health and monthly updates',legacy:'overview',stat:()=>({text:'Release review · health and monthly updates'})});
H.register({id:'status',label:'Status Report',icon:'ai',tone:'violet',desc:'V2MOM executive updates',legacy:'executive',stat:()=>({text:'V2MOM executive summary and leadership update'})});
function soon(id,label,ic,tone,desc){
  H.register({id,label,icon:ic,tone,desc,soon:true,render:el=>{el.innerHTML=`<section class="hub-soon-page">${icon(ic,tone)}<h2>${esc(label)}</h2><span class="hub-soon">Coming soon</span><p>${esc(desc)}. This page is on the roadmap and will plug into the same team filter and GUS-backed data.</p><button class="button primary" data-go="home">Back to overview</button></section>`;}});
}
soon('tests','Test Failures','flask','rose','Track failing tests and flaky suites for the release');
soon('links','Quick Links','link','teal','Curated dashboards, runbooks and release resources');

// ── Boot ────────────────────────────────────────────────────────────────────
function route(){const id=(location.hash.match(/^#\/([a-z]+)/)||[])[1];H.go(id||'home',{silent:true});}
async function boot(){
  document.addEventListener('click',e=>{const g=e.target.closest('[data-go],[data-page]');if(g){e.preventDefault();H.go(g.dataset.go||g.dataset.page);}});
  window.addEventListener('popstate',route);
  $('hub-team').addEventListener('change',e=>H.setTeam(e.target.value));
  try{
    const r=await call('hub-teams',{});H.teams=r.teams;
    $('hub-team').innerHTML=[ALL,...H.teams].map(t=>`<option value="${esc(t.Id)}">${esc(t.short||t.Name)}</option>`).join('');
    let saved=null;try{saved=localStorage.getItem(LS);}catch{/* ignore */}
    H.team=H.teams.find(t=>t.Id===saved)||H.teams.find(t=>t.Id===r.primaryTeamId)||H.teams[0]||ALL;
    $('hub-team').value=H.team.Id;
  }catch(e){window.toast?.('Team list unavailable: '+e.message,true);}
  window.dispatchEvent(new Event('hub:team'));
  route();
}
window.Hub=H;
document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));
})();
