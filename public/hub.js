/* Team hub core: shared team context, page registry/router, home tiles, GUS delta-save queue.
 * Pages call Hub.register({id,label,icon,tone,desc,render(el,hub),stat?(home,hub)}) and read Hub.team. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(n,t)=>window.ReviewIcons?window.ReviewIcons.icon(n,t):'';
const call=(a,d)=>window.api(a,d);
// The default team is the only user-level preference kept in this browser (localStorage); nothing else is stored locally.
const LS='cfs.hub.defaultTeam';
try{localStorage.removeItem('cfs.hub.team');}catch{/* private mode */} // retired: last-selected team was remembered implicitly
const ALL={Id:'all',Name:'All CFS teams',short:'All teams'};
const H={teams:[],team:ALL,pages:new Map(),current:null,esc,icon,call,GUS:'https://gus.lightning.force.com/lightning/r/'};
const listeners=new Set();

// ── Team context ────────────────────────────────────────────────────────────
const keyFor=t=>t.short==='MQ'?/message queue|\bmq\b/i:t.short==='MAPS'?/\bmaps\b|managed async/i:new RegExp(String(t.Name).split(/\s+/)[0].replace(/[^a-z0-9]/gi,''),'i');
H.teamMatches=name=>H.team.Id==='all'||!name||keyFor(H.team).test(String(name));
// localStorage first; when the browser blocks it (sandboxed frame) the same preference is kept per user in the backend
let memDefault=null,storageOk=true;
try{localStorage.setItem('cfs.probe','1');localStorage.removeItem('cfs.probe');}catch{storageOk=false;}
H.loadDefaultTeam=async()=>{
  if(storageOk){try{memDefault=localStorage.getItem(LS);}catch{storageOk=false;}}
  if(!memDefault){try{memDefault=(await call('pref-get',{})).defaultTeam||null;}catch{/* the backend copy is optional */}} // the saved copy survives a cleared or blocked browser storage
  return memDefault;
};
H.defaultTeam=()=>memDefault;
H.setDefaultTeam=id=>{
  memDefault=id&&id!==memDefault?id:null;
  if(storageOk){try{memDefault?localStorage.setItem(LS,memDefault):localStorage.removeItem(LS);}catch{storageOk=false;}}
  call('pref-set',{defaultTeam:memDefault}).catch(e=>window.toast?.('Could not save the default team: '+e.message,true));
};
H.hasTeam=()=>H.team.Id!=='all';
H.onTeam=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
/** The team in the URL (`#/plan?full&team=<Id>`, or `team=all`), so every page link is team-specific and shareable. */
H.hashTeam=()=>(location.hash.match(/[?&]team=([A-Za-z0-9]+)/)||[])[1]||null;
H.syncUrl=()=>{
  if(!H.teams||!H.teams.length)return;
  const m=location.hash.match(/^#\/([a-z]+)(?:\/[^?]*)?(?:\?(.*))?$/),id=m?m[1]:(H.current||'home');
  const path=m?location.hash.split('?')[0]:'#/'+id,q=((m&&m[2])||'').split('&').filter(x=>x&&!/^team=/.test(x));
  q.push('team='+encodeURIComponent(H.team.Id));
  const h=path+'?'+q.join('&');if(h!==location.hash)history.replaceState(null,'',h);
};
H.setTeam=id=>{
  H.team=H.teams.find(t=>t.Id===id)||ALL;
  H.syncUrl();
  $('hub-team').value=H.team.Id;H.syncSelects();setCrumb();
  window.dispatchEvent(new Event('hub:team'));
  for(const fn of listeners)fn(H.team);
  renderCurrent();
};
H.needTeam=el=>{
  if(H.hasTeam())return false;
  el.innerHTML=`<div class="empty-state hub-empty">${icon('users','blue')}<h3>Select a team</h3><p>This page shows GUS data for one scrum team. Pick a team in the filter above.</p></div>`;
  return true;
};
let membersCache=new Map();
H.members=async()=>{const id=H.team.Id;if(!membersCache.has(id))membersCache.set(id,call('hub-members',{teamId:id}).then(r=>r.members,e=>{membersCache.delete(id);throw e;}));return membersCache.get(id);};
let picks;H.picklists=()=>picks||(picks=call('hub-picklists',{}).catch(e=>{picks=null;throw e;}));

// ── Registry + router ───────────────────────────────────────────────────────
H.register=page=>{H.pages.set(page.id,page);};
const NAV=['home','sprints','tds','tests','rotations','bugs','hourglass','epics','plan','status'];
/** Breadcrumb follows the team dropdown and the active page: <Team> / <Page>. */
function setCrumb(){const c=document.querySelector('.page-heading .breadcrumb'),p=H.pages.get(H.current);if(!c||!p||!H.team)return;c.innerHTML=`${esc(H.team.short||H.team.Name)} <span aria-hidden="true">/</span> <strong>${esc(p.label)}</strong>`;const t=document.querySelector('#hub-nav .hub-tab-label');if(t)t.textContent=`${H.team.short||H.team.Name} - ${p.label}`;}
/** Team-scoped GUS destination for the active tab: the team's related list in GUS (Sprints, Epics, Team Dependencies, Work...). */
const TEAM_REL={home:'',sprints:'Sprints__r',tds:'Our_Dependencies__r',tests:'Work__r',rotations:'Scrum_Team_Members__r',bugs:'Work__r',hourglass:'Work__r',epics:'Epics__r',plan:'Planned_Releases__r',status:'Epics__r'};
const TEAM_LBL={home:'team',sprints:'Sprints',tds:'Team Dependencies',tests:'work items',rotations:'team members',bugs:'work items',hourglass:'work items',epics:'Epics',plan:'Planned Releases',status:'Epics'};
const HOURGLASS_URL='https://git.soma.salesforce.com/pages/core-foundational-services/hourglass/';
H.gusTabUrl=id=>{if(id==='hourglass')return HOURGLASS_URL;const t=H.team;if(t&&t.Id&&t.Id!=='all'&&/^[a-zA-Z0-9]{15,18}$/.test(t.Id)){const rel=TEAM_REL[id];return `${H.GUS}ADM_Scrum_Team__c/${t.Id}/${rel?'related/'+rel+'/view':'view'}`;}
  const l=(GUS_LINKS[id]||GUS_LINKS.home).find(x=>!/^New/.test(x[0]))||(GUS_LINKS.home)[2];return l?l[1]:GL+'ADM_Epic__c/list?filterName=Recent';};
const tabTip=id=>id==='hourglass'?'Open Hourglass':`Open ${TEAM_LBL[id]||'team'} for ${H.team?(H.team.short||H.team.Name):'the team'} in GUS`;
function renderNav(){setCrumb(); // only the active tab shows; the left rail switches pages
  $('hub-nav').innerHTML=NAV.filter(id=>H.pages.has(id)&&id===H.current) .map(id=>{const p=H.pages.get(id),on=id===H.current;
    return `<button data-page="${id}" class="${on?'selected':''}" aria-pressed="${on}" ${on?'aria-current="page"':''}>${icon(p.icon,p.tone)} <span class="hub-tab-label">${esc(H.team?(H.team.short||H.team.Name)+' - ':'')}${esc(p.label)}</span></button>${on?`<a class="hub-tab-gus" href="${H.gusTabUrl(id)}" target="_blank" rel="noopener noreferrer" title="${tabTip(id)}" aria-label="${tabTip(id)} (opens a new tab)"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7"/></svg></a>`:''}`;}).join('');
  document.querySelectorAll('.rail-button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===H.current));
}
function legacy(view){const b=document.querySelector(`[data-view="${view}"]`);if(b)b.click();}
function renderCurrent(){
  const p=H.pages.get(H.current);if(!p||p.legacy)return;
  parkOverview();const el=$('hub-page');el.innerHTML=''; // overview-panel is app.js-owned: never let a page re-render destroy it
  if(p.needsTeam&&H.needTeam(el))return;
  try{p.render(el,H);}catch(e){el.innerHTML=`<div class="empty-state hub-empty"><h3>Could not load ${esc(p.label)}</h3><p>${esc(e.message)}</p></div>`;}
}
/** "Open in GUS" shortcuts per page: create / list the records that page is about. */
const GL='https://gus.lightning.force.com/lightning/o/',gnew=o=>GL+o+'/new',glist=o=>GL+o+'/list?filterName=Recent';
const GUS_LINKS={
  home:[['New Epic',gnew('ADM_Epic__c'),1],['New work item',gnew('ADM_Work__c')],['Epics',glist('ADM_Epic__c')],['Work items',glist('ADM_Work__c')]],
  epics:[['New Epic',gnew('ADM_Epic__c'),1],['All epics',glist('ADM_Epic__c')],['New work item',gnew('ADM_Work__c')]],
  sprints:[['Sprints',glist('ADM_Sprint__c')],['Work items',glist('ADM_Work__c')],['New work item',gnew('ADM_Work__c'),1]],
  tds:[['New team dependency',gnew('ADM_Team_Dependency__c'),1],['All TDs',glist('ADM_Team_Dependency__c')]],
  plan:[['New Epic',gnew('ADM_Epic__c'),1],['Epics',glist('ADM_Epic__c')],['Projects',glist('PPM_Project__c')],['Programs',glist('PPM_Program__c')]],
  tests:[['New work item',gnew('ADM_Work__c'),1],['Work items',glist('ADM_Work__c')]],
  bugs:[['New bug',gnew('ADM_Work__c'),1],['Work items',glist('ADM_Work__c')]],
  status:[['Epics',glist('ADM_Epic__c')],['New Epic',gnew('ADM_Epic__c')]],
  rotations:[['Work items',glist('ADM_Work__c')]]
};
/** Keep the "Open in GUS" bar directly below the page heading (pages re-render their own markup). */
let gusEl=null; // keep a handle: the planner re-renders its markup and would otherwise orphan the bar
/** One team selector on every page: right end of the page bar, directly before "Back to Team Hub" when that is shown. */
function placeTeam(){
  const bar=$('dashboard-controls'),t=document.querySelector('label.hub-team');if(!bar||!t)return;
  const back=bar.querySelector('#pl-back');
  const tb=bar.querySelector('.release-toolbar'),rp=tb&&tb.querySelector('.release-picker');
  /* where the release controls are shown, Team is the first control, before RELEASE */
  if(rp&&tb.getClientRects().length){if(t.parentNode!==tb||t.nextElementSibling!==rp)tb.insertBefore(t,rp);return;}
  if(back){if(t.parentNode!==bar||t.nextElementSibling!==back)bar.insertBefore(t,back);}
  else if(t.parentNode!==bar||bar.lastElementChild!==t)bar.append(t);
}
function placeGus(){
  placeTeam();
  const el=gusEl||$('gus-links'),hp=$('hub-panel');if(!el||!hp)return;
  const vis=x=>!x.closest('.hidden')&&x.getClientRects().length,h=[...document.querySelectorAll('main .executive-heading')].find(vis);
  const sum=$('selected-release-summary');let row=$('ctl-row');
  /* the selected-release chips sit inline, right after the release picker's + button, instead of on a row of their own */
  {const nb=$('new-release');if(sum&&nb&&nb.parentNode&&sum.previousElementSibling!==nb)nb.after(sum);}
  /* Release Planning: the Open-in-GUS chips sit inline, directly before the planner's Full screen / Export template / Import controls */
  const pb=document.body.dataset.hub==='plan'?[...document.querySelectorAll('.pl-planner-btns')].find(vis):null;
  if(pb){if(el.parentNode!==pb||pb.firstElementChild!==el)pb.prepend(el);if(row&&!row.children.length)row.remove();return;}
  if(h){if(h.nextElementSibling!==el)h.after(el);if(row&&!row.children.length)row.remove();}
  else{/* one line: "Open in GUS" links on the left, selected release chips on the right */
    if(!row){row=document.createElement('div');row.id='ctl-row';}
    if(row.nextElementSibling!==hp)hp.before(row);
    if(el.parentNode!==row)row.prepend(el);
    }
}
let gusObs;function watchGus(){if(gusObs)return;const m=document.querySelector('main')||document.body;gusObs=new MutationObserver(placeGus);gusObs.observe(m,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});}
function renderGusLinks(id){
  let el=gusEl||$('gus-links');
  if(!el){el=document.createElement('nav');el.id='gus-links';el.className='gus-links';el.setAttribute('aria-label','Open in GUS');$('hub-panel').before(el);watchGus();}gusEl=el;
  el.hidden=id==='home';
  const l=GUS_LINKS[id]||GUS_LINKS.home;
  const ext='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7"/></svg>',item=([t,u])=>`<a class="gus-mi" role="menuitem" tabindex="-1" href="${u}" target="_blank" rel="noopener noreferrer">${t}${ext}</a>`;
  const mk=l.filter(x=>/^New /.test(x[0])),go=l.filter(x=>!/^New /.test(x[0]));
  el.innerHTML=`<div class="gus-menu"><button type="button" class="gus-link primary gus-mbtn" aria-haspopup="menu" aria-expanded="false" aria-controls="gus-menu-list">Open in GUS<svg class="gus-car" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg></button><div class="gus-mlist" id="gus-menu-list" role="menu" aria-label="Open in GUS" hidden>${mk.length?'<span class="gus-mh" role="presentation">Create</span>'+mk.map(item).join(''):''}${go.length?'<span class="gus-mh" role="presentation">Go to list</span>'+go.map(item).join(''):''}</div></div><button type="button" class="gus-link gus-v2" data-v2mom-open title="Import V2MOM measures from a sheet as GUS projects for this team">V2MOM Import</button>`;
}
H.go=(id,opts={})=>{
  if(id!=='home')parkOverview();
  const p=H.pages.get(id)||H.pages.get('home');id=p.id;
  H.current=id;document.body.dataset.hub=id;
  const own=!p.legacy;$('hub-panel').classList.toggle('hidden',!own);document.body.classList.toggle('hub-own',own);
  if(p.legacy)legacy(p.legacy);
  if(id!=='plan')document.querySelectorAll('#pl-back').forEach(x=>x.remove());
  renderNav();renderCurrent();renderGusLinks(id);placeGus();
  if(!opts.silent&&!new RegExp('^#/'+id+'(/|\\?|$)').test(location.hash))history.pushState(null,'','#/'+id);
  if(H.team)H.syncUrl();
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
H.prefetch=teamId=>{if(!teamId||teamId==='all')return;const go=()=>['hub-tds','hub-sla','hub-rotation','sprint-initial','sprint-history'].forEach(a=>call(a,{teamId}).catch(()=>{}));(window.requestIdleCallback?window.requestIdleCallback(go,{timeout:1}):setTimeout(go,1));};
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
  return `<button class="hub-tile${soon?' soon':''}" data-go="${p.id}"><span class="hub-tile-head">${icon(p.icon,p.tone)}<strong>${esc(p.label.replace(/\s*\((Monthly|Quarterly)\)/,""))}</strong>${soon?'<em class="hub-soon">Coming soon</em>':''}<svg class="hub-tile-go" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="hub-tile-stat${stat&&stat.big!=null?'':' nobig'}">${stat&&stat.big!=null?`<b>${esc(stat.big)}</b>`:''}<small>${esc((stat&&stat.text)||p.desc)}</small></span>${stat&&stat.chips?`<span class="hub-tile-chips">${stat.chips}</span>`:''}</button>`;
}
const groupKey=t=>t.key||null;
const GROUPS=()=>(H.groups&&H.groups.length?H.groups:['maps','mq','vegacache','vegastore','caching']);
const initials=n=>String(n).split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
let peopleData=null;
const peopleByGroup=new Map();/** every roster loaded so far, keyed by group: loading another team's roster must not hide this one */
const rosterOf=g=>{if(!peopleByGroup.has(g)){try{const c=JSON.parse(localStorage.getItem('hub-people2-'+g)||'null');if(c&&c.d)peopleByGroup.set(g,c.d);}catch(_){}}return peopleByGroup.get(g)||null;};
function drawPeople(el){
  const box=el.querySelector('#hub-people');if(!box)return;
  const g=groupKey(H.team);if(!g){box.hidden=true;return;}
  const paint=d=>{if(!box.isConnected||groupKey(H.team)!==g)return;
    box.hidden=!d||!d.people.length;if(box.hidden)return;
    box.innerHTML=`<h3>${esc(H.team!==ALL&&(H.team.short||H.team.Name)?(H.team.short||H.team.Name)+' Team':d.name)}</h3><ul>${d.people.map(p=>`<li><span class="hub-avatar" data-i="${esc(initials(p.name))}">${p.avatar?`<img src="${esc(p.avatar)}" alt="" decoding="async" ${p.alt&&p.alt!==p.avatar?`data-alt="${esc(p.alt)}"`:''} onerror="var a=this.dataset.alt;if(a){this.removeAttribute('data-alt');this.src=a;}else this.remove()">`:''}</span><b>${esc(p.name)}</b><small>${esc(p.role)}</small></li>`).join('')}</ul>`;};
  if(!peopleData||peopleData.g!==g){try{const c=JSON.parse(localStorage.getItem('hub-people2-'+g)||'null');if(c&&c.d)peopleData={g,d:c.d};}catch(_){}}
  if(peopleData&&peopleData.g===g)paint(peopleData.d);
  loadPeople(g).then(d=>paint(d),()=>{});
}
/** Fetch the team once per group, persist it, and pre-load every avatar image so the browser has it cached before it paints. */
const peopleLoads=new Map();
function loadPeople(g){
  if(!peopleLoads.has(g))peopleLoads.set(g,call('hub-people',{group:g}).then(d=>{
    peopleData={g,d};try{localStorage.setItem('hub-people2-'+g,JSON.stringify({d}));}catch(_){}peopleByGroup.set(g,d);setTimeout(()=>document.dispatchEvent(new Event('hub-people')),0);
    d.people.forEach(p=>{if(p.avatar){const i=new Image();i.src=p.avatar;}});return d;},e=>{peopleLoads.delete(g);throw e;}));
  return peopleLoads.get(g);
}
/** Avatar lookup for other pages (matched by GUS user id, then name); resolves once the team's people are loaded. */
H.personAvatar=(id,name)=>{const n=String(name||'').toLowerCase(),find=d=>d&&d.people.find(p=>(id&&p.id===id)||(n&&p.name.toLowerCase()===n));const g=groupKey(H.team);
  // This team's roster first, then any other roster already loaded (QA engineers and assignees can sit on another team).
  let hit=g&&find(rosterOf(g));if(hit)return hit;for(const k of GROUPS()){if(k!==g&&(hit=find(rosterOf(k))))return hit;}return null;};
/** Round avatar (photo when known, initials otherwise) for any page; falls back to the GUS photo, then to initials if an image fails. */
H.avatarHtml=(id,name,size)=>{const pr=H.personAvatar(id,name),ini=String(name||'?').split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
  if(!pr)H.peopleReady();return `<span class="hub-pa" data-i="${esc(ini)}" data-pid="${esc(id||'')}" data-pn="${esc(name||'')}"${size?` style="--s:${size}px"`:''}>${pr&&pr.avatar?`<img src="${esc(pr.avatar)}" alt="" decoding="async" ${pr.alt&&pr.alt!==pr.avatar?`data-alt="${esc(pr.alt)}"`:''} onerror="var a=this.dataset.alt;if(a){this.removeAttribute('data-alt');this.src=a;}else this.remove()">`:''}</span>`;};
/** When a roster arrives, add photos to avatars already on screen (no page re-render needed). */
document.addEventListener('hub-people',()=>{document.querySelectorAll('.hub-pa:not(:has(img))').forEach(el=>{const pr=H.personAvatar(el.dataset.pid||null,el.dataset.pn);if(pr&&pr.avatar){const i=new Image();i.alt='';i.decoding='async';i.src=pr.avatar;if(pr.alt&&pr.alt!==pr.avatar)i.dataset.alt=pr.alt;i.onerror=()=>{const a=i.dataset.alt;if(a){delete i.dataset.alt;i.src=a;}else i.remove();};el.appendChild(i);}});});
/** Resolves once this team's roster is loaded; retries a failed load twice so a transient error does not leave the page without avatars. */
H.peopleReady=async()=>{const g=groupKey(H.team);if(!g)return null;for(let i=0;i<3;i++){try{return await loadPeople(g);}catch(_){await new Promise(r=>setTimeout(r,1500*(i+1)));}}return null;};
/** Shared table column sizing. Every table gets a <colgroup>: short columns (status, priority, ids, numbers) take just the width their
 *  header and values need; long-text columns (subject, summary, notes) share the remaining width in proportion to their text length. */
const FIT_CH=7.8,FIT_PAD=26,FIT_SHORT=34,FIT_MIN_TEXT=150;
function cellLen(c){
  const sel=c.querySelector('select');
  if(sel){const o=sel.options[sel.selectedIndex];return (o?o.text.length:6)+4;}
  const inp=c.querySelector('input:not([type=checkbox]):not([type=radio])');
  if(inp&&!c.textContent.trim())return inp.type==='date'?17:Math.max(String(inp.value||'').length,4)+3;
  const t=c.textContent.replace(/\s+/g,' ').trim();
  return t.length+(c.querySelector('button')?5:0);
}
function fitTable(t){
  if(t.classList.contains('epic-expanded-table')||t.closest('.epic-expanded-table'))return; // sized by the review table itself (percent widths)
  if(t.id==='epic-table'){t.querySelectorAll(':scope>colgroup.fit-cols').forEach(g=>g.remove());t.classList.remove('fit');delete t.dataset.fit;return;} // the review table writes its own colgroup; a second one doubled the table width
  const host=t.parentElement;if(!host||!t.tHead||!t.tBodies.length)return;
  const avail=host.clientWidth;if(!avail)return;
  const hr=t.tHead.rows[t.tHead.rows.length-1];if(!hr)return;
  const n=hr.cells.length;if(!n||[...hr.cells].some(c=>c.colSpan>1))return;
  const rows=[...t.tBodies[0].rows].filter(r=>r.cells.length===n&&![...r.cells].some(c=>c.colSpan>1)).slice(0,80);
  const cols=[];
  for(let i=0;i<n;i++){
    const h=hr.cells[i].textContent.trim().length+(hr.cells[i].querySelector('.sort-ind,.arr,svg')?2:1);
    let max=0,sum=0;for(const r of rows){const l=cellLen(r.cells[i]);max=Math.max(max,l);sum+=l;}
    cols.push({h,max:Math.max(max,h),avg:rows.length?sum/rows.length:0});
  }
  const fixed=c=>c.max<=FIT_SHORT;
  if(t.id==='epic-table')cols[0]={h:1,max:1,avg:1,pin:28}; // the expand column is always the compact 28px, whatever its cells hold
  let used=0,wsum=0;
  for(const c of cols){if(c.pin){c.px=c.pin;used+=c.px;}else if(fixed(c)){c.px=Math.ceil(c.max*FIT_CH+FIT_PAD);used+=c.px;}else{c.w=Math.max(c.avg,c.h);wsum+=c.w;}}
  const flex=cols.filter(c=>!fixed(c)),room=Math.max(avail-used,FIT_MIN_TEXT*flex.length);
  for(const c of flex)c.px=Math.max(FIT_MIN_TEXT,Math.floor(room*c.w/wsum));
  const sig=cols.map(c=>c.px).join(',');
  // short columns never wrap; applied on every pass because rows are re-rendered without touching the colgroup
  for(const r of rows)cols.forEach((c,i)=>{r.cells[i].style.whiteSpace=fixed(c)?'nowrap':'';});
  if(t.dataset.fit===sig)return;
  t.dataset.fit=sig;
  let cg=t.querySelector(':scope>colgroup.fit-cols');
  if(!cg){cg=document.createElement('colgroup');cg.className='fit-cols';t.insertBefore(cg,t.firstChild);}
  cg.innerHTML=cols.map(c=>`<col style="width:${c.px}px">`).join('');
  t.classList.add('fit');t.style.minWidth=Math.min(used+FIT_MIN_TEXT*flex.length,avail*3)+'px';
}
/** Generic column sorting: every plain table (one header row, no sorting of its own) sorts by clicking a header. It reorders all DOM rows before the pager slices them, so sorting spans every page. */
const hsState=new WeakMap(),HS_EMPTY=/^(|—|-|–|n\/a|none|unassigned)$/i,HS_DATE=/^(\d{4}-\d{2}-\d{2}|\d{1,2} [A-Za-z]{3} \d{4}|\d{1,2}\/\d{1,2}\/\d{4})/;
const hsSkip=t=>t.classList.contains('nosort')||t.closest('.nd-overlay,.sal-lg')||[...t.tHead?t.tHead.rows[0].cells:[]].some(c=>(c.hasAttribute('aria-sort')&&!c.classList.contains('hs'))||c.querySelector('[data-sort],[data-pdsort],.sort,[aria-sort]')||c.dataset.sort||c.dataset.pdsort||c.dataset.hk);
const hsHead=t=>{if(!t.tHead||!t.tBodies.length||t.tHead.rows.length!==1||hsSkip(t))return null;const h=t.tHead.rows[0].cells,r=[...t.tBodies[0].rows].find(x=>!x.querySelector(':scope>td[colspan]'));return r&&r.cells.length===h.length&&![...h].some(c=>c.colSpan>1)?h:null;};
const hsText=c=>{const x=c.querySelector('select');if(x)return (x.selectedOptions[0]||{}).text||'';const i=c.querySelector('input:not([type=checkbox]):not([type=hidden])');if(i)return i.value||'';return (c.dataset.sortv!=null?c.dataset.sortv:c.textContent).replace(/\s+/g,' ').trim();};
const hsVal=txt=>{if(HS_EMPTY.test(txt))return null;if(HS_DATE.test(txt)){const d=Date.parse(/^\d{1,2}\/\d{1,2}\/\d{4}/.test(txt)?txt.split('/').reverse().join('-'):txt);if(!isNaN(d))return d;}const n=txt.replace(/[,%$]/g,'').match(/^-?\d+(\.\d+)?(\s*[a-zA-Z]{0,3})?$/);return n?parseFloat(txt.replace(/,/g,'')):txt.toLowerCase();};
function hsMark(t,h,st){[...h].forEach((c,i)=>{const on=st&&st.col===i;c.classList.toggle('hs-on',!!on);if(on)c.setAttribute('aria-sort',st.dir==='asc'?'ascending':'descending');else c.removeAttribute('aria-sort');});}
function sortTable(t){
  const h=hsHead(t);if(!h)return;
  if(!t.dataset.hs){t.dataset.hs='1';[...h].forEach(c=>{if(c.textContent.trim()){c.classList.add('hs');c.tabIndex=0;c.setAttribute('role','columnheader');c.title=c.title||'Click to sort';}});}
  const st=hsState.get(t);hsMark(t,h,st);if(!st)return;
  const body=t.tBodies[0],groups=[];
  for(const r of body.rows){if(r.querySelector(':scope>td[colspan]')&&groups.length)groups[groups.length-1].push(r);else groups.push([r]);}
  if(groups.length<2||groups.every(g=>g[0].querySelector(':scope>td[colspan]')))return;
  const keyed=groups.map((g,i)=>({g,i,v:hsVal(hsText(g[0].cells[st.col]||{textContent:'',querySelector:()=>null,dataset:{}}))}));
  keyed.sort((a,b)=>{const x=a.v,y=b.v;if(x==null||y==null)return x==null&&y==null?a.i-b.i:x==null?1:-1;const c=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true});return (st.dir==='asc'?c:-c)||a.i-b.i;});
  if(keyed.every((k,i)=>k.i===i))return;
  const frag=document.createDocumentFragment();keyed.forEach(k=>k.g.forEach(r=>frag.appendChild(r)));body.appendChild(frag);
}
H.sortTable=sortTable;
/** Generic pager: any table with more than 25 rows (and no pager of its own) shows 25 at a time. Re-applied whenever its rows are re-rendered. */
const DP=25,dpState=new WeakMap();
const dpSkip=t=>t.closest('#bug-queue,.tf-section,#table-card,.sp-modal,.nd-overlay')||t.classList.contains('nopage');
function pageTable(t){
  if(!t.tBodies.length||dpSkip(t))return;
  const host=t.closest('.table-scroll')||t,rows=[...t.tBodies[0].rows].filter(r=>!r.hidden&&!r.querySelector(':scope>td[colspan]'));
  let bar=host.nextElementSibling;if(bar&&!bar.classList.contains('dom-pager'))bar=null;
  if(rows.length<=DP){rows.forEach(r=>r.classList.remove('dp-hide'));if(bar)bar.remove();return;}
  let st=dpState.get(t);if(!st||st.count!==rows.length){st={pg:1,count:rows.length};dpState.set(t,st);}
  const pages=Math.ceil(rows.length/DP);st.pg=Math.min(Math.max(st.pg,1),pages);
  rows.forEach((r,i)=>r.classList.toggle('dp-hide',i<(st.pg-1)*DP||i>=st.pg*DP));
  if(!bar){bar=document.createElement('div');bar.className='tf-pager dom-pager';bar.setAttribute('role','navigation');bar.setAttribute('aria-label','Table pages');host.after(bar);}
  bar._table=t;
  bar.innerHTML=`<span>${(st.pg-1)*DP+1}–${Math.min(rows.length,st.pg*DP)} of ${rows.length}</span><button type="button" class="button small" data-dp="-1" ${st.pg<=1?'disabled':''}>‹ Prev</button><b>Page ${st.pg} / ${pages}</b><button type="button" class="button small" data-dp="1" ${st.pg>=pages?'disabled':''}>Next ›</button>`;
}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-dp]');if(!b||b.disabled)return;const bar=b.closest('.dom-pager'),t=bar&&bar._table;if(!t)return;const st=dpState.get(t);st.pg+=+b.dataset.dp;pageTable(t);(t.closest('.table-scroll')||t).scrollIntoView({block:'nearest'});});
H.fitTable=fitTable;
(function(){
  const pending=new Set();let raf=0;
  const run=()=>{raf=0;for(const t of pending)for(const f of [fitTable,sortTable,pageTable])try{f(t);}catch(_){}pending.clear();};
  const queue=t=>{if(t&&!t.classList.contains('nofit')){pending.add(t);if(!raf)raf=requestAnimationFrame(run);}};
  new MutationObserver(ms=>{for(const m of ms){
    if(m.target.nodeName==='COLGROUP'||m.target.nodeName==='COL')continue;
    const own=m.target.closest&&m.target.closest('table');if(own)queue(own);
    for(const n of m.addedNodes){if(n.nodeType!==1||n.nodeName==='COLGROUP')continue;if(n.nodeName==='TABLE')queue(n);else if(n.querySelectorAll)n.querySelectorAll('table').forEach(queue);}
  }}).observe(document.body,{childList:true,subtree:true});
  const hsToggle=e=>{
    if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;
    const th=e.target.closest&&e.target.closest('th.hs');if(!th||e.target.closest('input,select,textarea,a,button'))return;
    const t=th.closest('table'),i=th.cellIndex,cur=hsState.get(t);if(!t)return;e.preventDefault();
    hsState.set(t,{col:i,dir:cur&&cur.col===i&&cur.dir==='asc'?'desc':'asc'});
    const ds=dpState.get(t);if(ds)ds.pg=1;queue(t);
  };
  document.addEventListener('click',hsToggle);document.addEventListener('keydown',hsToggle);
  let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>document.querySelectorAll('table').forEach(t=>{delete t.dataset.fit;queue(t);}),150);});
  document.querySelectorAll('table').forEach(queue);
})();
/** CFS leaders always sit at the end of any people list, in this order (no visual marking). Non-leaders keep their incoming order. */
const LEADER_NAMES=['Azeem Mohammad','Jayant Kumar','Ram Mantripragada','Venkat Venkatnarayan','Pramit Bhuyan','Karthik Sethuraman','Bhanu Kasiraju','Amit Kumar'];
H.leaderRank=name=>LEADER_NAMES.indexOf(String(name||'').trim());
H.sortPeople=(list,nameOf=x=>x.name)=>[...list.filter(x=>H.leaderRank(nameOf(x))<0),...list.filter(x=>H.leaderRank(nameOf(x))>=0).sort((a,b)=>H.leaderRank(nameOf(a))-H.leaderRank(nameOf(b)))];
/** Custom dropdown that replaces a native <select>'s OS popup so the menu matches the app (chips, radius, brand colours). The select stays in the DOM as the source of truth. */
// one outside-click listener for every custom select (the planner re-creates its selects on each redraw)
const csOpen=new Set();
document.addEventListener('mousedown',e=>{for(const c of csOpen){if(!c.w.isConnected)csOpen.delete(c);else if(!c.w.contains(e.target))c.close();}});
H.customSelect=sel=>{
  if(sel._cs){sel._cs.sync();return;}
  const w=document.createElement('div'),btn=document.createElement('button'),menu=document.createElement('ul');
  w.className='cs';btn.type='button';btn.className='cs-btn';btn.setAttribute('aria-haspopup','listbox');btn.setAttribute('aria-expanded','false');
  menu.className='cs-menu';menu.setAttribute('role','listbox');menu.tabIndex=-1;
  sel.classList.add('cs-native');sel.tabIndex=-1;sel.setAttribute('aria-hidden','true');sel.after(w);w.append(btn,menu);
  let act=-1;
  const opts=()=>[...sel.options];
  const sync=()=>{
    const o=sel.options[sel.selectedIndex];btn.title=o&&o.dataset.short?o.text:'';btn.innerHTML=`<span>${esc(o?(o.dataset.short||o.text):'')}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg>`;
    menu.innerHTML=opts().map((x,i)=>`<li role="option" data-i="${i}" aria-selected="${i===sel.selectedIndex}" class="${i===sel.selectedIndex?'on':''}"><i aria-hidden="true">${i===sel.selectedIndex?'✓':''}</i><span class="cs-t">${esc(x.text)}</span>${sel.dataset.pref?`<span class="cs-star${x.value===H.defaultTeam()?' on':''}" role="button" data-star="${i}" title="${x.value===H.defaultTeam()?'Default team (click to clear)':'Set as default team'}" aria-label="${x.value===H.defaultTeam()?'Clear default team':'Set '+esc(x.text)+' as default team'}">${x.value===H.defaultTeam()?'★':'☆'}</span>`:''}</li>`).join('');
  };
  const mark=i=>{act=i;[...menu.children].forEach((li,k)=>li.classList.toggle('act',k===i));menu.children[i]?.scrollIntoView({block:'nearest'});};
  const open=()=>{w.classList.add('open');btn.setAttribute('aria-expanded','true');mark(sel.selectedIndex);};
  const close=()=>{w.classList.remove('open');btn.setAttribute('aria-expanded','false');};
  const pick=i=>{if(i<0||!sel.options[i])return;if(sel.selectedIndex!==i){sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));}sync();close();btn.focus();};
  btn.onclick=()=>w.classList.contains('open')?close():open();
  menu.onclick=e=>{const st=e.target.closest('[data-star]');if(st){e.stopPropagation();const o=sel.options[+st.dataset.star];H.setDefaultTeam(o.value);sync();window.toast?.(H.defaultTeam()===o.value?`${o.text} is now your default team`:'Default team cleared');return;}const li=e.target.closest('li');if(li)pick(+li.dataset.i);};
  menu.onmousemove=e=>{const li=e.target.closest('li');if(li&&+li.dataset.i!==act)mark(+li.dataset.i);};
  btn.onkeydown=e=>{
    const n=opts().length,isOpen=w.classList.contains('open');
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(!isOpen)return open();mark(Math.min(Math.max((act<0?sel.selectedIndex:act)+(e.key==='ArrowDown'?1:-1),0),n-1));}
    else if(e.key==='Home'&&isOpen){e.preventDefault();mark(0);}else if(e.key==='End'&&isOpen){e.preventDefault();mark(n-1);}
    else if((e.key==='Enter'||e.key===' ')&&isOpen){e.preventDefault();pick(act);}
    else if((e.key==='d'||e.key==='D')&&isOpen&&sel.dataset.pref&&act>=0){const o=sel.options[act];H.setDefaultTeam(o.value);sync();mark(act);}
    else if(e.key==='Tab')close();
  };
  // A wrapping <label for> would re-click the hidden native select after every pick and pop the OS menu open again
  const lab=sel.closest('label');if(lab)lab.addEventListener('click',e=>{e.preventDefault();if(!w.contains(e.target))btn.focus();});
  csOpen.add({w,close});
  sel._cs={sync,close};sync();
};
H.syncSelects=()=>document.querySelectorAll('select.cs-native').forEach(s=>s._cs&&s._cs.sync());
/** Status colours: every status dropdown (work item or TD, any page) gets an st-* class from its selected value; styles live in sprint.css. */
H.stCls=st=>{const x=String(st||'').toLowerCase();
  return /never|duplicate|reject|will not|inactive|not accepted|cancel|declin/.test(x)?'st-off':/^closed|fixed|complete|deliver|accepted|done|resolved/.test(x)?'st-done':/review|qa|verif|test|pending/.test(x)?'st-review':/progress|investigat|commit|triag/.test(x)?'st-prog':/block|wait|hold|risk/.test(x)?'st-block':'st-new';};
