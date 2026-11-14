/* Release Planning: engineers plan projects, epics and workstreams (effort in days), mark epics above/below the line (ABL/BTL),
 * and the dashboard derives planned vs available capacity live. The draft saves to GUS Apps; only ABL epics are written to GUS on confirm.
 * Every interpolated value in the templates below goes through esc() or is a number from fmt(). */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const P={plan:null,rev:null,refs:{releases:[],programs:[],projects:[],sprints:[]},members:[],seq:0,timer:0,state:'idle',stateAt:'',inflight:null,el:null};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const r2=n=>Math.round(n*100)/100,fmt=n=>String(r2(Number(n)||0));
const iso=d=>d.toISOString().slice(0,10);
const emptyPlan=()=>{const s=new Date(),e=new Date(Date.now()+91*864e5);return {window:{start:iso(s),end:iso(e)},people:{},projects:[],epics:[],lastCommit:null};};

// ── Capacity model (pure, recomputed on every edit) ─────────────────────────
function workdays(start,end){
  if(!start||!end||start>end)return 0;
  const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');let n=0;
  for(let d=a;d<=b;d=new Date(d.getTime()+864e5)){const w=d.getUTCDay();if(w&&w<6)n++;}
  return n;
}
const themeOf=pr=>(pr&&(pr.theme||(/^[^:]{1,30}:/.test(pr.name||'')?pr.name.split(':')[0].trim():'')))||'Unthemed';
const epicDays=e=>r2(e.workstreams.reduce((a,w)=>a+(w.days||0),0));
function model(){
  const pl=P.plan,wd=workdays(pl.window.start,pl.window.end),prj=new Map(pl.projects.map(p=>[p.id,p]));
  const eng=new Map();
  const row=(id,name)=>{if(!eng.has(id))eng.set(id,{id,name,leave:0,holiday:0,oncall:0,avail:0,abl:0,btl:0,cap:true});return eng.get(id);};
  for(const m of P.members)if(H.leaderRank(m.name)<0){const x=row(m.id,m.name),pp=pl.people[m.id]||{};x.leave=pp.leave||0;x.holiday=pp.holiday||0;x.oncall=pp.oncall||0;x.avail=Math.max(0,wd-x.leave-x.holiday-x.oncall);}
  const themes=new Map();let ablT=0,btlT=0;
  for(const e of pl.epics)for(const w of e.workstreams){
    const d=w.days||0;if(!d)continue;
    const x=w.engId?row(w.engId,w.engName||(P.members.find(m=>m.id===w.engId)||{}).name||'Engineer'):row('none','Unassigned');
    if(!w.engId)x.cap=false;
    const t=themeOf(prj.get(e.projectId));if(!themes.has(t))themes.set(t,{name:t,abl:0,btl:0});
    if(e.line==='ABL'){x.abl+=d;ablT+=d;themes.get(t).abl+=d;}else{x.btl+=d;btlT+=d;themes.get(t).btl+=d;}
  }
  const rows=[...eng.values()],avail=rows.reduce((a,x)=>a+x.avail,0);
  return {wd,rows,avail,abl:r2(ablT),btl:r2(btlT),total:r2(ablT+btlT),themes:[...themes.values()].sort((a,b)=>(b.abl+b.btl)-(a.abl+a.btl))};
}
const tone=pct=>pct>100?'over':pct>85?'warn':'ok';

