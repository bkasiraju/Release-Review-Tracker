/* Release Planning: engineers plan projects, epics and workstreams (effort in days), mark epics above/below the line (ABL/BTL),
 * and the dashboard derives planned vs available capacity live. The draft saves to GUS Apps; only ABL epics are written to GUS on confirm.
 * Every interpolated value in the templates below goes through esc() or is a number from fmt(). */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const P={plan:null,rev:null,refs:{releases:[],programs:[],projects:[],sprints:[]},members:[],seq:0,timer:0,state:'idle',stateAt:'',inflight:null,el:null};
P.open={theme:false,eng:false};
P.view={q:'',release:'',line:'',eng:'',theme:'',group:'project',mode:'form'};
const priOpts=v=>{const n=v==null||v===''?null:Number(v),L=[1,2,3,4,5];if(n!=null&&!L.includes(n))L.push(n);return `<option value="">Priority</option>`+L.sort((a,b)=>a-b).map(x=>`<option value="${x}"${x===n?' selected':''}>P${x}</option>`).join('');};
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
// ── Release Planning Summary (read-only roll-up of the plan) ───────────────
const TCOL=['#f59e0b','#2f6fdd','#12b981','#9333ea','#06b6d4','#e11d74','#6366f1','#84cc16','#64748b'];
const PCOL={1:'#d6336c',2:'#e8890c',3:'#1b73b3',0:'#8aa0b4',b:'#b8c4d2'};
const bucketOf=e=>e.line!=='ABL'?'b':(e.priority>=1&&e.priority<=3?e.priority:0);
function rpsModel(){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p])),B={1:0,2:0,3:0,0:0,b:0},T=new Map();let abl=0;
  for(const e of pl.epics){const d=epicDays(e),b=bucketOf(e);B[b]+=d;
    if(e.line==='ABL'){abl+=d;const t=themeOf(prj.get(e.projectId));if(!T.has(t))T.set(t,{name:t,days:0,epics:0});const x=T.get(t);x.days+=d;x.epics++;}}
  return {B,abl:r2(abl),themes:[...T.values()].sort((a,b)=>b.days-a.days)};
}
const pctOf=(n,d)=>d?Math.round(n/d*100):0;
function drawRps(){
  const el=P.el&&P.el.querySelector('#pl-rps');if(!el||!P.plan)return;
  const m=rpsModel(),{B}=m,tot=m.abl,col=i=>TCOL[i%TCOL.length];
  const card=(k,label,val,sub,colr)=>`<button type="button" class="pl-rk" data-rps="${k}" style="--c:${colr}"><span>${label}</span><b>${fmt(val)}<small> d</small></b><em>${sub}</em><i>Full screen →</i></button>`;
  const R=46,C=2*Math.PI*R;let off=0;
  const arcs=m.themes.filter(t=>t.days>0).map((t,i)=>{const len=t.days/tot*C,a=`<circle cx="60" cy="60" r="${R}" fill="none" stroke="${col(i)}" stroke-width="18" stroke-dasharray="${len} ${C-len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"></circle>`;off+=len;return a;}).join('');
  const seg=(b,l)=>B[b]>0?`<i style="width:${B[b]/(tot||1)*100}%;background:${PCOL[b]}" title="${l}: ${fmt(B[b])} d"></i>`:'';
  el.innerHTML=`<div class="pl-rks">${card('abl','Total payload (ABL)',tot,`P1 ${fmt(B[1])} · P2 ${fmt(B[2])} · P3 ${fmt(B[3])}${B[0]?` · other ${fmt(B[0])}`:''}`,'#1b73b3')}
    ${card('p1','P1 critical',B[1],`${pctOf(B[1],tot)}% of planned`,PCOL[1])}${card('p2','P2 high',B[2],`${pctOf(B[2],tot)}% of planned`,PCOL[2])}${card('p3','P3 medium',B[3],`${pctOf(B[3],tot)}% of planned`,PCOL[3])}${card('btl','BTL effort',B.b,'Below the line / backlog',PCOL.b)}</div>
  <div class="pl-rps-grid"><section class="pl-card"><h3>Theme payload distribution</h3><p class="note">Above-the-line effort by theme. Click a theme to open its epics.</p>
    ${tot?`<div class="pl-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Theme payload distribution">${arcs}</svg><div><b>${fmt(tot)}</b><span>planned days</span></div></div>`:'<p class="note">Add ABL effort to see the distribution.</p>'}
    <div class="pl-tleg">${m.themes.map((t,i)=>`<button type="button" data-rps="t:${esc(t.name)}"><i style="background:${col(i)}"></i><span>${esc(t.name)}</span><b>${fmt(t.days)}d</b></button>`).join('')}</div></section>
  <section class="pl-card"><h3>Priority &amp; strategic investment breakdown</h3><p class="note">High-level effort commitment across release goals (days).</p>
    <div class="pl-pleg"><span style="color:${PCOL[1]}">P1: ${fmt(B[1])} d (${pctOf(B[1],tot)}%)</span><span style="color:${PCOL[2]}">P2: ${fmt(B[2])} d</span><span style="color:${PCOL[3]}">P3: ${fmt(B[3])} d</span>${B[0]?`<span>No priority / P4+: ${fmt(B[0])} d</span>`:''}<span>BTL: ${fmt(B.b)} d</span></div>
    <div class="pl-pbar">${seg(1,'P1')}${seg(2,'P2')}${seg(3,'P3')}${seg(0,'Other')}</div>
    <h4 class="pl-sub">Strategic themes portfolio (${m.themes.length} theme${m.themes.length===1?'':'s'})</h4>
    <div class="pl-tcards">${m.themes.length?m.themes.map((t,i)=>`<button type="button" class="pl-tc" data-rps="t:${esc(t.name)}" style="--c:${col(i)}"><b>${esc(t.name)}</b><span>${fmt(t.days)} d (${pctOf(t.days,tot)}%)</span><u><i style="width:${pctOf(t.days,tot)}%"></i></u><small>${t.epics} epic${t.epics===1?'':'s'}</small><em>Open full screen</em></button>`).join(''):'<p class="note">No above-the-line epics yet.</p>'}</div></section></div>`;
}
function openRps(k,opener){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p]));let title,list;
  if(k==='abl'){title='Total payload (ABL)';list=pl.epics.filter(e=>e.line==='ABL');}
  else if(k==='btl'){title='BTL effort';list=pl.epics.filter(e=>e.line!=='ABL');}
  else if(k[0]==='p'){title='P'+k[1]+' epics';list=pl.epics.filter(e=>bucketOf(e)===Number(k[1]));}
  else{const t=k.slice(2);title='Theme: '+t;list=pl.epics.filter(e=>e.line==='ABL'&&themeOf(prj.get(e.projectId))===t);}
  list=[...list].sort((a,b)=>(a.priority==null?99:a.priority)-(b.priority==null?99:b.priority));
  const eng=e=>[...new Set(e.workstreams.map(w=>w.engName).filter(Boolean))].join(', ')||'—';
  openModal(title,list.length?`<table class="pl-rps-t"><thead><tr><th>P</th><th>Epic</th><th>Project</th><th>Release</th><th>Line</th><th>Engineers</th><th>Days</th></tr></thead><tbody>${list.map(e=>`<tr><td>${e.priority==null?'—':'P'+esc(e.priority)}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc((prj.get(e.projectId)||{}).name||'—')}</td><td>${esc(e.releaseName||'—')}</td><td>${esc(e.line)}</td><td>${esc(eng(e))}</td><td>${fmt(epicDays(e))}</td></tr>`).join('')}</tbody></table>`:'<p class="note">No epics.</p>',opener);
}
function setTab(t){P.tab=t;const q=s=>P.el.querySelector(s);q('#pl-main').hidden=t!=='plan';q('#pl-rps').hidden=t!=='rps';P.el.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});if(t==='rps')drawRps();}
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
  if(P.tab==='rps')drawRps();
  const el=P.el&&P.el.querySelector('#pl-sum');if(!el)return;
  const m=model(),pctA=m.avail?Math.round(m.abl/m.avail*100):0,pctT=m.avail?Math.round(m.total/m.avail*100):0,head=r2(m.avail-m.abl);
  const maxT=Math.max(1,...m.themes.map(t=>t.abl+t.btl));
  el.innerHTML=`<div class="pl-kpis">${kpi('Available',fmt(m.avail)+'<i>d</i>',`${m.wd} working days × ${m.rows.filter(x=>x.cap).length} engineers, less leaves, holidays and on-call`)}${kpi('Planned ABL',fmt(m.abl)+'<i>d</i>',`${pctA}% of available`,tone(pctA))}${kpi('Planned BTL',fmt(m.btl)+'<i>d</i>','stretch work below the line')}${kpi('Total planned',fmt(m.total)+'<i>d</i>',`${pctT}% of available`,tone(pctT))}${kpi(head<0?'Over capacity':'Headroom (ABL)',fmt(Math.abs(head))+'<i>d</i>',head<0?'ABL exceeds what the team can deliver':'available after ABL',head<0?'over':'ok')}</div>
  <div class="pl-sum-grid"><section class="pl-card${P.open.theme?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="theme" aria-expanded="${P.open.theme}"><span aria-hidden="true">${P.open.theme?'▾':'▸'}</span> By theme / method</button><small>${P.open.theme?'Collapse':'Expand'}</small></h3>${m.themes.length?m.themes.map(t=>`<div class="pl-bar-row"><span class="pl-bar-l" title="${esc(t.name)}">${esc(t.name)}</span><div class="pl-bar"><i class="abl" style="width:${t.abl/maxT*100}%"></i><i class="btl" style="width:${t.btl/maxT*100}%"></i></div><span class="pl-bar-v">${fmt(t.abl)}<small> ABL</small> · ${fmt(t.btl)}<small> BTL</small></span></div>`).join(''):'<p class="note">Add effort to workstreams to see the split.</p>'}<p class="pl-legend"><i class="abl"></i>ABL <i class="btl"></i>BTL</p></section>
  <section class="pl-card${P.open.eng?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="eng" aria-expanded="${P.open.eng}"><span aria-hidden="true">${P.open.eng?'▾':'▸'}</span> Engineer bandwidth</button><small>${P.open.eng?'Collapse':'Expand'}</small></h3><div class="pl-eng" role="table" aria-label="Engineer bandwidth"><div class="pl-eng-h" role="row"><span>Engineer</span><span>Available</span><span>ABL</span><span>BTL</span><span>Load</span></div>${m.rows.length?m.rows.map(x=>{const pct=x.avail?Math.round((x.abl+x.btl)/x.avail*100):((x.abl+x.btl)?999:0),pa=x.avail?Math.round(x.abl/x.avail*100):0;
    return `<div class="pl-eng-r" role="row"><span class="pl-eng-n" title="${esc(x.name)}">${esc(x.name)}${x.cap&&(x.leave||x.holiday||x.oncall)?`<small>${[x.leave&&fmt(x.leave)+'d leave',x.holiday&&fmt(x.holiday)+'d holiday',x.oncall&&fmt(x.oncall)+'d on-call'].filter(Boolean).join(' · ')}</small>`:''}</span><span>${x.cap?fmt(x.avail):'—'}</span><span>${fmt(x.abl)}</span><span>${fmt(x.btl)}</span><span class="pl-load ${x.cap?tone(pct):'over'}"><i style="width:${Math.min(pct,100)}%"></i><em style="width:${Math.min(pa,100)}%"></em><b>${x.cap?(pct>=999?'—':pct+'%'):'unassigned'}</b></span></div>`;}).join(''):'<p class="note">No team members loaded.</p>'}</div></section></div>`;
}
function drawPlanner(){
  const el=P.el.querySelector('#pl-planner'),pl=P.plan,rel=P.refs.releases;
  const projOpts=sel=>pl.projects.map(p=>opt(p.id,p.name||'(unnamed project)',p.id===sel)).join('');
  const engOpts=sel=>'<option value="">Unassigned</option>'+P.members.filter(m=>H.leaderRank(m.name)<0).map(m=>opt(m.id,m.name,m.id===sel)).join('');
  const epic=e=>{const inGus=e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">In GUS ↗</a>`:'<em class="pl-draft">Draft</em>';
    return `<div class="pl-epic ${e.line==='ABL'?'abl':'btl'}" data-e="${esc(e.id)}"><div class="pl-epic-h">
    <select class="sp-select pl-pri" aria-label="Epic priority" data-f="priority">${priOpts(e.priority)}</select>
    <input class="hub-inline pl-ename" type="text" placeholder="Epic name" aria-label="Epic name" data-f="name" value="${esc(e.name)}" maxlength="255">
    <select class="sp-select" aria-label="Planned release" data-f="releaseId"><option value="">Planned release…</option>${rel.map(r=>opt(r.id,r.name,r.id===e.releaseId)).join('')}${e.releaseId&&!rel.some(r=>r.id===e.releaseId)?opt(e.releaseId,e.releaseName||e.releaseId,true):''}</select>
    <select class="sp-select" aria-label="Project" data-f="projectId">${projOpts(e.projectId)}</select>
    <span class="pl-line" role="group" aria-label="Line of prioritisation"><button type="button" class="${e.line==='ABL'?'on abl':''}" data-line="ABL" aria-pressed="${e.line==='ABL'}" title="Above the line: saved to GUS">ABL</button><button type="button" class="${e.line==='BTL'?'on btl':''}" data-line="BTL" aria-pressed="${e.line==='BTL'}" title="Below the line: stays in the dashboard">BTL</button></span>
    <span class="pl-eff" title="Sum of workstream days"><b data-eff>${fmt(epicDays(e))}</b> d</span>${inGus}
    <button type="button" class="pl-x" data-del-epic aria-label="Delete epic" title="Delete epic">×</button></div>
    <div class="pl-ws">${e.workstreams.map(w=>`<div class="pl-ws-r" data-w="${esc(w.id)}"><select class="sp-select pl-pri" aria-label="Workstream priority" data-f="priority">${priOpts(w.priority)}</select><input class="hub-inline" type="text" placeholder="Workstream" aria-label="Workstream" data-f="name" value="${esc(w.name)}" maxlength="120"><select class="sp-select" aria-label="Engineer" data-f="engId">${engOpts(w.engId)}</select><input class="hub-inline pl-days" type="number" min="0" max="1000" step="0.5" inputmode="decimal" placeholder="Days" aria-label="Effort in days" data-f="days" value="${w.days?fmt(w.days):''}"><input class="hub-inline" type="text" list="pl-sprints" placeholder="Tentative sprint" aria-label="Tentative sprint" data-f="sprint" value="${esc(w.sprint)}" maxlength="60"><button type="button" class="pl-x" data-del-ws aria-label="Delete workstream" title="Delete workstream">×</button></div>`).join('')}<button type="button" class="pl-add" data-add-ws>+ Workstream</button></div></div>`;};
  const V=P.view,prj=new Map(pl.projects.map(p=>[p.id,p])),q=V.q.trim().toLowerCase(),filtering=!!(q||V.release||V.line||V.eng||V.theme);
  const match=e=>{const p=prj.get(e.projectId);
    if(V.release&&e.releaseId!==V.release)return false;if(V.line&&e.line!==V.line)return false;
    if(V.eng&&!e.workstreams.some(w=>w.engId===V.eng))return false;if(V.theme&&themeOf(p)!==V.theme)return false;
    if(q&&!((e.name||'')+' '+(p&&p.name||'')+' '+e.workstreams.map(w=>w.name).join(' ')).toLowerCase().includes(q))return false;return true;};
  const shown=pl.epics.filter(match);
  const cnt=P.el.querySelector('#pl-count');if(cnt)cnt.textContent=filtering?`${shown.length} of ${pl.epics.length} epics`:`${pl.epics.length} epic${pl.epics.length===1?'':'s'}`;
  const gsum=es=>{const d=l=>fmt(es.filter(e=>e.line===l).reduce((a,e)=>a+epicDays(e),0));return `<span class="pl-gsum">${es.length} epic${es.length===1?'':'s'} · ABL ${d('ABL')}d · BTL ${d('BTL')}d</span>`;};
  const groupKey={release:e=>e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||'No planned release',line:e=>e.line==='ABL'?'Above the line (ABL)':'Below the line (BTL)',theme:e=>themeOf(prj.get(e.projectId))}[V.group];
  const proj=p=>{const es=shown.filter(e=>e.projectId===p.id),theme=themeOf(p);
    return `<section class="pl-proj" data-p="${esc(p.id)}"><div class="pl-proj-h">
    <input class="hub-inline pl-pname" type="text" list="pl-projects" placeholder="Project name (type to link an existing GUS project)" aria-label="Project name" data-f="name" value="${esc(p.name)}" maxlength="120">
    <input class="hub-inline pl-theme" type="text" placeholder="${esc(theme)}" aria-label="Theme or method" title="Theme / method (defaults to the project prefix)" data-f="theme" value="${esc(p.theme)}" maxlength="80">
    ${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">In GUS ↗</a>`:'<em class="pl-draft">New</em>'}
    <button type="button" class="button small" data-add-epic>+ Epic</button><button type="button" class="pl-x" data-del-proj aria-label="Delete project" title="Delete project">×</button></div>
    ${es.length?es.map(epic).join(''):`<p class="note pl-none">${pl.epics.some(e=>e.projectId===p.id)?'No epics match the filters.':'No epics yet. Add one to start planning.'}</p>`}</section>`;};
  const gridHtml=()=>{
    const order=new Map(pl.projects.map((p,i)=>[p.id,i])),key=e=>V.group==='project'?String(1e4+(order.has(e.projectId)?order.get(e.projectId):9999)):groupKey(e);
    const es=[...shown].sort((a,b)=>String(key(a)).localeCompare(String(key(b)),undefined,{numeric:true}));
    const sel=(f,html,lbl)=>`<select class="sp-select pl-g" aria-label="${lbl}" data-f="${f}">${html}</select>`;
    const rows=[];let last=null;
    es.forEach(e=>{
      if(V.group!=='project'&&key(e)!==last){last=key(e);const g=es.filter(x=>key(x)===last);rows.push(`<tr class="pl-g-grp"><td colspan="11"><b>${esc(last)}</b> ${gsum(g)}</td></tr>`);}
      const ws=e.workstreams.length?e.workstreams:[null];
      ws.forEach((w,j)=>{
        const first=j===0,tail=j===ws.length-1;
        const ep=first?`<td>${sel('projectId',projOpts(e.projectId),'Project')}</td><td>${sel('priority',priOpts(e.priority),'Epic priority')}</td><td><input class="hub-inline" type="text" aria-label="Epic name" data-f="name" value="${esc(e.name)}" maxlength="255" placeholder="Epic name"></td><td>${sel('releaseId',`<option value="">Planned release…</option>${rel.map(r=>opt(r.id,r.name,r.id===e.releaseId)).join('')}${e.releaseId&&!rel.some(r=>r.id===e.releaseId)?opt(e.releaseId,e.releaseName||e.releaseId,true):''}`,'Planned release')}</td><td><span class="pl-line" role="group" aria-label="Line"><button type="button" class="${e.line==='ABL'?'on abl':''}" data-line="ABL" aria-pressed="${e.line==='ABL'}">ABL</button><button type="button" class="${e.line==='BTL'?'on btl':''}" data-line="BTL" aria-pressed="${e.line==='BTL'}">BTL</button></span></td>`:'<td></td><td></td><td></td><td></td><td></td>';
        const wc=w?`<td data-w="${esc(w.id)}">${sel('priority',priOpts(w.priority),'Workstream priority')}</td><td data-w="${esc(w.id)}"><input class="hub-inline" type="text" aria-label="Workstream" data-f="name" value="${esc(w.name)}" maxlength="120" placeholder="Workstream"></td><td data-w="${esc(w.id)}">${sel('engId',engOpts(w.engId),'Engineer')}</td><td data-w="${esc(w.id)}"><input class="hub-inline pl-days" type="number" min="0" max="1000" step="0.5" aria-label="Effort in days" data-f="days" value="${w.days?fmt(w.days):''}" placeholder="Days"></td><td data-w="${esc(w.id)}"><input class="hub-inline" type="text" list="pl-sprints" aria-label="Tentative sprint" data-f="sprint" value="${esc(w.sprint)}" maxlength="60" placeholder="Sprint"></td>`:'<td></td><td></td><td></td><td></td><td></td>';
        const act=`<td class="pl-g-act">${w?`<span data-w="${esc(w.id)}"><button type="button" class="pl-x" data-del-ws aria-label="Delete workstream" title="Delete workstream">×</button></span>`:''}${tail?`<button type="button" class="pl-x pl-g-add" data-add-ws aria-label="Add workstream" title="Add workstream">+</button>`:''}${first?`<button type="button" class="pl-x" data-del-epic aria-label="Delete epic" title="Delete epic">🗑</button>`:''}</td>`;
        rows.push(`<tr data-e="${esc(e.id)}" class="${e.line==='ABL'?'abl':'btl'}${first?' pl-g-first':''}">${ep}${wc}${act}</tr>`);
      });
    });
    return `<div class="pl-grid-wrap"><table class="pl-grid"><thead><tr><th>Project</th><th>Epic P</th><th>Epic</th><th>Release</th><th>Line</th><th>WS P</th><th>Workstream</th><th>Engineer</th><th>Days</th><th>Sprint</th><th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="11" class="note">No epics match the filters.</td></tr>'}</tbody></table></div><button type="button" class="pl-add" data-grid-add-epic>+ Epic</button><p class="note">Project names are edited in Form view.</p>`;};
  el.innerHTML=`<datalist id="pl-projects">${P.refs.projects.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist><datalist id="pl-sprints">${P.refs.sprints.map(s=>`<option value="${esc(s.name)}"></option>`).join('')}</datalist>`+
    (!pl.projects.length?'<div class="empty-state hub-empty"><h3>No projects yet</h3><p>Add a project, then epics and workstreams with effort in days.</p></div>'
     :V.mode==='grid'?gridHtml()
     :V.group==='project'?(()=>{const ps=pl.projects.filter(p=>!filtering||shown.some(e=>e.projectId===p.id)||(q&&(p.name||'').toLowerCase().includes(q)&&!V.release&&!V.line&&!V.eng&&!V.theme));return ps.length?ps.map(proj).join(''):'<p class="note pl-none">No epics match the filters.</p>';})()
     :(()=>{const g=new Map();shown.forEach(e=>{const k=groupKey(e);if(!g.has(k))g.set(k,[]);g.get(k).push(e);});
       return g.size?[...g.entries()].sort((x,y)=>x[0].localeCompare(y[0],undefined,{numeric:true})).map(([k,es])=>`<section class="pl-proj pl-group"><div class="pl-group-h"><h4>${esc(k)}</h4>${gsum(es)}</div>${es.map(e=>`<div class="pl-gproj" title="Project">${esc((prj.get(e.projectId)||{}).name||'(no project)')}</div>${epic(e)}`).join('')}</section>`).join('')+'<p class="note">Switch to Group by Project to add epics or projects.</p>':'<p class="note pl-none">No epics match the filters.</p>';})());
}
const wire=()=>P.el.querySelectorAll('#pl-planner select:not(.pl-g)').forEach(s=>H.customSelect(s));
function drawTools(){
  const box=P.el.querySelector('#pl-tools'),pl=P.plan;if(!box||!pl)return;const V=P.view;
  const themes=[...new Set(pl.projects.map(themeOf))].sort(),engs=P.members.filter(m=>H.leaderRank(m.name)<0);
  const sel=(k,label,list)=>`<label class="pl-tf"><span>${label}</span><select class="sp-select" data-v="${k}" aria-label="${label}"><option value="">All</option>${list.map(([v,l])=>opt(v,l,V[k]===v)).join('')}</select></label>`;
  const rels=[...new Map(pl.epics.filter(e=>e.releaseId).map(e=>[e.releaseId,e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||e.releaseId])).entries()];
  box.innerHTML=`<label class="pl-tf pl-q"><span>Search</span><input type="search" class="hub-inline" data-v="q" placeholder="Epic, workstream or project…" aria-label="Search epics" value="${esc(V.q)}"></label>`+
    sel('release','Release',rels)+sel('line','Line',[['ABL','ABL'],['BTL','BTL']])+sel('eng','Engineer',engs.map(m=>[m.id,m.name]))+sel('theme','Theme',themes.map(t=>[t,t]))+
    `<label class="pl-tf"><span>Group by</span><select class="sp-select" data-v="group" aria-label="Group by">${[['project','Project'],['release','Planned release'],['line','ABL / BTL'],['theme','Theme']].map(([v,l])=>opt(v,l,V.group===v)).join('')}</select></label>`+
    `<span class="pl-mode" role="group" aria-label="View"><button type="button" data-mode="form" class="${V.mode==='form'?'on':''}" aria-pressed="${V.mode==='form'}">Form</button><button type="button" data-mode="grid" class="${V.mode==='grid'?'on':''}" aria-pressed="${V.mode==='grid'}">Grid</button></span><button type="button" class="button small" data-clear-view${V.q||V.release||V.line||V.eng||V.theme?'':' disabled'}>Clear filters</button><span class="note pl-count" id="pl-count"></span>`;
  box.querySelectorAll('select').forEach(x=>H.customSelect(x));
}
function draw(){drawSummary();drawTools();drawPlanner();wire();}