function paintStatus(sel){
  if(!/Status__c$/.test(sel.dataset.field||''))return;
  if(!sel._optPainted){sel._optPainted=1;[...sel.options].forEach(o=>o.classList.add(H.stCls(o.text)));}
  const o=sel.options[sel.selectedIndex],c=H.stCls(o?o.text:sel.value);
  if(!sel.classList.contains(c)){sel.classList.remove('st-done','st-prog','st-review','st-block','st-off','st-new');sel.classList.add(c);}
}
H.paintStatus=root=>(root||document).querySelectorAll('select[data-field$="Status__c"]').forEach(paintStatus);
document.addEventListener('change',e=>{if(e.target.matches&&e.target.matches('select[data-field$="Status__c"]'))paintStatus(e.target);},true);
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.matches&&n.matches('select[data-field$="Status__c"]'))paintStatus(n);else if(n.querySelectorAll)n.querySelectorAll('select[data-field$="Status__c"]').forEach(paintStatus);}}).observe(document.body,{childList:true,subtree:true});
H.paintStatus();
/** Focus mode: hides the rail, header, team picker, page tabs and footer (and asks the browser for real full screen) so one page fills the window. */
function setFocus(on){
  document.body.classList.toggle('focus-mode',on);
  const b=document.getElementById('focus-toggle');if(b){b.setAttribute('aria-pressed',String(on));b.querySelector('span').textContent=on?'Exit full screen':'Full screen';b.title=on?'Exit full screen (Esc)':'Focus on this page — hide everything else';}
  try{if(on&&!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(_){}
}
H.focus=()=>document.body.classList.contains('focus-mode');
H.setFocus=setFocus;
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&H.focus())setFocus(false);});