// ── Persistence ─────────────────────────────────────────────────────────────
const stateText=()=>({idle:'',dirty:'Unsaved changes…',saving:'Saving…',saved:'Saved '+P.stateAt,conflict:'Someone else changed this plan. <button type="button" class="text-button" data-reload>Reload</button>',error:'Could not save. <button type="button" class="text-button" data-retry>Retry</button>'}[P.state]||'');
function setState(s){P.state=s;if(s==='saved')P.stateAt=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});const c=P.el&&P.el.querySelector('#pl-state');if(c){c.className='pl-state '+s;c.innerHTML=stateText();}}
function queueSave(){setState('dirty');clearTimeout(P.timer);P.timer=setTimeout(flush,700);}
async function flush(){
  clearTimeout(P.timer);if(P.state!=='dirty'&&P.state!=='error')return P.inflight;
  const my=P.seq;setState('saving');
  P.inflight=call('plan-save',{teamId:H.team.Id,plan:P.plan,revision:P.rev}).then(r=>{if(my!==P.seq)return;P.rev=r.revision;if(P.state==='saving')setState('saved');},e=>{if(my!==P.seq)return;setState(/changed/i.test(e.message)?'conflict':'error');window.toast?.(e.message,true);});
  return P.inflight;
}

// ── Rendering ───────────────────────────────────────────────────────────────
const opt=(v,l,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(l)}</option>`;
const kpi=(label,val,sub,cls='')=>`<div class="pl-kpi ${cls}"><span>${esc(label)}</span><b>${val}</b><small>${sub}</small></div>`;
function drawSummary(){
  const el=P.el&&P.el.querySelector('#pl-sum');if(!el)return;
  const m=model(),pctA=m.avail?Math.round(m.abl/m.avail*100):0,pctT=m.avail?Math.round(m.total/m.avail*100):0,head=r2(m.avail-m.abl);
  const maxT=Math.max(1,...m.themes.map(t=>t.abl+t.btl));
  el.innerHTML=`<div class="pl-kpis">${kpi('Available',fmt(m.avail)+'<i>d</i>',`${m.wd} working days × ${m.rows.filter(x=>x.cap).length} engineers, less leaves, holidays and on-call`)}${kpi('Planned ABL',fmt(m.abl)+'<i>d</i>',`${pctA}% of available`,tone(pctA))}${kpi('Planned BTL',fmt(m.btl)+'<i>d</i>','stretch work below the line')}${kpi('Total planned',fmt(m.total)+'<i>d</i>',`${pctT}% of available`,tone(pctT))}${kpi(head<0?'Over capacity':'Headroom (ABL)',fmt(Math.abs(head))+'<i>d</i>',head<0?'ABL exceeds what the team can deliver':'available after ABL',head<0?'over':'ok')}</div>
  <div class="pl-sum-grid"><section class="pl-card"><h3>By theme / method</h3>${m.themes.length?m.themes.map(t=>`<div class="pl-bar-row"><span class="pl-bar-l" title="${esc(t.name)}">${esc(t.name)}</span><div class="pl-bar"><i class="abl" style="width:${t.abl/maxT*100}%"></i><i class="btl" style="width:${t.btl/maxT*100}%"></i></div><span class="pl-bar-v">${fmt(t.abl)}<small> ABL</small> · ${fmt(t.btl)}<small> BTL</small></span></div>`).join(''):'<p class="note">Add effort to workstreams to see the split.</p>'}<p class="pl-legend"><i class="abl"></i>ABL <i class="btl"></i>BTL</p></section>
  <section class="pl-card"><h3>Engineer bandwidth</h3><div class="pl-eng" role="table" aria-label="Engineer bandwidth"><div class="pl-eng-h" role="row"><span>Engineer</span><span>Available</span><span>ABL</span><span>BTL</span><span>Load</span></div>${m.rows.length?m.rows.map(x=>{const pct=x.avail?Math.round((x.abl+x.btl)/x.avail*100):((x.abl+x.btl)?999:0),pa=x.avail?Math.round(x.abl/x.avail*100):0;
    return `<div class="pl-eng-r" role="row"><span class="pl-eng-n" title="${esc(x.name)}">${esc(x.name)}${x.cap&&(x.leave||x.holiday||x.oncall)?`<small>${[x.leave&&fmt(x.leave)+'d leave',x.holiday&&fmt(x.holiday)+'d holiday',x.oncall&&fmt(x.oncall)+'d on-call'].filter(Boolean).join(' · ')}</small>`:''}</span><span>${x.cap?fmt(x.avail):'—'}</span><span>${fmt(x.abl)}</span><span>${fmt(x.btl)}</span><span class="pl-load ${x.cap?tone(pct):'over'}"><i style="width:${Math.min(pct,100)}%"></i><em style="width:${Math.min(pa,100)}%"></em><b>${x.cap?(pct>=999?'—':pct+'%'):'unassigned'}</b></span></div>`;}).join(''):'<p class="note">No team members loaded.</p>'}</div></section></div>`;
}
function drawPlanner(){
  const el=P.el.querySelector('#pl-planner'),pl=P.plan,rel=P.refs.releases;
  const projOpts=sel=>pl.projects.map(p=>opt(p.id,p.name||'(unnamed project)',p.id===sel)).join('');
  const engOpts=sel=>'<option value="">Unassigned</option>'+P.members.filter(m=>H.leaderRank(m.name)<0).map(m=>opt(m.id,m.name,m.id===sel)).join('');
  const epic=e=>{const inGus=e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">In GUS ↗</a>`:'<em class="pl-draft">Draft</em>';
    return `<div class="pl-epic ${e.line==='ABL'?'abl':'btl'}" data-e="${esc(e.id)}"><div class="pl-epic-h">
    <input class="hub-inline pl-pri" type="number" min="0" max="9999" inputmode="numeric" placeholder="Pri" aria-label="Priority" data-f="priority" value="${e.priority==null?'':esc(e.priority)}">
    <input class="hub-inline pl-ename" type="text" placeholder="Epic name" aria-label="Epic name" data-f="name" value="${esc(e.name)}" maxlength="255">
    <select class="sp-select" aria-label="Planned release" data-f="releaseId"><option value="">Planned release…</option>${rel.map(r=>opt(r.id,r.name,r.id===e.releaseId)).join('')}${e.releaseId&&!rel.some(r=>r.id===e.releaseId)?opt(e.releaseId,e.releaseName||e.releaseId,true):''}</select>
    <select class="sp-select" aria-label="Project" data-f="projectId">${projOpts(e.projectId)}</select>
    <span class="pl-line" role="group" aria-label="Line of prioritisation"><button type="button" class="${e.line==='ABL'?'on abl':''}" data-line="ABL" aria-pressed="${e.line==='ABL'}" title="Above the line: saved to GUS">ABL</button><button type="button" class="${e.line==='BTL'?'on btl':''}" data-line="BTL" aria-pressed="${e.line==='BTL'}" title="Below the line: stays in the dashboard">BTL</button></span>
    <span class="pl-eff" title="Sum of workstream days"><b data-eff>${fmt(epicDays(e))}</b> d</span>${inGus}
    <button type="button" class="pl-x" data-del-epic aria-label="Delete epic" title="Delete epic">×</button></div>
    <div class="pl-ws">${e.workstreams.map(w=>`<div class="pl-ws-r" data-w="${esc(w.id)}"><input class="hub-inline" type="text" placeholder="Workstream" aria-label="Workstream" data-f="name" value="${esc(w.name)}" maxlength="120"><select class="sp-select" aria-label="Engineer" data-f="engId">${engOpts(w.engId)}</select><input class="hub-inline pl-days" type="number" min="0" max="1000" step="0.5" inputmode="decimal" placeholder="Days" aria-label="Effort in days" data-f="days" value="${w.days?fmt(w.days):''}"><input class="hub-inline" type="text" list="pl-sprints" placeholder="Tentative sprint" aria-label="Tentative sprint" data-f="sprint" value="${esc(w.sprint)}" maxlength="60"><button type="button" class="pl-x" data-del-ws aria-label="Delete workstream" title="Delete workstream">×</button></div>`).join('')}<button type="button" class="pl-add" data-add-ws>+ Workstream</button></div></div>`;};
  const proj=p=>{const es=pl.epics.filter(e=>e.projectId===p.id),theme=themeOf(p);
    return `<section class="pl-proj" data-p="${esc(p.id)}"><div class="pl-proj-h">
    <input class="hub-inline pl-pname" type="text" list="pl-projects" placeholder="Project name (type to link an existing GUS project)" aria-label="Project name" data-f="name" value="${esc(p.name)}" maxlength="120">
    <input class="hub-inline pl-theme" type="text" placeholder="${esc(theme)}" aria-label="Theme or method" title="Theme / method (defaults to the project prefix)" data-f="theme" value="${esc(p.theme)}" maxlength="80">
    ${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">In GUS ↗</a>`:'<em class="pl-draft">New</em>'}
    <button type="button" class="button small" data-add-epic>+ Epic</button><button type="button" class="pl-x" data-del-proj aria-label="Delete project" title="Delete project">×</button></div>
    ${es.length?es.map(epic).join(''):'<p class="note pl-none">No epics yet. Add one to start planning.</p>'}</section>`;};
  el.innerHTML=`<datalist id="pl-projects">${P.refs.projects.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist><datalist id="pl-sprints">${P.refs.sprints.map(s=>`<option value="${esc(s.name)}"></option>`).join('')}</datalist>`+
    (pl.projects.length?pl.projects.map(proj).join(''):'<div class="empty-state hub-empty"><h3>No projects yet</h3><p>Add a project, then epics and workstreams with effort in days.</p></div>');
}
function draw(){drawSummary();drawPlanner();}

// ── Edits ───────────────────────────────────────────────────────────────────
const findE=id=>P.plan.epics.find(e=>e.id===id),findP=id=>P.plan.projects.find(p=>p.id===id);
const ctxOf=t=>{const w=t.closest('[data-w]'),e=t.closest('[data-e]'),p=t.closest('[data-p]');return {w:w&&w.dataset.w,e:e&&e.dataset.e,p:p&&p.dataset.p};};
function onInput(ev){
  const t=ev.target.closest('[data-f]');if(!t||!P.plan)return;
  const f=t.dataset.f,c=ctxOf(t),v=t.value;let structural=false;
  if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!w)return;
    if(f==='days'){w.days=Math.max(0,Number(v)||0);const b=t.closest('.pl-epic').querySelector('[data-eff]');if(b)b.textContent=fmt(epicDays(e));}
    else if(f==='engId'){w.engId=v;w.engName=(P.members.find(m=>m.id===v)||{}).name||'';}
    else w[f]=v;}
  else if(c.e){const e=findE(c.e);if(!e)return;
    if(f==='priority')e.priority=v===''?null:Math.max(0,Math.round(Number(v)));
    else if(f==='releaseId'){e.releaseId=v;e.releaseName=(P.refs.releases.find(r=>r.id===v)||{}).name||'';}
    else if(f==='projectId'){e.projectId=v;structural=true;}
    else e[f]=v;}
  else if(c.p){const p=findP(c.p);if(!p)return;
    if(f==='name'){p.name=v;const hit=P.refs.projects.find(x=>x.name===v);if(hit){p.gusId=hit.id;p.programId=hit.programId;p.programName=hit.programName;structural=true;}else if(p.gusId){p.gusId='';}}
    else p[f]=v;}
  if(structural&&ev.type==='change')draw();else drawSummary();
  queueSave();
}
function onClick(ev){
  const t=ev.target,c=ctxOf(t),pl=P.plan;
  if(t.closest('[data-reload]'))return load(P.el);
  if(t.closest('[data-retry]'))return flush();
  if(!pl)return;
  if(t.closest('#pl-add-proj')){pl.projects.push({id:uid('p'),name:'',theme:'',gusId:''});draw();queueSave();const n=P.el.querySelectorAll('.pl-pname');n[n.length-1]?.focus();return;}
  if(t.closest('#pl-leaves'))return openLeaves();
  if(t.closest('#pl-commit'))return openCommit();
  if(t.closest('[data-add-epic]')){const e={id:uid('e'),projectId:c.p,name:'',line:'BTL',priority:null,releaseId:'',releaseName:'',gusId:'',workstreams:[{id:uid('w'),name:'',engId:'',engName:'',days:0,sprint:''}]};pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] .pl-ename`)?.focus();return;}
  if(t.closest('[data-add-ws]')){const e=findE(c.e);if(!e)return;const w={id:uid('w'),name:'',engId:'',engName:'',days:0,sprint:''};e.workstreams.push(w);draw();queueSave();P.el.querySelector(`[data-w="${w.id}"] input`)?.focus();return;}
  const line=t.closest('[data-line]');if(line){const e=findE(c.e);if(e){e.line=line.dataset.line;draw();queueSave();}return;}
  if(t.closest('[data-del-ws]')){const e=findE(c.e);if(e){e.workstreams=e.workstreams.filter(w=>w.id!==c.w);draw();queueSave();}return;}
  if(t.closest('[data-del-epic]')){const e=findE(c.e);if(e&&((!e.gusId&&!e.name&&!epicDays(e))||confirm(e.gusId?'This epic is already in GUS. Delete only the draft here? The GUS epic stays.':'Delete this epic and its workstreams?'))){pl.epics=pl.epics.filter(x=>x.id!==c.e);draw();queueSave();}return;}
  if(t.closest('[data-del-proj]')){const n=pl.epics.filter(e=>e.projectId===c.p).length;if(!n||confirm(`Delete this project and its ${n} epic draft(s)? Anything already in GUS stays there.`)){pl.projects=pl.projects.filter(p=>p.id!==c.p);pl.epics=pl.epics.filter(e=>e.projectId!==c.p);draw();queueSave();}}
}