// ── Edits ───────────────────────────────────────────────────────────────────
const findE=id=>P.plan.epics.find(e=>e.id===id),findP=id=>P.plan.projects.find(p=>p.id===id);
const ctxOf=t=>{const w=t.closest('[data-w]'),e=t.closest('[data-e]'),p=t.closest('[data-p]');return {w:w&&w.dataset.w,e:e&&e.dataset.e,p:p&&p.dataset.p};};
function onInput(ev){
  const vt=ev.target.closest&&ev.target.closest('[data-v]');if(vt){P.view[vt.dataset.v]=vt.value;if(vt.dataset.v==='group'||vt.tagName==='SELECT')drawTools();drawPlanner();wire();return;}
  const t=ev.target.closest('[data-f]');if(!t||!P.plan)return;
  const f=t.dataset.f,c=ctxOf(t),v=t.value;let structural=false;
  if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!w)return;
    if(f==='days'){w.days=Math.max(0,Number(v)||0);const b=(t.closest('.pl-epic')||P.el).querySelector(`[data-e="${e.id}"] [data-eff]`)||t.closest('.pl-epic')?.querySelector('[data-eff]');if(b)b.textContent=fmt(epicDays(e));}
    else if(f==='priority')w.priority=v===''?null:Math.max(0,Math.round(Number(v)));
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
  const tb=t.closest('[data-tab]');if(tb){setTab(tb.dataset.tab);return;}
  const rp=t.closest('[data-rps]');if(rp){openRps(rp.dataset.rps,rp);return;}
  const fd=t.closest('[data-fold]');if(fd){P.open[fd.dataset.fold]=!P.open[fd.dataset.fold];drawSummary();return;}
  const md=t.closest('[data-mode]');if(md){P.view.mode=md.dataset.mode;drawTools();drawPlanner();wire();return;}
  if(t.closest('[data-grid-add-epic]')){if(!pl.projects.length)pl.projects.push({id:uid('p'),name:'',theme:'',gusId:''});const e={id:uid('e'),projectId:pl.projects[0].id,name:'',line:'BTL',priority:null,releaseId:'',releaseName:'',gusId:'',workstreams:[{id:uid('w'),name:'',priority:null,engId:'',engName:'',days:0,sprint:''}]};pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] input`)?.focus();return;}
  if(t.closest('[data-clear-view]')){P.view=Object.assign(P.view,{q:'',release:'',line:'',eng:'',theme:''});drawTools();drawPlanner();wire();return;}
  if(t.closest('#pl-leaves'))return openLeaves();
  if(t.closest('#pl-commit'))return openCommit();
  if(t.closest('[data-add-epic]')){const e={id:uid('e'),projectId:c.p,name:'',line:'BTL',priority:null,releaseId:'',releaseName:'',gusId:'',workstreams:[{id:uid('w'),name:'',priority:null,engId:'',engName:'',days:0,sprint:''}]};pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] .pl-ename`)?.focus();return;}
  if(t.closest('[data-add-ws]')){const e=findE(c.e);if(!e)return;const w={id:uid('w'),name:'',priority:null,engId:'',engName:'',days:0,sprint:''};e.workstreams.push(w);draw();queueSave();P.el.querySelector(`[data-w="${w.id}"] input`)?.focus();return;}
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
    <div class="pl-tabs" role="tablist" aria-label="Release planning views"><button type="button" role="tab" data-tab="plan" class="on" aria-selected="true">Planner</button><button type="button" role="tab" data-tab="rps" aria-selected="false">Release Planning Summary</button></div>
    <div id="pl-main"><div id="pl-sum"></div>
    <div class="pl-planner-h"><h3>Projects &amp; epics</h3><button type="button" class="button" id="pl-add-proj">+ Project</button></div><div id="pl-tools" class="pl-tools"></div><div id="pl-planner"></div></div><div id="pl-rps" hidden></div>`;
    P.tab='plan';
    el.oninput=onInput;
    el.onchange=ev=>{if(ev.target.closest('#pl-start,#pl-end')){const s=el.querySelector('#pl-start').value,e=el.querySelector('#pl-end').value;if(s&&e&&s<=e&&P.plan){P.plan.window={start:s,end:e};drawSummary();queueSave();}else if(s&&e&&s>e)window.toast?.('End date must be on or after the start date.',true);return;}onInput(ev);};
    el.onclick=onClick;load(el);
  }});
H.onEsc('plan',()=>{closeModal();return true;});
window.addEventListener('beforeunload',e=>{if(P.state==='dirty'||P.state==='saving'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hub:team',()=>{closeModal();clearTimeout(P.timer);});
})();
