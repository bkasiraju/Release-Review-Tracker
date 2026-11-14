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
  el.innerHTML=`<div class="empty-state hub-empty">${icon('users','blue')}<h3>Select a team</h3><p>This page shows GUS data for one scrum team. Pick a team (MAPS, MQ, VegaCache, VegaStore or Caching Services) in the filter above.</p></div>`;
  return true;
};
let membersCache=new Map();
H.members=async()=>{const id=H.team.Id;if(!membersCache.has(id))membersCache.set(id,call('hub-members',{teamId:id}).then(r=>r.members,e=>{membersCache.delete(id);throw e;}));return membersCache.get(id);};
let picks;H.picklists=()=>picks||(picks=call('hub-picklists',{}).catch(e=>{picks=null;throw e;}));

// ── Registry + router ───────────────────────────────────────────────────────
H.register=page=>{H.pages.set(page.id,page);};
const NAV=['home','epics','sprints','tds','tests','rotations','bugs','status','links'];
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
/** "Open in GUS" shortcuts per page: create / list the records that page is about. */
const GL='https://gus.lightning.force.com/lightning/o/',gnew=o=>GL+o+'/new',glist=o=>GL+o+'/list?filterName=Recent';
const GUS_LINKS={
  home:[['New Epic',gnew('ADM_Epic__c'),1],['New work item',gnew('ADM_Work__c')],['Epics',glist('ADM_Epic__c')],['Work items',glist('ADM_Work__c')]],
  epics:[['New Epic',gnew('ADM_Epic__c'),1],['All epics',glist('ADM_Epic__c')],['New work item',gnew('ADM_Work__c')]],
  sprints:[['New work item',gnew('ADM_Work__c'),1],['Sprints',glist('ADM_Sprint__c')],['Work items',glist('ADM_Work__c')]],
  tds:[['New team dependency',gnew('ADM_Team_Dependency__c'),1],['All TDs',glist('ADM_Team_Dependency__c')]],
  tests:[['New work item',gnew('ADM_Work__c'),1],['Work items',glist('ADM_Work__c')]],
  bugs:[['New bug',gnew('ADM_Work__c'),1],['Work items',glist('ADM_Work__c')]],
  status:[['Epics',glist('ADM_Epic__c')],['New Epic',gnew('ADM_Epic__c')]],
  rotations:[['Work items',glist('ADM_Work__c')]],
  links:[['New work item',gnew('ADM_Work__c'),1],['Epics',glist('ADM_Epic__c')],['TDs',glist('ADM_Team_Dependency__c')]]
};
function renderGusLinks(id){
  let el=$('gus-links');
  if(!el){el=document.createElement('nav');el.id='gus-links';el.className='gus-links';el.setAttribute('aria-label','Open in GUS');$('hub-panel').before(el);}
  const l=GUS_LINKS[id]||GUS_LINKS.home;
  el.innerHTML='<span class="gus-links-label">Open in GUS</span>'+l.map(([t,u,primary])=>`<a class="gus-link${primary?' primary':''}" href="${u}" target="_blank" rel="noopener noreferrer">${t}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 4h5v5M16 4l-7 7"/></svg></a>`).join('');
}
H.go=(id,opts={})=>{
  if(id!=='home')parkOverview();
  const p=H.pages.get(id)||H.pages.get('home');id=p.id;
  H.current=id;document.body.dataset.hub=id;
  const own=!p.legacy;$('hub-panel').classList.toggle('hidden',!own);
  if(p.legacy)legacy(p.legacy);
  renderNav();renderCurrent();renderGusLinks(id);
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
const groupKey=t=>t.short==='MAPS'?'maps':t.short==='MQ'?'mq':/vegastore/i.test(t.Name)?'vegastore':/caching services/i.test(t.Name)?'caching':/vega/i.test(t.Name)?'vegacache':null;
const initials=n=>String(n).split(/\s+/).filter(Boolean).map(w=>w[0]).slice(0,2).join('').toUpperCase();
let peopleData=null;
function drawPeople(el){
  const box=el.querySelector('#hub-people');if(!box)return;
  const g=groupKey(H.team);if(!g){box.hidden=true;return;}
  const paint=d=>{if(!box.isConnected||groupKey(H.team)!==g)return;
    box.hidden=!d||!d.people.length;if(box.hidden)return;
    box.innerHTML=`<h3>${esc(d.name)}</h3><ul>${d.people.map(p=>`<li><span class="hub-avatar" data-i="${esc(initials(p.name))}">${p.avatar?`<img src="${esc(p.avatar)}" alt="" decoding="async" ${p.alt&&p.alt!==p.avatar?`data-alt="${esc(p.alt)}"`:''} onerror="var a=this.dataset.alt;if(a){this.removeAttribute('data-alt');this.src=a;}else this.remove()">`:''}</span><b>${esc(p.name)}</b><small>${esc(p.role)}</small></li>`).join('')}</ul>`;};
  if(!peopleData||peopleData.g!==g){try{const c=JSON.parse(localStorage.getItem('hub-people-'+g)||'null');if(c&&c.d)peopleData={g,d:c.d};}catch(_){}}
  if(peopleData&&peopleData.g===g)paint(peopleData.d);
  loadPeople(g).then(d=>paint(d),()=>{});
}
/** Fetch the team once per group, persist it, and pre-load every avatar image so the browser has it cached before it paints. */
const peopleLoads=new Map();
function loadPeople(g){
  if(!peopleLoads.has(g))peopleLoads.set(g,call('hub-people',{group:g}).then(d=>{
    peopleData={g,d};try{localStorage.setItem('hub-people-'+g,JSON.stringify({d}));}catch(_){}
    d.people.forEach(p=>{if(p.avatar){const i=new Image();i.src=p.avatar;}if(p.alt){const j=new Image();j.src=p.alt;}});return d;},e=>{peopleLoads.delete(g);throw e;}));
  return peopleLoads.get(g);
}
/** Avatar lookup for other pages (matched by GUS user id, then name); resolves once the team's people are loaded. */
H.personAvatar=(id,name)=>{const g=groupKey(H.team);if(!g||!peopleData||peopleData.g!==g)return null;const n=String(name||'').toLowerCase();return peopleData.d.people.find(p=>(id&&p.id===id)||(n&&p.name.toLowerCase()===n))||null;};
H.peopleReady=()=>{const g=groupKey(H.team);return g?loadPeople(g).catch(()=>null):Promise.resolve(null);};
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
  let used=0,wsum=0;
  for(const c of cols){if(fixed(c)){c.px=Math.ceil(c.max*FIT_CH+FIT_PAD);used+=c.px;}else{c.w=Math.max(c.avg,c.h);wsum+=c.w;}}
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
  const run=()=>{raf=0;for(const t of pending)try{fitTable(t);pageTable(t);}catch(_){}pending.clear();};
  const queue=t=>{if(t&&!t.classList.contains('nofit')){pending.add(t);if(!raf)raf=requestAnimationFrame(run);}};
  new MutationObserver(ms=>{for(const m of ms){
    if(m.target.nodeName==='COLGROUP'||m.target.nodeName==='COL')continue;
    const own=m.target.closest&&m.target.closest('table');if(own)queue(own);
    for(const n of m.addedNodes){if(n.nodeType!==1||n.nodeName==='COLGROUP')continue;if(n.nodeName==='TABLE')queue(n);else if(n.querySelectorAll)n.querySelectorAll('table').forEach(queue);}
  }}).observe(document.body,{childList:true,subtree:true});
  let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>document.querySelectorAll('table').forEach(t=>{delete t.dataset.fit;queue(t);}),150);});
  document.querySelectorAll('table').forEach(queue);
})();
/** Status colours: every status dropdown (work item or TD, any page) gets an st-* class from its selected value; styles live in sprint.css. */
H.stCls=st=>{const x=String(st||'').toLowerCase();
  return /never|duplicate|reject|will not|inactive|not accepted|cancel|declin/.test(x)?'st-off':/^closed|fixed|complete|deliver|accepted|done|resolved/.test(x)?'st-done':/review|qa|verif|test|pending/.test(x)?'st-review':/progress|investigat|commit|triag/.test(x)?'st-prog':/block|wait|hold|risk/.test(x)?'st-block':'st-new';};