// ── Dialogs ─────────────────────────────────────────────────────────────────
let modal=null;
function closeModal(){if(!modal)return false;document.removeEventListener('keydown',modal.key,true);modal.el.remove();modal.opener&&modal.opener.focus&&modal.opener.focus();modal=null;return true;}
function openModal(title,body,opener){
  closeModal();const el=document.createElement('div');el.className='nd-overlay';
  el.innerHTML=`<div class="nd-modal pl-modal" role="dialog" aria-modal="true" aria-labelledby="pl-mt"><div class="nd-head"><h2 id="pl-mt">${esc(title)}</h2><button type="button" class="nd-x" data-close aria-label="Close">×</button></div><div id="pl-mb">${body}</div></div>`;
  document.body.appendChild(el);
  modal={el,opener,key:e=>{if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();closeModal();}}};document.addEventListener('keydown',modal.key,true);
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-close]'))closeModal();});
  (el.querySelector('input,button.primary')||el.querySelector('[data-close]')).focus();return el;
}
function openLeaves(){
  const m=P.members.filter(x=>H.leaderRank(x.name)<0),wd=workdays(P.plan.window.start,P.plan.window.end);
  const el=openModal('Leaves, holidays & on-call',`<p class="note">Days off for each engineer inside the planning window (${esc(P.plan.window.start)} → ${esc(P.plan.window.end)}, ${wd} working days). On-call is the effort each engineer spends on rotation (not available for planned work). Available days = working days − leave − holidays − on-call.</p>
  <div class="pl-leaves"><div class="pl-leaves-h"><span>Engineer</span><span>Leave (days)</span><span>Holidays (days)</span><span>On-call (days)</span><span>Available</span></div>${m.map(x=>{const p=P.plan.people[x.id]||{};return `<div class="pl-leaves-r" data-id="${esc(x.id)}"><span>${esc(x.name)}</span><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Leave days for ${esc(x.name)}" data-k="leave" value="${p.leave?fmt(p.leave):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Holiday days for ${esc(x.name)}" data-k="holiday" value="${p.holiday?fmt(p.holiday):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="On-call days for ${esc(x.name)}" data-k="oncall" value="${p.oncall?fmt(p.oncall):''}"><b data-av>${fmt(Math.max(0,wd-(p.leave||0)-(p.holiday||0)-(p.oncall||0)))}</b></div>`;}).join('')||'<p class="note">No team members loaded.</p>'}</div>
  <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-leaves-save">Save</button></div>`,document.getElementById('pl-leaves'));
  el.addEventListener('input',e=>{const r=e.target.closest('.pl-leaves-r');if(!r)return;const v=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0);r.querySelector('[data-av]').textContent=fmt(Math.max(0,wd-v('leave')-v('holiday')-v('oncall')));});
  el.querySelector('#pl-leaves-save').onclick=()=>{
    el.querySelectorAll('.pl-leaves-r').forEach(r=>{const id=r.dataset.id,g=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0),leave=g('leave'),holiday=g('holiday'),oncall=g('oncall');
      if(leave||holiday||oncall)P.plan.people[id]={name:(P.members.find(x=>x.id===id)||{}).name||'',leave,holiday,oncall};else delete P.plan.people[id];});
    closeModal();drawSummary();queueSave();
  };
}
async function openCommit(){
  const opener=document.getElementById('pl-commit');await flush();
  if(P.state==='conflict'||P.state==='error')return window.toast?.('Resolve the save problem before saving to GUS.',true);
  const el=openModal('Save to GUS','<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Checking the plan…</div>',opener);
  try{
    const {preview}=await call('plan-commit',{teamId:H.team.Id,confirm:false}),it=preview.items,bl=preview.blockers.length;
    el.querySelector('#pl-mb').innerHTML=`<p class="note">${it.length?`${it.length} epic(s) above the line will be saved to GUS.`:'No epics are above the line (ABL) yet.'} ${preview.skipped?`${preview.skipped} below-the-line epic(s) stay in the dashboard.`:''}</p>
    ${it.length?`<div class="pl-review">${it.map(x=>`<div class="pl-review-r${x.problems.length?' bad':''}"><b>${esc(x.name||'(unnamed epic)')}</b><span>${x.action==='update'?'Update existing':'Create'} · project ${esc(x.project||'—')}${x.projectAction==='create-or-link'?' (created or linked)':''} · program ${esc(x.program||'—')}</span><span>Release ${esc(x.release||'—')} · priority ${x.priority==null?'—':esc(x.priority)} · planned effort ${fmt(x.effort)} days</span>${x.problems.map(p=>`<em>⚠ ${esc(p)}</em>`).join('')}</div>`).join('')}</div>`:''}
    <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-confirm" ${bl||!it.length?'disabled':''}>Create in GUS</button></div>`;
    el.querySelector('#pl-confirm').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Saving to GUS…';
      try{const r=await call('plan-commit',{teamId:H.team.Id,confirm:true});showResult(r);}catch(err){el.querySelector('#pl-mb').insertAdjacentHTML('afterbegin',`<p class="nd-msg error">${esc(err.message)}</p>`);b.disabled=false;b.textContent='Create in GUS';}};
  }catch(err){el.querySelector('#pl-mb').innerHTML=`<p class="nd-msg error">${esc(err.message)}</p><div class="nd-actions"><button type="button" class="button" data-close>Close</button></div>`;}
}
function showResult(r){
  if(r.plan){P.plan=r.plan;P.rev=r.revision;draw();}else load(P.el);
  const ok=r.results.filter(x=>x.ok).length;
  openModal(r.failed?'Saved with errors':'Saved to GUS',`<p class="note">${ok} of ${r.results.length} epic(s) saved to GUS${r.failed?`; ${r.failed} failed and can be retried — saved ones are not duplicated`:''}.${r.saveError?` The draft could not record the GUS ids (${esc(r.saveError)}); reload before retrying.`:''}</p>
  <div class="pl-review">${r.results.map(x=>`<div class="pl-review-r${x.ok?'':' bad'}"><b>${esc(x.name)}</b><span>${x.ok?esc([x.project,x.action].filter(Boolean).join(' · ')):'⚠ '+esc(x.error)}</span>${x.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(x.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:''}</div>`).join('')}</div>
  <div class="nd-actions"><button type="button" class="button primary" data-close>Done</button></div>`,null);
}

// ── Page ────────────────────────────────────────────────────────────────────
async function load(el){
  const my=++P.seq;clearTimeout(P.timer);P.state='idle';P.plan=null;
  el.querySelector('#pl-sum').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading plan…</div>';el.querySelector('#pl-planner').innerHTML='';
  try{
    const id=H.team.Id,[g,refs,members]=await Promise.all([call('plan-get',{teamId:id}),call('plan-refs',{teamId:id}).catch(e=>({releases:[],programs:[],projects:[],sprints:[],warnings:[e.message]})),H.members().catch(()=>[])]);
    if(my!==P.seq)return;
    P.plan=g.plan.window.start?g.plan:{...g.plan,window:emptyPlan().window};P.rev=g.revision;P.refs=refs;P.members=members;
    const w=refs.warnings||[];el.querySelector('#pl-warn').innerHTML=w.length?`<p class="note pl-warn">Some GUS lists did not load (${esc(w.join('; '))}). Pickers may be incomplete.</p>`:'';
    el.querySelector('#pl-start').value=P.plan.window.start;el.querySelector('#pl-end').value=P.plan.window.end;
    el.querySelector('#pl-last').textContent=P.plan.lastCommit&&P.plan.lastCommit.at?`Last saved to GUS ${new Date(P.plan.lastCommit.at).toLocaleString()} (${P.plan.lastCommit.created} created, ${P.plan.lastCommit.updated} updated)`:'';
    draw();setState('idle');
  }catch(e){if(my===P.seq)el.querySelector('#pl-sum').innerHTML=`<div class="empty-state hub-empty"><h3>Could not load the plan</h3><p>${esc(e.message)}</p></div>`;}
}
H.register({id:'plan',label:'Release Planning',icon:'plan',tone:'green',desc:'Plan projects, epics and effort against team capacity',needsTeam:true,
  stat:()=>({text:'Planned vs available capacity, ABL and BTL'}),
  render(el){
    P.el=el;
    el.innerHTML=`<div class="executive-heading"><div><h2>${icon('plan','green')} Release Planning</h2><p>Plan projects, epics and workstreams for ${esc(H.team.Name)}. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.</p></div><div class="heading-actions"><span id="pl-state" class="pl-state" role="status" aria-live="polite"></span><button type="button" class="button" id="pl-leaves">Leaves, holidays &amp; on-call</button><button type="button" class="button primary" id="pl-commit">Review &amp; save to GUS</button></div></div>
    <div class="pl-window"><label>Planning window <input type="date" class="hub-inline" id="pl-start" aria-label="Window start"></label><span aria-hidden="true">→</span><input type="date" class="hub-inline" id="pl-end" aria-label="Window end"><span class="note" id="pl-last"></span></div><div id="pl-warn"></div>
    <div id="pl-sum"></div>
    <div class="pl-planner-h"><h3>Projects &amp; epics</h3><button type="button" class="button" id="pl-add-proj">+ Project</button></div><div id="pl-planner"></div>`;
    el.oninput=onInput;
    el.onchange=ev=>{if(ev.target.closest('#pl-start,#pl-end')){const s=el.querySelector('#pl-start').value,e=el.querySelector('#pl-end').value;if(s&&e&&s<=e&&P.plan){P.plan.window={start:s,end:e};drawSummary();queueSave();}else if(s&&e&&s>e)window.toast?.('End date must be on or after the start date.',true);return;}onInput(ev);};
    el.onclick=onClick;load(el);
  }});
H.onEsc('plan',()=>{closeModal();return true;});
window.addEventListener('beforeunload',e=>{if(P.state==='dirty'||P.state==='saving'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hub:team',()=>{closeModal();clearTimeout(P.timer);});
})();