/** Escape clears the innermost active filter/selection of the current page, one level per press (Release Review keeps its own Escape handling). */
const escHandlers=new Map();
H.onEsc=(id,fn)=>escHandlers.set(id,fn);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.repeat||e.defaultPrevented)return;
  if(document.querySelector('.hub-confirm-ov')||(e.target.closest&&e.target.closest('.gus-menu')))return; // the confirm dialog / GUS menu handle their own Escape
  const om=document.querySelector('.cs.open');if(om){om.classList.remove('open');om.querySelector('.cs-btn').setAttribute('aria-expanded','false');e.preventDefault();e.stopImmediatePropagation();return;}
  const id=document.body.dataset.hub;if(!id||id==='epics'||document.querySelector('.nd-overlay'))return;
  if(!(escHandlers.get(id)&&escHandlers.get(id)())){
    if(H.focus()){setFocus(false);e.preventDefault();e.stopImmediatePropagation();return;} // generic fallback: empty free-text filters on the page
    const box=document.getElementById('hub-page')||document;
    for(const i of box.querySelectorAll('input[type=text],input[type=search],input:not([type])')){if(i.value&&!i.dataset.edit&&!i.dataset.rk&&!i.dataset.f&&!i.closest('[data-edit],.hub-inline,.pl-sgp')){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));break;}}
  }
  e.preventDefault();e.stopImmediatePropagation(); // also stops the Release Review double-Escape refresh from firing on other tabs
},true);
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
    el.innerHTML=`<section id="hub-people" class="hub-people" hidden aria-label="Team"></section>${rot}<div class="hub-tiles">${tiles}</div>`;
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
H.register({id:'epics',label:'Release Review (Monthly)',icon:'scope',tone:'green',desc:'Release epics, health and monthly updates',legacy:'overview',stat:()=>({text:'Release review · health and updates'})});
H.register({id:'status',label:'V2MOM Updates',icon:'ai',tone:'violet',desc:'V2MOM executive updates',legacy:'executive',stat:()=>({text:'V2MOM executive summary and leadership update'})});
function soon(id,label,ic,tone,desc){
  H.register({id,label,icon:ic,tone,desc,soon:true,render:el=>{el.innerHTML=`<section class="hub-soon-page">${icon(ic,tone)}<h2>${esc(label)}</h2><span class="hub-soon">Coming soon</span><p>${esc(desc)}. This page is on the roadmap and will plug into the same team filter and GUS-backed data.</p><button class="button primary" data-go="home">Back to overview</button></section>`;}});
}