function paintStatus(sel){
  if(!/Status__c$/.test(sel.dataset.field||''))return;
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
(function(){const b=document.createElement('button');b.id='focus-toggle';b.type='button';b.className='focus-toggle';b.setAttribute('aria-pressed','false');
  b.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"/></svg><span>Full screen</span>';
  b.onclick=()=>setFocus(!H.focus());document.body.appendChild(b);})();
/** Escape clears the innermost active filter/selection of the current page, one level per press (Release Review keeps its own Escape handling). */
const escHandlers=new Map();
H.onEsc=(id,fn)=>escHandlers.set(id,fn);
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape'||e.repeat||e.defaultPrevented)return;
  const id=document.body.dataset.hub;if(!id||id==='epics'||document.querySelector('.nd-overlay'))return;
  if(!(escHandlers.get(id)&&escHandlers.get(id)())){
    if(H.focus()){setFocus(false);e.preventDefault();e.stopImmediatePropagation();return;} // generic fallback: empty free-text filters on the page
    const box=document.getElementById('hub-page')||document;
    for(const i of box.querySelectorAll('input[type=text],input[type=search],input:not([type])')){if(i.value&&!i.dataset.edit&&!i.dataset.rk&&!i.closest('[data-edit]')){i.value='';i.dispatchEvent(new Event('input',{bubbles:true}));break;}}
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
H.register({id:'epics',label:'Release Review',icon:'scope',tone:'green',desc:'Release epics, health and monthly updates',legacy:'overview',stat:()=>({text:'Release review · health and monthly updates'})});
H.register({id:'status',label:'V2MOM Updates',icon:'ai',tone:'violet',desc:'V2MOM executive updates',legacy:'executive',stat:()=>({text:'V2MOM executive summary and leadership update'})});
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
