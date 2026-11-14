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
const NAV=['home','epics','sprints','tds','tests','rotations','links','bugs','status'];
function renderNav(){
  $('hub-nav').innerHTML=NAV.filter(id=>H.pages.has(id)).map(id=>{const p=H.pages.get(id),on=id===H.current;
    return `<button data-page="${id}" class="${on?'selected':''}" aria-pressed="${on}" ${on?'aria-current="page"':''}>${icon(p.icon,p.tone)} ${esc(p.label)}</button>`;}).join('');
  document.querySelectorAll('.rail-button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===H.current));
}
function legacy(view){const b=document.querySelector(`[data-view="${view}"]`);if(b)b.click();}
function renderCurrent(){
  const p=H.pages.get(H.current);if(!p||p.legacy)return;
  parkOverview();const el=$('hub-page');el.innerHTML=''; // overview-panel is app.js-owned: never let a page re-render destroy it
  if(p.needsTeam&&H.needTeam(el))return;
  try{p.render(el,H);}catch(e){el.innerHTML=`<div class="empty-state hub-empty"><h3>Could not load ${esc(p.label)}</h3><p>${esc(e.message)}</p></div>`;}
}
H.go=(id,opts={})=>{
  if(id!=='home')parkOverview();
  const p=H.pages.get(id)||H.pages.get('home');id=p.id;
  H.current=id;document.body.dataset.hub=id;
  const own=!p.legacy;$('hub-panel').classList.toggle('hidden',!own);
  if(p.legacy)legacy(p.legacy);
  renderNav();renderCurrent();
  if(!opts.silent&&location.hash!=='#/'+id)history.pushState(null,'','#/'+id);
  window.scrollTo(0,0);
};


// ── Read cache: in-flight dedupe + short TTL so tab switches and reloads are instant; Refresh/saves bust it ──
const READ=/^(hub-(home|tests|people|teams|bugs|sla|tds|rotation|champion|members|picklists)|sprint-(initial|history|data))$/,TTL=45000,cache=new Map();
H.bust=()=>cache.clear();
function installCache(){
  const raw=window.api;if(!raw||raw.__cached)return;
  const wrapped=(a,d={},m)=>{
    if(!READ.test(a))return raw(a,d,m);
    const k=a+JSON.stringify(d),hit=cache.get(k);
    if(hit&&Date.now()-hit.t<TTL)return hit.p;
    const p=raw(a,d,m);cache.set(k,{p,t:Date.now()});p.catch(()=>{if(cache.get(k)&&cache.get(k).p===p)cache.delete(k);});return p;
  };
  wrapped.__cached=true;window.api=wrapped;
  document.addEventListener('click',e=>{if(e.target.closest('[data-refresh],#sp-refresh'))H.bust();},true);
}
H.prefetch=teamId=>{if(!teamId||teamId==='all')return;const go=()=>['hub-tds','hub-sla','hub-rotation','sprint-initial','sprint-history'].forEach(a=>call(a,{teamId}).catch(()=>{}));(window.requestIdleCallback||setTimeout)(go,1);};
// ── Delta saves to GUS ──────────────────────────────────────────────────────
// Optimistic UI. Every record saves independently and in parallel (own debounce, own request, up to MAX_PAR at once),
// so one slow or failing record never delays or rolls back another. Network errors/timeouts retry once; the status chip
// shows saving/saved/failed so the user always sees the outcome.
const MAX_PAR=6,pending=new Map(),waiting=[];let running=0,failed=0,lastOk=null;
function chip(){
  const el=$('gus-sync');if(!el)return;
  const n=pending.size+waiting.length+running;
  el.className='gus-sync '+(n?'busy':failed?'bad':lastOk?'ok':'');
  el.textContent=n?`Saving ${n} change${n>1?'s':''} to GUS…`:failed?`${failed} change${failed>1?'s':''} not saved — see message`:lastOk?`Saved to GUS · ${lastOk}`:'';
}
async function send(e){
  const run=()=>call('gus-update',{updates:[{object:e.object,id:e.id,fields:e.fields}]});
  let r;
  try{r=await run();}catch(err){await new Promise(ok=>setTimeout(ok,600));r=await run();}
  return r.results[0];
}
async function pump(){
  while(running<MAX_PAR&&waiting.length){
    const e=waiting.shift();running++;chip();
    send(e).then(res=>{
      if(res&&res.ok){e.onDone&&e.onDone(true);lastOk=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});failed=0;H.bust&&H.bust();}
      else{failed++;e.undo&&e.undo();window.toast?.(`GUS did not save ${e.label||'the change'}: ${(res&&res.error)||'unknown error'}`,true);e.onDone&&e.onDone(false);}
    }).catch(err=>{failed++;e.undo&&e.undo();e.onDone&&e.onDone(false);window.toast?.(`Could not reach GUS for ${e.label||'the change'}: ${err.message}`,true);})
      .finally(()=>{running--;chip();pump();});
  }
}
/** Queue a delta. `undo` restores the UI if GUS rejects it. delay: 0 for pickers, ~400 for typed text. */
H.save=({object,id,fields,undo,label,delay=0,onDone})=>{
  const key=object+':'+id,e=pending.get(key)||{object,id,fields:{},label,undos:[],dones:[]};
  Object.assign(e.fields,fields);e.undos.push(undo);e.dones.push(onDone);
  e.undo=()=>e.undos.slice().reverse().forEach(u=>u&&u());e.onDone=ok=>e.dones.forEach(d=>d&&d(ok));
  pending.set(key,e);chip();
  clearTimeout(e.timer);
  e.timer=setTimeout(()=>{pending.delete(key);waiting.push(e);pump();},delay);
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
const groupKey=t=>t.short==='MAPS'?'maps':t.short==='MQ'?'mq':/vega/i.test(t.Name)?'vegacache':null;
const initials=n=>String(n).split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
let peopleData=null;
function drawPeople(el){
  const box=el.querySelector('#hub-people');if(!box)return;
  const g=groupKey(H.team);if(!g){box.hidden=true;return;}
  const paint=d=>{if(!box.isConnected||groupKey(H.team)!==g)return;
    box.hidden=!d||!d.people.length;if(box.hidden)return;
    box.innerHTML=`<h3>${esc(d.name)}</h3><ul>${d.people.map(p=>`<li><span class="hub-avatar" data-i="${esc(initials(p.name))}">${p.avatar?`<img src="${esc(p.avatar)}" alt="" decoding="async" onerror="this.remove()">`:''}</span><b>${esc(p.name)}</b><small>${esc(p.role)}</small></li>`).join('')}</ul>`;};
  if(!peopleData||peopleData.g!==g){try{const c=JSON.parse(localStorage.getItem('hub-people-'+g)||'null');if(c&&c.d)peopleData={g,d:c.d};}catch(_){}}
  if(peopleData&&peopleData.g===g)paint(peopleData.d);
  loadPeople(g).then(d=>paint(d),()=>{});
}
/** Fetch the team once per group, persist it, and pre-load every avatar image so the browser has it cached before it paints. */
const peopleLoads=new Map();
function loadPeople(g){
  if(!peopleLoads.has(g))peopleLoads.set(g,call('hub-people',{group:g}).then(d=>{
    peopleData={g,d};try{localStorage.setItem('hub-people-'+g,JSON.stringify({d}));}catch(_){}
    d.people.forEach(p=>{if(p.avatar){const i=new Image();i.src=p.avatar;}});return d;},e=>{peopleLoads.delete(g);throw e;}));
  return peopleLoads.get(g);
}
H.preloadPeople=()=>{const g=groupKey(H.team);if(g)loadPeople(g).catch(()=>{});};
/** The Release Health tiles live in #overview-panel (owned by app.js); on Team Hub they sit in the top row, elsewhere they go back. */
function parkOverview(){const ov=$('overview-panel'),hp=$('hub-panel');if(ov&&hp&&ov.parentElement!==hp.parentElement)hp.parentElement.insertBefore(ov,hp);}
H.parkOverview=parkOverview;
function renderHome(el){
  const team=H.team,teamId=team.Id;
  const stat={};
  const draw=(home,rota)=>{
    const s=home&&home.sprint,pd=H.currentRota(rota&&rota.pd),th=H.currentRota(rota&&rota.trusthero);
    const banner=s?`<section class="hub-banner" aria-label="Current sprint"><div><span class="hub-eyebrow">${s.current?'Current sprint':'Latest sprint'}</span><h2>${esc(s.name)}</h2><p>${fmtDate(s.start)} – ${fmtDate(s.end)}${s.current?` · ${daysLeft(s.end)} day${daysLeft(s.end)===1?'':'s'} left`:''}${s.goal?` · ${esc(s.goal.replace(/\s+/g,' ').slice(0,140))}`:''}</p></div><div class="hub-banner-stat"><b>${s.sayDo!=null?Math.round(s.sayDo)+'%':'—'}</b><small>say-do</small></div></section>`:`<section class="hub-banner muted"><div><span class="hub-eyebrow">Sprint</span><h2>${home?'No sprint found':'Loading sprint…'}</h2></div></section>`;
    const rot=`<section class="hub-rota" aria-label="On rotation now"><span>${icon('rotation','violet')}<b>PD on-call</b> ${pd?esc(pd.name):'<i>not set</i>'}</span><span>${icon('flag','amber')}<b>Trust Hero</b> ${th?esc(th.name):'<i>not set</i>'}</span><button class="text-button" data-go="rotations">Trust Champion ›</button></section>`;
    const tiles=NAV.filter(id=>id!=='home'&&H.pages.has(id)).map(id=>{const p=H.pages.get(id);return tile(p,p.stat?p.stat(home,{rota,pd,th}):null);}).join('');
    parkOverview();
    el.innerHTML=`<div class="hub-top"></div>${rot}<div class="hub-tiles">${tiles}</div><section id="hub-people" class="hub-people" hidden aria-label="Team"></section>`;
    const top=el.querySelector('.hub-top'),ov=$('overview-panel');if(top&&ov)top.prepend(ov);
    drawPeople(el);
  };
  draw(null,null);
  if(!H.hasTeam()){
    el.insertAdjacentHTML('beforeend','<p class="note hub-hint">Pick a team in the filter above to see its sprint, bugs, team dependencies and rotation.</p>');
    return;
  }
  Promise.all([call('hub-home',{teamId}),call('hub-rotation',{teamId}).then(r=>r.rota,()=>null)]).then(([home,rota])=>{if(H.current==='home'&&H.team.Id===teamId)draw(home,rota);})
    .catch(e=>{if(H.current==='home')el.insertAdjacentHTML('afterbegin',`<p class="note error">Could not load team summary: ${esc(e.message)}</p>`);});
}
H.register({id:'home',label:'Team Hub',icon:'home',tone:'violet',desc:'Team hub',render:renderHome});
H.register({id:'epics',label:'Release Review',icon:'scope',tone:'green',desc:'Release epics, health and monthly updates',legacy:'overview',stat:()=>({text:'Release review · health and monthly updates'})});
H.register({id:'status',label:'Status Report',icon:'ai',tone:'violet',desc:'V2MOM executive updates',legacy:'executive',stat:()=>({text:'V2MOM executive summary and leadership update'})});
function soon(id,label,ic,tone,desc){
  H.register({id,label,icon:ic,tone,desc,soon:true,render:el=>{el.innerHTML=`<section class="hub-soon-page">${icon(ic,tone)}<h2>${esc(label)}</h2><span class="hub-soon">Coming soon</span><p>${esc(desc)}. This page is on the roadmap and will plug into the same team filter and GUS-backed data.</p><button class="button primary" data-go="home">Back to overview</button></section>`;}});
}
soon('links','Quick Links','link','teal','Curated dashboards, runbooks and release resources');

// ── Boot ────────────────────────────────────────────────────────────────────
function route(){const id=(location.hash.match(/^#\/([a-z]+)/)||[])[1];H.go(id||'home',{silent:true});}
async function boot(){
  installCache();
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
  try{route();}finally{document.body.dataset.ready='1';}
  H.prefetch(H.team.Id);H.preloadPeople();
}
window.Hub=H;
document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));
})();