// ── Boot ────────────────────────────────────────────────────────────────────
function route(){const id=(location.hash.match(/^#\/([a-z]+)/)||[])[1],t=H.hashTeam();let sw=false;if(t&&H.team&&t!==H.team.Id&&(t==='all'||H.teams.some(x=>x.Id===t))){H.team=H.teams.find(x=>x.Id===t)||ALL;$('hub-team').value=H.team.Id;H.syncSelects();sw=true;}H.go(id||'home',{silent:true});if(sw){window.dispatchEvent(new Event('hub:team'));for(const fn of listeners)fn(H.team);}}
/** Keep the loading screen up until the first page has stopped changing, so sections do not appear and then jump. */
const LOAD_T0=performance.now(),MIN_LOAD_MS=0;
function settle(){
  const b=document.body,done=()=>{obs.disconnect();clearTimeout(quiet);clearTimeout(cap);
    // No artificial wait: the loading screen goes away as soon as the page has settled.
    b.dataset.settled='1';};
  let quiet;const arm=()=>{clearTimeout(quiet);quiet=setTimeout(()=>{if(document.querySelector('#hub-page .hub-loading,#hub-page .executive-spinner,#hub-page [aria-busy=true]'))arm();else done();},250);};
  const obs=new MutationObserver(arm),cap=setTimeout(done,8000);
  obs.observe($('hub-page'),{childList:true,subtree:true,characterData:true});arm();
}
/** Loading screen: a dashboard assembling above a marquee of every team member from all teams. Cached rosters paint at once; the rest fill in as they load. */
function loadOrbit(){
  const host=document.querySelector('#hub-boot .ri-track');if(!host)return;const seen=new Map(),N=28;
  // Fixed slots in two identical halves (seamless marquee). People fill placeholder slots in place, so the strip never re-renders or restarts.
  const pre=host.dataset.pre==='1',slot='<span class="ri-av ri-ph"><b></b></span>';if(!pre)host.innerHTML=slot.repeat(N*2);
  const fill=(i,p)=>{if(pre)return;[host.children[i],host.children[i+N]].forEach(el=>{if(!el)return;
    el.className='ri-av';el.innerHTML=`<b><i>${esc(initials(p.name))}</i></b>`;
    if(p.avatar){const im=new Image();im.decoding='async';im.alt='';im.onload=()=>{const b=el.firstChild;if(b){im.className='ri-img';b.appendChild(im);requestAnimationFrame(()=>im.classList.add('in'));}};im.src=p.avatar;}});};
  let used=0;
  const add=d=>{if(!d||!d.people)return;d.people.forEach(p=>{if(p.name&&H.leaderRank(p.name)<0&&!seen.has(p.name)){seen.set(p.name,p);if(used<N)fill(used++,p);}});};
  const groups=GROUPS();
  // remember the strip so the next load can paint it (with its images already fetching) before any script runs
  const save=()=>{const l=[...seen.values()].filter(p=>p.avatar).slice(0,N).map(p=>({n:p.name,a:p.avatar}));if(l.length)try{localStorage.setItem('hub-boot-strip',JSON.stringify(l));}catch(_){}};
  groups.forEach(g=>{try{const c=JSON.parse(localStorage.getItem('hub-people2-'+g)||'null');if(c&&c.d)add(c.d);}catch(_){}});save();
  // Few people known yet (first visit): repeat them over the remaining slots so the strip is never mostly empty.
  const cycle=()=>{const l=[...seen.values()];if(!l.length)return;for(let i=used;i<N;i++)fill(i,l[i%l.length]);};
  Promise.allSettled(groups.map(g=>loadPeople(g).then(add,()=>{}))).then(()=>{if(used<N)cycle();save();});
  const msgs=['Planning: reading projects and epics…','Executing: syncing sprints and builds…','Reviewing: checking release health…','Iterating: lining up every team…'],dims=document.querySelectorAll('#hub-boot .ri-dims span');let k=0;
  const show=()=>{const m=document.getElementById('ri-msg');if(m)m.textContent=msgs[k%msgs.length];dims.forEach(d=>d.classList.toggle('on',+d.dataset.d===k%msgs.length));};show();
  const t=setInterval(()=>{if(!document.getElementById('ri-msg')||document.body.dataset.settled){clearInterval(t);return;}k++;show();},1000);
}
async function boot(){
  installCache();loadOrbit();
  document.addEventListener('click',e=>{const g=e.target.closest('[data-go],[data-page]');if(g){e.preventDefault();const id=g.dataset.go||g.dataset.page;
    // Release Planning is a workspace of its own: open it full screen in a new browser tab (it renders in place once there)
    if(id==='plan'&&H.current!=='plan'&&!H.standalone){if(!window.open(location.href.split('#')[0]+'#/plan?full&team='+encodeURIComponent(H.team.Id),'_blank'))H.go(id);return;}
    H.go(id);}});
  window.addEventListener('popstate',route);
  $('hub-team').addEventListener('change',e=>H.setTeam(e.target.value));
  try{
    const r=await call('hub-teams',{});H.teams=r.teams;H.groups=r.groups||null;
    $('hub-team').innerHTML=[ALL,...H.teams].map(t=>`<option value="${esc(t.Id)}">${esc(t.short||t.Name)}</option>`).join('');
    let saved=null;try{const dflt=await H.loadDefaultTeam();const ht=H.hashTeam();saved=ht&&(ht==='all'||H.teams.some(x=>x.Id===ht))?ht:dflt;}catch{/* ignore */}
    H.team=saved==='all'?ALL:H.teams.find(t=>t.Id===saved)||H.teams.find(t=>t.Id===r.primaryTeamId)||H.teams[0]||ALL;
    $('hub-team').value=H.team.Id;$('hub-team').dataset.pref='1';H.customSelect($('hub-team'));
  }catch(e){window.toast?.('Team list unavailable: '+e.message,true);}
  window.dispatchEvent(new Event('hub:team'));
  H.standalone=/^#\/plan\?full/.test(location.hash);
  try{route();}finally{document.body.dataset.ready='1';}
  settle();
  if(H.standalone)setFocus(true);
  H.prefetch(H.team.Id);H.preloadPeople();
}
/** Re-read the team list (after a team is added, changed or removed in the Teams dialog) and optionally switch to a team. */
H.refreshTeams=async selectId=>{H.bust();const r=await call('hub-teams',{});H.teams=r.teams;H.groups=r.groups||null;$('hub-team').innerHTML=[ALL,...H.teams].map(t=>`<option value="${esc(t.Id)}">${esc(t.short||t.Name)}</option>`).join('');H.syncSelects();if(selectId&&(selectId==='all'||H.teams.some(t=>t.Id===selectId)))H.setTeam(selectId);else if(H.team.Id!=='all'&&!H.teams.some(t=>t.Id===H.team.Id))H.setTeam('all');else $('hub-team').value=H.team.Id;H.syncSelects();};
/** Where body-level popups (dialogs, tooltips, pickers) must attach: in native full screen only the fullscreen element's subtree is drawn. */
H.popHost=()=>{const f=document.fullscreenElement;return f&&f!==document.documentElement?f:document.body;};
window.Hub=H;
document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));
})();

// Clicking the product title returns to the Team Hub for the team that is currently selected.
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('#ri-home');if(!a)return;e.preventDefault();window.Hub.go('home');});

/** In-app confirmation dialog (replaces the browser's native confirm): H.confirm({title,message,ok,cancel,danger}) → Promise<boolean>. Esc / backdrop / Cancel resolve false. */
window.Hub.confirm=o=>new Promise(res=>{
  o=typeof o==='string'?{message:o}:(o||{});
  const prev=document.activeElement,esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ov=document.createElement('div');ov.className='hub-confirm-ov';
  ov.innerHTML=`<div class="hub-confirm" role="alertdialog" aria-modal="true" aria-labelledby="hc-t" aria-describedby="hc-m"><h2 id="hc-t">${esc(o.title||'Please confirm')}</h2><div id="hc-m" class="hub-confirm-m">${String(o.message||'').split(/\n\n+/).map(p=>`<p>${esc(p)}</p>`).join('')}</div><div class="hub-confirm-b"><button type="button" class="button" data-hc="0">${esc(o.cancel||'Cancel')}</button><button type="button" class="button primary${o.danger?' danger':''}" data-hc="1">${esc(o.ok||'Confirm')}</button></div></div>`;
  const done=v=>{document.removeEventListener('keydown',key,true);ov.remove();try{prev&&prev.focus&&prev.focus();}catch(_){}res(v);};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();done(false);}else if(e.key==='Tab'){const b=[...ov.querySelectorAll('button')],i=b.indexOf(document.activeElement);e.preventDefault();b[(i+(e.shiftKey?-1:1)+b.length)%b.length].focus();}};
  ov.addEventListener('click',e=>{const b=e.target.closest('[data-hc]');if(b)done(b.dataset.hc==='1');else if(e.target===ov)done(false);});
  document.addEventListener('keydown',key,true);window.Hub.popHost().appendChild(ov);ov.querySelector('[data-hc="1"]').focus();
});

/* Open in GUS menu: toggle, close on outside click / Escape, arrow-key navigation */
(function(){
  const close=(m,focus)=>{const b=m.querySelector('.gus-mbtn'),l=m.querySelector('.gus-mlist');l.hidden=true;b.setAttribute('aria-expanded','false');if(focus)b.focus();};
  const open=m=>{const l=m.querySelector('.gus-mlist');l.hidden=false;m.querySelector('.gus-mbtn').setAttribute('aria-expanded','true');const f=l.querySelector('.gus-mi');if(f)f.focus();};
  document.addEventListener('click',e=>{const m=e.target.closest&&e.target.closest('.gus-menu');
    document.querySelectorAll('.gus-menu').forEach(x=>{if(x!==m)close(x);});
    if(m&&e.target.closest('.gus-mbtn')){const l=m.querySelector('.gus-mlist');l.hidden?open(m):close(m);}
    else if(m&&e.target.closest('.gus-mi'))close(m);});
  document.addEventListener('keydown',e=>{const m=e.target.closest&&e.target.closest('.gus-menu');if(!m)return;
    if(e.key==='Escape'){close(m,true);return;}
    const items=[...m.querySelectorAll('.gus-mi')],i=items.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(m.querySelector('.gus-mlist').hidden){open(m);return;}if(items.length)items[i<0?(e.key==='ArrowDown'?0:items.length-1):(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length].focus();}
    else if(e.key==='Tab')close(m);});
})();
