/* Release Planning: engineers plan projects, epics and workstreams (effort in days), mark epics above/below the line (ABL/BTL),
 * and the dashboard derives planned vs available capacity live. The draft saves to GUS Apps; only ABL epics are written to GUS on confirm.
 * Every interpolated value in the templates below goes through esc() or is a number from fmt(). */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const P={plan:null,rev:null,refs:{releases:[],programs:[],projects:[],sprints:[]},members:[],seq:0,timer:0,state:'idle',stateAt:'',inflight:null,el:null};
P.open={theme:false,eng:false};
P.view={q:'',release:'',line:'',eng:'',theme:'',group:'project'};
// Grid columns: chooser order = default order; the first GDEF are shown until the user picks their own (saved in this browser).
const GCOL={project:'Project',name:'Epic Name',ws:'Workstream / Feature',owners:'Owner(s)',priority:'Priority',estimate:'Epic est.',status:'Status',engs:'Engineer(s)',days:'WS est.',sprint:'Sprint target',release:'Release',line:'Line',theme:'Theme',wstatus:'WS status',doc:'Doc',gus:'GUS',hrp:'HRP V2MOM method',v2mom:'CFS V2MOM'};
const GW={project:112,name:230,ws:200,owners:120,priority:84,estimate:84,status:116,engs:170,days:72,sprint:120,release:150,line:104,theme:130,wstatus:116,doc:150,gus:84,hrp:130,v2mom:130,act:92};
const GDEF=['project','name','ws','owners','priority','estimate','status','engs','days','sprint','release','line'],GKEY='pl-grid-cols';
const gridCols=()=>{let v=null;try{v=JSON.parse(localStorage.getItem(GKEY));}catch(_){}const keep=Array.isArray(v)?v.filter(k=>GCOL[k]):null;return keep&&keep.length?Object.keys(GCOL).filter(k=>keep.includes(k)):GDEF.slice();};
const setGridCols=l=>{try{if(l)localStorage.setItem(GKEY,JSON.stringify(l));else localStorage.removeItem(GKEY);}catch(_){}};
const priOpts=v=>{const n=v==null||v===''?0:Number(v),L=[0,1,2,3,4,5];if(!L.includes(n))L.push(n);return L.sort((a,b)=>a-b).map(x=>`<option value="${x}"${x===n?' selected':''}>P${x}</option>`).join('');};
const defRel=()=>{const r=P.refs.releases.find(x=>/(^|\D)268(\D|$)/.test(x.name||''));return r?{releaseId:r.id,releaseName:r.name}:{releaseId:'',releaseName:''};};
const newEpic=pid=>({id:uid('e'),projectId:pid,name:'',line:'BTL',priority:0,...defRel(),gusId:'',owners:[],ownerNames:[],workstreams:[{id:uid('w'),name:'',priority:0,engId:'',engName:'',engIds:[],engNames:[],days:0,sprint:''}]});
const prj0=e=>P.plan.projects.find(p=>p.id===e.projectId)||null;
const memName=id=>(P.members.find(m=>m.id===id)||{}).name||'';
const wsEngs=w=>w.engIds&&w.engIds.length?w.engIds:(w.engId?[w.engId]:[]);
const wsNames=w=>wsEngs(w).map(id=>memName(id)||(id===w.engId?w.engName:'')||'Engineer');
const shortProj=n=>/^[^:]{1,30}:/.test(n||'')?n.split(':')[0].trim():(n||'(unnamed project)');
const msLabel=(ids,empty)=>{const n=ids.map(memName).filter(Boolean);return n.length?(n.length>1?`${n[0].split(' ')[0]} +${n.length-1}`:n[0]):empty;};
const msel=(f,ids,label,empty)=>{const mem=P.members.filter(m=>H.leaderRank(m.name)<0);
  return `<div class="cs ms" data-ms="${f}"><button type="button" class="cs-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${label}" title="${esc(ids.map(memName).join(', '))}"><span>${esc(msLabel(ids,empty))}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg></button><ul class="cs-menu" role="listbox" aria-multiselectable="true">${mem.map(m=>`<li role="option" data-val="${esc(m.id)}" aria-selected="${ids.includes(m.id)}" class="${ids.includes(m.id)?'on':''}"><i aria-hidden="true">${ids.includes(m.id)?'✓':''}</i><span class="cs-t">${esc(m.name)}</span></li>`).join('')||'<li class="note">No team members</li>'}</ul></div>`;};
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
const epicDays=e=>{const t=r2(e.workstreams.reduce((a,w)=>a+(w.days||0),0));return t||r2(e.estimate||0);};
const epicTheme=e=>e.theme||themeOf((P.plan.projects.find(p=>p.id===e.projectId))||null);
const STAT=['Planned','In Progress','Completed','On Hold'];
const statOpts=v=>`<option value="">Status</option>`+STAT.map(x=>`<option value="${x}"${x===v?' selected':''}>${x}</option>`).join('');
const docOk=u=>/^https?:\/\//i.test(u||'');
function model(){
  const pl=P.plan,wd=workdays(pl.window.start,pl.window.end),prj=new Map(pl.projects.map(p=>[p.id,p]));
  const eng=new Map();
  const row=(id,name)=>{if(!eng.has(id))eng.set(id,{id,name,leave:0,holiday:0,oncall:0,avail:0,abl:0,btl:0,cap:true});return eng.get(id);};
  for(const m of P.members)if(H.leaderRank(m.name)<0){const x=row(m.id,m.name),pp=pl.people[m.id]||{};x.leave=pp.leave||0;x.holiday=pp.holiday||0;x.oncall=pp.oncall||0;x.avail=Math.max(0,wd-x.leave-x.holiday-x.oncall);}
  const themes=new Map();let ablT=0,btlT=0;
  for(const e of pl.epics){
    const slices=e.workstreams.filter(w=>(w.days||0)>0).map(w=>({ids:wsEngs(w),d:w.days,nm:w.engName}));
    if(!slices.length&&(e.estimate||0)>0)slices.push({ids:e.owners||[],d:e.estimate,nm:''});
    for(const {ids,d,nm} of slices){const share=d/(ids.length||1);
      for(const id of ids.length?ids:['']){const x=id?row(id,memName(id)||nm||'Engineer'):row('none','Unassigned');if(!id)x.cap=false;if(e.line==='ABL')x.abl+=share;else x.btl+=share;}
      const t=epicTheme(e);if(!themes.has(t))themes.set(t,{name:t,abl:0,btl:0});
      if(e.line==='ABL'){ablT+=d;themes.get(t).abl+=d;}else{btlT+=d;themes.get(t).btl+=d;}}
  }
  const rows=[...eng.values()],avail=rows.reduce((a,x)=>a+x.avail,0);
  return {wd,rows,avail,abl:r2(ablT),btl:r2(btlT),total:r2(ablT+btlT),themes:[...themes.values()].sort((a,b)=>(b.abl+b.btl)-(a.abl+a.btl))};
}
// ── Release Planning Summary (read-only roll-up of the plan) ───────────────
const TCOL=['#f59e0b','#2f6fdd','#12b981','#9333ea','#06b6d4','#e11d74','#6366f1','#84cc16','#64748b'];
const PCOL={0:'#b3261e',1:'#e8890c',2:'#1b73b3',3:'#6b7f93',b:'#b8c4d2'};
const bucketOf=e=>e.line!=='ABL'?'b':Math.min(e.priority==null?0:Number(e.priority)||0,3);
function rpsModel(){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p])),B={0:0,1:0,2:0,3:0,b:0},T=new Map();let abl=0;
  for(const e of pl.epics){const d=epicDays(e),b=bucketOf(e);B[b]+=d;
    if(e.line==='ABL'){abl+=d;const t=epicTheme(e);if(!T.has(t))T.set(t,{name:t,days:0,epics:0});const x=T.get(t);x.days+=d;x.epics++;}}
  return {B,abl:r2(abl),themes:[...T.values()].sort((a,b)=>b.days-a.days)};
}
const pctOf=(n,d)=>d?Math.round(n/d*100):0;
function drawRps(){
  const el=P.el&&P.el.querySelector('#pl-rps');if(!el||!P.plan)return;
  const m=rpsModel(),{B}=m,tot=m.abl,col=i=>TCOL[i%TCOL.length];
  const card=(k,label,val,sub,colr)=>`<button type="button" class="pl-rk" data-rps="${k}" style="--c:${colr}"><span>${label}</span><b>${fmt(val)}<small> d</small></b><em>${sub}</em><i>Full screen →</i></button>`;
  const pl=P.plan,M=model(),epics=pl.epics,rn=e=>e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||'No planned release';
  const rm=new Map();epics.forEach(e=>{const k=rn(e);if(!rm.has(k))rm.set(k,{name:k,n:0,abl:0,btl:0});const x=rm.get(k);x.n++;x[e.line==='ABL'?'abl':'btl']+=epicDays(e);});
  const byRel=[...rm.values()].sort((a,b)=>b.n-a.n),sm=new Map();epics.forEach(e=>sm.set(e.status||'No status',(sm.get(e.status||'No status')||0)+1));const byStat=[...sm.entries()];
  const noOwner=epics.filter(e=>!(e.owners||[]).length).length,noRel=epics.filter(e=>!e.releaseId).length,unas=epics.reduce((a,e)=>a+e.workstreams.filter(w=>!wsEngs(w).length).length,0),inGus=epics.filter(e=>e.gusId).length,load=M.avail?Math.round(M.total/M.avail*100):0;
  const hm=[['Epics',epics.length],['ABL / BTL',epics.filter(e=>e.line==='ABL').length+' / '+epics.filter(e=>e.line!=='ABL').length],['In GUS / draft',inGus+' / '+(epics.length-inGus)],['Capacity used',load+'%',load>100?'bad':''],['No owner',noOwner,noOwner?'warn':''],['No release',noRel,noRel?'warn':''],['Unassigned workstreams',unas,unas?'warn':'']];
  const prjm=new Map(pl.projects.map(p=>[p.id,p])),saved=epics.filter(e=>e.gusId),lc=pl.lastCommit&&pl.lastCommit.at?new Date(pl.lastCommit.at).toLocaleString():'';
  const owners=e=>(e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)).filter(Boolean).join(', ')||'—';
  const savedHtml=`<section class="pl-card pl-saved"><h3>Saved epics <small>${saved.length} of ${epics.length} in GUS${lc?' · last saved '+esc(lc):''}</small></h3>${epics.length?`<table class="pl-rps-t"><thead><tr><th>Project</th><th>Epic</th><th>Release</th><th>Line</th><th>GUS</th><th>Development Lead</th><th>Planned Story Points</th></tr></thead><tbody>${epics.map(e=>{const p=prjm.get(e.projectId)||{};return `<tr><td>${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">${esc(p.name||'project')} ↗</a>`:esc(p.name||'—')}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc(rn(e))}</td><td>${esc(e.line)}</td><td>${e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:'<em class="pl-draft">Not saved to GUS</em>'}</td><td>${esc(owners(e))}</td><td>${fmt(epicDays(e))}</td></tr>`;}).join('')}</tbody></table>`:'<p class="note">No epics yet.</p>'}</section>`;
  const pts=n=>fmt(n)+'p',ts=m.themes.filter(t=>t.days>0),tcol=n=>col(Math.max(0,m.themes.findIndex(t=>t.name===n)));
  const R=46,C=2*Math.PI*R;let off=0;
  const arcs=ts.map(t=>{const len=t.days/tot*C,a=`<circle class="pl-arc" data-rps="t:${esc(t.name)}" cx="60" cy="60" r="${R}" fill="none" stroke="${tcol(t.name)}" stroke-width="18" stroke-dasharray="${Math.max(0,len-1.2)} ${C-Math.max(0,len-1.2)}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${esc(t.name)}: ${pts(t.days)}</title></circle>`;off+=len;return a;}).join('');
  const donut=`<section class="pl-card pl-donut-card"><h3>Theme Payload Distribution</h3><p class="note">Click slice or theme to open full screen view</p>${ts.length?`<div class="pl-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Planned points by theme" style="stroke:none">${arcs}<text x="60" y="58" text-anchor="middle" class="pl-dn">${fmt(tot)}</text><text x="60" y="71" text-anchor="middle" class="pl-dl">PLANNED PTS</text></svg></div><h4 class="pl-sub">All themes (${ts.length})</h4><div class="pl-theme-leg">${ts.map(t=>`<button type="button" data-rps="t:${esc(t.name)}"><i style="background:${tcol(t.name)}"></i><span title="${esc(t.name)}">${esc(t.name)}</span><b>${pts(t.days)}</b></button>`).join('')}</div>`:'<p class="note">No above-the-line effort planned yet.</p>'}</section>`;
  const pl2=(k,label,val,c)=>`<button type="button" class="pl-plabel" data-rps="${k}" style="color:${c}">${label}: ${fmt(val)} Pts${k==='abl'||k==='btl'?'':` (${pctOf(val,tot)}%)`}</button>`;
  const seg=(b,l)=>B[b]>0?`<i style="width:${B[b]/((tot+B.b)||1)*100}%;background:${PCOL[b]}" title="${l}: ${fmt(B[b])} pts"></i>`:'';
  const prio=`<section class="pl-card pl-prio-card"><h3>Priority &amp; Strategic Investment Breakdown</h3><p class="note">High-level resource commitment across release goals</p>
    <div class="pl-plabels">${pl2('p0','P0 Critical Path',B[0],PCOL[0])}${pl2('p1','P1 High',B[1],PCOL[1])}${pl2('p2','P2 Medium',B[2],'#7c3aed')}${pl2('p3','P3+ Low',B[3],PCOL[3])}${pl2('btl','BTL Effort',B.b,PCOL[3])}</div>
    <div class="pl-pbar">${seg(0,'P0')}${seg(1,'P1')}${seg(2,'P2')}${seg(3,'P3+')}${seg('b','BTL')}</div>
    <h4 class="pl-sub">Strategic themes portfolio (${ts.length} theme${ts.length===1?'':'s'}) <small>Click any card to open full screen view</small></h4>
    <div class="pl-tcards">${ts.map(t=>`<button type="button" class="pl-tcard" data-rps="t:${esc(t.name)}" style="--c:${tcol(t.name)}"><span class="pl-tc-h"><b>${esc(t.name)}</b><em>${pts(t.days)} (${pctOf(t.days,tot)}%)</em></span><span class="pl-tc-bar"><i style="width:${pctOf(t.days,tot)}%"></i></span><span class="pl-tc-f"><small>${t.epics} Epic${t.epics===1?'':'s'}</small><u>Open Full Screen ⤢</u></span></button>`).join('')||'<p class="note">No themes yet.</p>'}</div></section>`;
  const prank=e=>e.priority==null?0:Number(e.priority)||0,ablEpics=epics.filter(e=>e.line==='ABL').sort((a,b)=>prank(a)-prank(b)||epicTheme(a).localeCompare(epicTheme(b)));
  const ecard=e=>{const ws=e.workstreams,own=owners(e),th=epicTheme(e);
    return `<button type="button" class="pl-ecard" data-rps="e:${esc(e.id)}"><span class="pl-ec-top"><em class="pl-ec-th" style="--c:${tcol(th)}">${esc(th)}</em><span><em class="pl-ec-p">P${prank(e)}</em><em class="pl-ec-pts">${fmt(epicDays(e))} pts</em></span></span><b class="pl-ec-n">${esc(e.name||'(unnamed)')}</b>
    <span class="pl-ec-ws"><span class="pl-ec-wh"><small>WORKSTREAMS</small><small>${ws.length} ITEM${ws.length===1?'':'S'}</small></span>${ws.slice(0,2).map(w=>`<span class="pl-ec-w"><span>• ${esc(w.name||'(unnamed)')}</span><i>${fmt(w.days||0)}p</i></span>`).join('')}${ws.length>2?`<small class="pl-ec-more">+ ${ws.length-2} more workstreams…</small>`:''}${ws.length?'':'<small class="pl-ec-more">No workstreams yet</small>'}</span>
    <span class="pl-ec-f"><small>${own==='—'?'Unassigned':esc(own)}</small><u>Open Full Screen ⤢</u></span></button>`;};
  const execHtml=`<section class="pl-card pl-exec${P.open.exec===false?' collapsed':''}"><h3><button type="button" class="pl-fold" data-fold="exec" aria-expanded="${P.open.exec!==false}"><span aria-hidden="true">${P.open.exec===false?'▸':'▾'}</span> Executive Epics Summary</button><small>${P.open.exec===false?'Expand':'Collapse'} Executive Overview</small></h3><p class="note">Showing ${ablEpics.length} epic${ablEpics.length===1?'':'s'} (above the line) · Click any epic to open full screen view</p>${P.open.exec===false?'':`<div class="pl-ecards">${ablEpics.map(ecard).join('')||'<p class="note">No above-the-line epics yet.</p>'}</div>`}</section>`;
  const health=`<section class="pl-card"><h3>Planning health</h3><div class="pl-hm">${hm.map(([l,v,t])=>`<div class="${t||''}"><b>${v}</b><span>${l}</span></div>`).join('')}</div></section>`;
  el.innerHTML=`<div class="pl-rps-top">${donut}${prio}</div>${health}${execHtml}${savedHtml}`;
}
function openRps(k,opener){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p]));let title,list;
  if(k.startsWith('e:')){const e=findE(k.slice(2));if(!e)return;
    openModal(e.name||'(unnamed epic)',`<p class="note">${esc(epicTheme(e))} · P${esc(e.priority==null?0:e.priority)} · ${esc(e.line)} · ${esc((prj.get(e.projectId)||{}).name||'—')} · ${fmt(epicDays(e))} pts</p><table class="pl-rps-t"><thead><tr><th>Workstream</th><th>Priority</th><th>Engineers</th><th>Sprint</th><th>Status</th><th>Days</th></tr></thead><tbody>${e.workstreams.map(w=>`<tr><td>${esc(w.name||'(unnamed)')}</td><td>P${esc(w.priority==null?0:w.priority)}</td><td>${esc(wsNames(w).join(', ')||'—')}</td><td>${esc(w.sprint||'—')}</td><td>${esc(w.status||'—')}</td><td>${fmt(w.days||0)}</td></tr>`).join('')||'<tr><td colspan="6" class="note">No workstreams yet.</td></tr>'}</tbody></table>`,opener);return;}
  if(k==='abl'){title='Total payload (ABL)';list=pl.epics.filter(e=>e.line==='ABL');}
  else if(k==='btl'){title='BTL effort';list=pl.epics.filter(e=>e.line!=='ABL');}
  else if(k[0]==='p'){title=(k[1]==='3'?'P3+':'P'+k[1])+' epics';list=pl.epics.filter(e=>bucketOf(e)===Number(k[1]));}
  else{const t=k.slice(2);title='Theme: '+t;list=pl.epics.filter(e=>e.line==='ABL'&&epicTheme(e)===t);}
  list=[...list].sort((a,b)=>(a.priority==null?0:a.priority)-(b.priority==null?0:b.priority));
  const eng=e=>[...new Set(e.workstreams.flatMap(wsNames))].join(', ')||'—';
  openModal(title,list.length?`<table class="pl-rps-t"><thead><tr><th>P</th><th>Epic</th><th>Project</th><th>Release</th><th>Line</th><th>Engineers</th><th>Days</th></tr></thead><tbody>${list.map(e=>`<tr><td>P${esc(e.priority==null?0:e.priority)}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc((prj.get(e.projectId)||{}).name||'—')}</td><td>${esc(e.releaseName||'—')}</td><td>${esc(e.line)}</td><td>${esc(eng(e))}</td><td>${fmt(epicDays(e))}</td></tr>`).join('')}</tbody></table>`:'<p class="note">No epics.</p>',opener);
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
  const V=P.view,prj=new Map(pl.projects.map(p=>[p.id,p])),q=V.q.trim().toLowerCase(),filtering=!!(q||V.release||V.line||V.eng||V.theme);
  const match=e=>{const p=prj.get(e.projectId);
    if(V.release&&e.releaseId!==V.release)return false;if(V.line&&e.line!==V.line)return false;
    if(V.eng&&!e.workstreams.some(w=>wsEngs(w).includes(V.eng)))return false;if(V.theme&&epicTheme(e)!==V.theme)return false;
    if(q&&!((e.name||'')+' '+(p&&p.name||'')+' '+e.workstreams.map(w=>w.name).join(' ')).toLowerCase().includes(q))return false;return true;};
  const shown=pl.epics.filter(match);
  const cnt=P.el.querySelector('#pl-count');if(cnt)cnt.textContent=filtering?`${shown.length} of ${pl.epics.length} epics`:`${pl.epics.length} epic${pl.epics.length===1?'':'s'}`;
  const gsum=es=>{const d=l=>fmt(es.filter(e=>e.line===l).reduce((a,e)=>a+epicDays(e),0));return `<span class="pl-gsum">${es.length} epic${es.length===1?'':'s'} · ABL ${d('ABL')}d · BTL ${d('BTL')}d</span>`;};
  const groupKey={release:e=>e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||'No planned release',line:e=>e.line==='ABL'?'Above the line (ABL)':'Below the line (BTL)',theme:e=>epicTheme(e)}[V.group];
  const cols=gridCols();
  const gridHtml=()=>{
    const order=new Map(pl.projects.map((p,i)=>[p.id,i])),key=e=>V.group==='project'?String(1e4+(order.has(e.projectId)?order.get(e.projectId):9999)):groupKey(e);
    const es=[...shown].sort((a,b)=>String(key(a)).localeCompare(String(key(b)),undefined,{numeric:true}));
    const sel=(f,html,lbl)=>`<select class="sp-select pl-g" aria-label="${lbl}" data-f="${f}">${html}</select>`;
    const rows=[];let last=null;
    es.forEach(e=>{
      if(V.group!=='project'&&key(e)!==last){last=key(e);const g=es.filter(x=>key(x)===last);rows.push(`<tr class="pl-g-grp"><td colspan="${cols.length+1}"><b>${esc(last)}</b> ${gsum(g)}</td></tr>`);}
      const ws=e.workstreams.length?e.workstreams:[null];
      ws.forEach((w,j)=>{
        const first=j===0,tail=j===ws.length-1;
        const txt=(f,v,ph,max,w2)=>`<input class="hub-inline" type="text" aria-label="${ph}" data-f="${f}" value="${esc(v||'')}" maxlength="${max}" placeholder="${ph}" style="width:${w2}px">`;
        const tdE=(k,h)=>first?`<td class="c-${k}">${h}</td>`:`<td class="c-${k}"></td>`,tdW=(k,h)=>w?`<td class="c-${k}" data-w="${esc(w.id)}">${h}</td>`:`<td class="c-${k}"></td>`;
        const C={
          project:()=>tdE('project',sel('projectId',pl.projects.map(p=>`<option value="${esc(p.id)}" data-short="${esc(shortProj(p.name))}"${p.id===e.projectId?' selected':''}>${esc(p.name||'(unnamed project)')}</option>`).join(''),'Project')),
          name:()=>tdE('name',`<input class="hub-inline" type="text" aria-label="Epic name" data-f="name" value="${esc(e.name)}" maxlength="255" placeholder="Epic name">`),
          ws:()=>tdW('ws',`<input class="hub-inline" type="text" aria-label="Workstream" data-f="name" value="${esc(w&&w.name)}" maxlength="120" placeholder="Workstream">`),
          owners:()=>tdE('owners',msel('owners',e.owners||[],'Epic owners','Owners')),
          priority:()=>tdE('priority',sel('priority',priOpts(e.priority),'Epic priority')),
          estimate:()=>tdE('estimate',`<input class="hub-inline pl-days" type="number" min="0" max="5000" step="0.5" aria-label="Epic estimate" data-f="estimate" value="${e.estimate?fmt(e.estimate):''}" placeholder="${fmt(epicDays(e))}" title="Epic estimate (used when workstreams have no days)">`),
          status:()=>tdE('status',sel('status',statOpts(e.status),'Epic status')),
          engs:()=>tdW('engs',msel('engIds',w?wsEngs(w):[],'Engineers','Unassigned')),
          days:()=>tdW('days',`<input class="hub-inline pl-days" type="number" min="0" max="1000" step="0.5" aria-label="Effort in days" data-f="days" value="${w&&w.days?fmt(w.days):''}" placeholder="Days">`),
          sprint:()=>tdW('sprint',`<input class="hub-inline" type="text" list="pl-sprints" aria-label="Tentative sprint" data-f="sprint" value="${esc(w&&w.sprint)}" maxlength="60" placeholder="Sprint">`),
          release:()=>tdE('release',sel('releaseId',`<option value="">Planned release…</option>${rel.map(r=>opt(r.id,r.name,r.id===e.releaseId)).join('')}${e.releaseId&&!rel.some(r=>r.id===e.releaseId)?opt(e.releaseId,e.releaseName||e.releaseId,true):''}`,'Planned release')),
          line:()=>tdE('line',`<span class="pl-line" role="group" aria-label="Line"><button type="button" class="${e.line==='ABL'?'on abl':''}" data-line="ABL" aria-pressed="${e.line==='ABL'}">ABL</button><button type="button" class="${e.line==='BTL'?'on btl':''}" data-line="BTL" aria-pressed="${e.line==='BTL'}">BTL</button></span>`),
          theme:()=>tdE('theme',txt('theme',e.theme,themeOf(prj0(e)),80,110)),
          wstatus:()=>tdW('wstatus',sel('status',statOpts(w&&w.status),'Workstream status')),
          doc:()=>tdE('doc',txt('doc',e.doc,'Doc link',300,120)+(docOk(e.doc)?` <a href="${esc(e.doc)}" target="_blank" rel="noopener" aria-label="Open doc">↗</a>`:'')),
          gus:()=>tdE('gus',e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">Draft</em>'),
          hrp:()=>tdE('hrp',txt('hrp',e.hrp,'HRP method',80,90)),
          v2mom:()=>tdE('v2mom',txt('v2mom',e.v2mom,'CFS V2MOM',80,80))
        };
        const ep=cols.map(k=>C[k]()).join(''),wc='';
        const act=`<td class="pl-g-act">${w?`<span data-w="${esc(w.id)}"><button type="button" class="pl-x" data-del-ws aria-label="Delete workstream" title="Delete workstream">×</button></span>`:''}${tail?`<button type="button" class="pl-x pl-g-add" data-add-ws aria-label="Add workstream" title="Add workstream">+</button>`:''}${first?`<button type="button" class="pl-x" data-del-epic aria-label="Delete epic" title="Delete epic">🗑</button>`:''}</td>`;
        rows.push(`<tr data-e="${esc(e.id)}" class="${e.line==='ABL'?'abl':'btl'}${first?' pl-g-first':''}">${ep}${wc}${act}</tr>`);
      });
    });
    const strip=`<div class="pl-pstrip" aria-label="Projects">${pl.projects.map(p=>`<span class="pl-pchip" data-p="${esc(p.id)}"><input class="hub-inline pl-pname" type="text" list="pl-projects" placeholder="Project name (type to link a GUS project)" aria-label="Project name" data-f="name" value="${esc(p.name)}" maxlength="120">${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">New</em>'}<button type="button" class="pl-x" data-add-epic aria-label="Add epic to this project" title="Add epic to this project">+</button><button type="button" class="pl-x" data-del-proj aria-label="Delete project" title="Delete project">×</button></span>`).join('')}</div>`;
    return strip+`<div class="pl-grid-tools"><span class="pl-cols"><button type="button" class="button" data-cols-toggle aria-haspopup="true" aria-expanded="${P.colsOpen?'true':'false'}">Columns ▾</button>${P.colsOpen?`<div class="pl-cols-menu" role="menu">${Object.keys(GCOL).map(k=>`<label><input type="checkbox" data-col="${k}"${cols.includes(k)?' checked':''}> ${esc(GCOL[k])}</label>`).join('')}<button type="button" class="pl-cols-reset" data-cols-reset>Reset to default</button></div>`:''}</span></div><div class="pl-grid-wrap"><table class="pl-grid"><colgroup>${cols.map(k=>`<col class="${k==='name'||k==='ws'?'w-grow':'w-fit'}">`).join('')}<col class="w-fit"></colgroup><thead><tr>${cols.map(k=>`<th class="c-${k}">${esc(GCOL[k])}</th>`).join('')}<th></th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="${cols.length+1}" class="note">No epics match the filters.</td></tr>'}</tbody></table></div><button type="button" class="pl-add" data-grid-add-epic>+ Epic</button>`;};
  el.innerHTML=`<datalist id="pl-projects">${P.refs.projects.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist><datalist id="pl-sprints">${P.refs.sprints.map(s=>`<option value="${esc(s.name)}"></option>`).join('')}</datalist>`+
    (!pl.projects.length?'<div class="empty-state hub-empty"><h3>No projects yet</h3><p>Add a project, then epics and workstreams with effort in days.</p></div>'
     :gridHtml());
}
const wire=()=>P.el.querySelectorAll('#pl-planner select').forEach(s=>H.customSelect(s));
function drawTools(){
  const box=P.el.querySelector('#pl-tools'),pl=P.plan;if(!box||!pl)return;const V=P.view;
  const themes=[...new Set(pl.epics.map(epicTheme))].sort(),engs=P.members.filter(m=>H.leaderRank(m.name)<0);
  const sel=(k,label,list)=>`<label class="pl-tf"><span>${label}</span><select class="sp-select" data-v="${k}" aria-label="${label}"><option value="">All</option>${list.map(([v,l])=>opt(v,l,V[k]===v)).join('')}</select></label>`;
  const rels=[...new Map(pl.epics.filter(e=>e.releaseId).map(e=>[e.releaseId,e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||e.releaseId])).entries()];
  box.innerHTML=`<label class="pl-tf pl-q"><span>Search</span><input type="search" class="hub-inline" data-v="q" placeholder="Epic, workstream or project…" aria-label="Search epics" value="${esc(V.q)}"></label>`+
    sel('release','Release',rels)+sel('line','Line',[['ABL','ABL'],['BTL','BTL']])+sel('eng','Engineer',engs.map(m=>[m.id,m.name]))+sel('theme','Theme',themes.map(t=>[t,t]))+
    `<label class="pl-tf"><span>Group by</span><select class="sp-select" data-v="group" aria-label="Group by">${[['project','Project'],['release','Planned release'],['line','ABL / BTL'],['theme','Theme']].map(([v,l])=>opt(v,l,V.group===v)).join('')}</select></label>`+
    `<button type="button" class="button small" data-clear-view${V.q||V.release||V.line||V.eng||V.theme?'':' disabled'}>Clear filters</button><span class="note pl-count" id="pl-count"></span>`;
  box.querySelectorAll('select').forEach(x=>H.customSelect(x));
}
function draw(){drawSummary();drawTools();drawPlanner();wire();}

const closeMs=()=>document.querySelectorAll('.ms.open').forEach(w=>{w.classList.remove('open');w.querySelector('.cs-btn').setAttribute('aria-expanded','false');});
document.addEventListener('click',e=>{if(!e.target.closest('.ms'))closeMs();
  const w=e.target.closest('.pl-grid .cs.open,.pl-grid .ms.open');if(w){const b=w.querySelector('.cs-btn'),m=w.querySelector('.cs-menu'),r=b.getBoundingClientRect();m.style.position='fixed';m.style.left=Math.min(r.left,innerWidth-m.offsetWidth-8)+'px';m.style.right='auto';m.style.top=(r.bottom+4>innerHeight-200?Math.max(8,r.top-m.offsetHeight-4):r.bottom+4)+'px';}});
addEventListener('scroll',ev=>{if(ev.target.closest&&ev.target.closest('.cs-menu'))return;document.querySelectorAll('.pl-grid .cs.open').forEach(w=>{w.classList.remove('open');});closeMs();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMs();});
// ── Edits ───────────────────────────────────────────────────────────────────
const findE=id=>P.plan.epics.find(e=>e.id===id),findP=id=>P.plan.projects.find(p=>p.id===id);
const ctxOf=t=>{const w=t.closest('[data-w]'),e=t.closest('[data-e]'),p=t.closest('[data-p]');return {w:w&&w.dataset.w,e:e&&e.dataset.e,p:p&&p.dataset.p};};
function onInput(ev){
  const ct=ev.target.closest&&ev.target.closest('[data-col]');if(ct){const cur=gridCols(),k=ct.dataset.col,n=ct.checked?[...cur,k]:cur.filter(x=>x!==k);if(n.length)setGridCols(n);drawPlanner();wire();return;}
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
    else if(f==='estimate'){e.estimate=Math.max(0,Number(v)||0);const b=P.el.querySelector(`[data-e="${e.id}"] [data-eff]`);if(b)b.textContent=fmt(epicDays(e));}
    else if(f==='doc')e.doc=/^https?:\/\//i.test(v)||v===''?v:e.doc;
    else if(f==='releaseId'){e.releaseId=v;e.releaseName=(P.refs.releases.find(r=>r.id===v)||{}).name||'';}
    else if(f==='projectId'){e.projectId=v;structural=true;}
    else e[f]=v;}
  else if(c.p){const p=findP(c.p);if(!p)return;
    if(f==='name'){p.name=v;const hit=P.refs.projects.find(x=>x.name===v);if(hit){p.gusId=hit.id;p.programId=hit.programId;p.programName=hit.programName;structural=true;}else if(p.gusId){p.gusId='';}}
    else p[f]=v;}
  if(structural&&ev.type==='change')draw();else drawSummary();
  queueSave();
}
function toggleFs(force){
  const box=P.el&&P.el.querySelector('#pl-fs');if(!box)return;const on=force==null?!box.classList.contains('pl-fs-on'):force;
  box.classList.toggle('pl-fs-on',on);document.body.classList.toggle('pl-fs-lock',on);
  const b=box.querySelector('#pl-fs-btn');if(b){b.textContent=on?'Exit full screen':'Full screen';b.setAttribute('aria-pressed',String(on));}
  try{if(on&&!document.fullscreenElement&&box.requestFullscreen)box.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(_){}
}
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)toggleFs(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.pl-fs-on')&&!document.querySelector('.cs.open,.ms.open')){toggleFs(false);e.stopImmediatePropagation();}},true);
function onClick(ev){
  const t=ev.target,c=ctxOf(t),pl=P.plan;
  if(t.closest('#pl-fs-btn'))return toggleFs();
  if(t.closest('[data-cols-toggle]')){P.colsOpen=!P.colsOpen;drawPlanner();wire();return;}
  if(t.closest('[data-cols-reset]')){setGridCols(null);drawPlanner();wire();return;}
  if(P.colsOpen&&!t.closest('.pl-cols')){P.colsOpen=false;drawPlanner();wire();}
  if(t.closest('[data-reload]'))return load(P.el);
  if(t.closest('[data-retry]'))return flush();
  if(!pl)return;
  if(t.closest('#pl-add-proj')){pl.projects.push({id:uid('p'),name:'',theme:'',gusId:''});draw();queueSave();const n=P.el.querySelectorAll('.pl-pname');n[n.length-1]?.focus();return;}
  const mb=t.closest('.ms .cs-btn');if(mb){const w=mb.closest('.ms'),was=w.classList.contains('open');closeMs();if(!was){w.classList.add('open');mb.setAttribute('aria-expanded','true');}return;}
  const ml=t.closest('.ms li[data-val]');if(ml){const wd=ml.closest('.ms'),f=wd.dataset.ms,id=ml.dataset.val;
    const tog=a=>a.includes(id)?a.filter(x=>x!==id):[...a,id];let ids;
    if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!w)return;ids=tog(wsEngs(w));w.engIds=ids;w.engId=ids[0]||'';w.engName=memName(ids[0]);}
    else if(c.e){const e=findE(c.e);if(!e)return;ids=tog(e.owners||[]);e.owners=ids;e.ownerNames=ids.map(memName);}
    else return;
    wd.querySelectorAll('li[data-val]').forEach(li=>{const on=ids.includes(li.dataset.val);li.classList.toggle('on',on);li.setAttribute('aria-selected',on);li.firstElementChild.textContent=on?'✓':'';});
    const b=wd.querySelector('.cs-btn');b.firstElementChild.textContent=msLabel(ids,f==='owners'?'Owners':'Unassigned');b.title=ids.map(memName).join(', ');
    drawSummary();queueSave();return;}
  const tb=t.closest('[data-tab]');if(tb){setTab(tb.dataset.tab);return;}
  const rp=t.closest('[data-rps]');if(rp){openRps(rp.dataset.rps,rp);return;}
  const fd=t.closest('[data-fold]');if(fd){P.open[fd.dataset.fold]=!P.open[fd.dataset.fold];drawSummary();return;}
  if(t.closest('[data-grid-add-epic]')){if(!pl.projects.length)pl.projects.push({id:uid('p'),name:'',theme:'',gusId:''});const e=newEpic(pl.projects[0].id);pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] input`)?.focus();return;}
  if(t.closest('[data-clear-view]')){P.view=Object.assign(P.view,{q:'',release:'',line:'',eng:'',theme:''});drawTools();drawPlanner();wire();return;}
  if(t.closest('#pl-save')){const b=t.closest('#pl-save');b.disabled=true;P.state='dirty';flush().then(()=>{b.disabled=false;if(P.state==='saved')window.toast?.('Plan saved to GUS Apps for the whole team.');else window.toast?.('Could not save the plan.',true);},()=>{b.disabled=false;});return;}
  if(t.closest('#pl-leaves'))return openLeaves();
  if(t.closest('#pl-commit'))return openCommit(false);
  if(t.closest('[data-add-epic]')){const e=newEpic(c.p);pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] .pl-ename`)?.focus();return;}
  if(t.closest('[data-add-ws]')){const e=findE(c.e);if(!e)return;const w={id:uid('w'),name:'',priority:0,engId:'',engName:'',engIds:[],engNames:[],days:0,sprint:''};e.workstreams.push(w);draw();queueSave();P.el.querySelector(`[data-w="${w.id}"] input`)?.focus();return;}
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
async function openCommit(btl){
  const opener=document.getElementById('pl-commit');await flush();
  if(P.state==='conflict'||P.state==='error')return window.toast?.('Resolve the save problem before saving to GUS.',true);
  const el=openModal('Save to GUS','<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Checking the plan…</div>',opener);
  try{
    const {preview}=await call('plan-commit',{teamId:H.team.Id,confirm:false,includeBtl:!!btl}),it=preview.items,bl=preview.blockers.length;
    el.querySelector('#pl-mb').innerHTML=`<label class="pl-btl-opt"><input type="checkbox" id="pl-incl-btl"${btl?' checked':''}> Also save below-the-line (BTL) epics to GUS</label><p class="note">${it.length?`${it.length} epic(s) above the line will be saved to GUS.`:'No epics are above the line (ABL) yet.'} ${preview.skipped?`${preview.skipped} below-the-line epic(s) stay in the dashboard.`:''}</p>
    ${it.length?`<div class="pl-review">${it.map(x=>`<div class="pl-review-r${x.problems.length?' bad':''}"><b>${esc(x.name||'(unnamed epic)')}</b><span>${x.action==='update'?'Update existing':'Create'} · project ${esc(x.project||'—')}${x.projectAction==='create-or-link'?' (created or linked)':''} · program ${esc(x.program||'—')}</span><span>Release ${esc(x.release||'—')} · priority ${x.priority==null?'—':esc(x.priority)} · planned effort ${fmt(x.effort)} days</span>${x.problems.map(p=>`<em>⚠ ${esc(p)}</em>`).join('')}</div>`).join('')}</div>`:''}
    <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-confirm" ${bl||!it.length?'disabled':''}>Create in GUS</button></div>`;
    el.querySelector('#pl-incl-btl').onchange=ev=>{closeModal();openCommit(ev.target.checked);};
    el.querySelector('#pl-confirm').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Saving to GUS…';
      try{const r=await call('plan-commit',{teamId:H.team.Id,confirm:true,includeBtl:!!btl});showResult(r);}catch(err){el.querySelector('#pl-mb').insertAdjacentHTML('afterbegin',`<p class="nd-msg error">${esc(err.message)}</p>`);b.disabled=false;b.textContent='Create in GUS';}};
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
H.register({id:'plan',label:'Release Planning (Quarterly)',icon:'plan',tone:'green',desc:'Plan projects, epics and effort against team capacity',needsTeam:true,
  stat:()=>({text:'Planned vs available capacity, ABL and BTL'}),
  render(el){
    P.el=el;
    el.innerHTML=`<div class="executive-heading"><div><h2>${icon('plan','green')} Release Planning (Quarterly)</h2><p>Plan projects, epics and workstreams for ${esc(H.team.Name)}. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.</p></div><div class="heading-actions"><span id="pl-state" class="pl-state" role="status" aria-live="polite"></span><button type="button" class="button" id="pl-save" title="Save your entries to the shared GUS Apps backend (also saved automatically)">Save</button><button type="button" class="button" id="pl-leaves">Leaves, holidays &amp; on-call</button><button type="button" class="button primary" id="pl-commit">Review &amp; save to GUS</button></div></div>
    <div class="pl-window"><label class="pl-team">Team <select class="hub-inline" id="pl-team" aria-label="Team whose release plan this is">${(H.teams||[]).map(t=>`<option value="${esc(t.Id)}"${t.Id===H.team.Id?' selected':''}>${esc(t.short||t.Name)}</option>`).join('')}</select></label><span class="pl-sep" aria-hidden="true"></span><label>Planning window <input type="date" class="hub-inline" id="pl-start" aria-label="Window start"></label><span aria-hidden="true">→</span><input type="date" class="hub-inline" id="pl-end" aria-label="Window end"><span class="note" id="pl-last"></span></div><div id="pl-warn"></div>
    <div class="pl-tabs" role="tablist" aria-label="Release planning views"><button type="button" role="tab" data-tab="plan" class="on" aria-selected="true">Release Planner</button><button type="button" role="tab" data-tab="rps" aria-selected="false">Planned Release Summary</button></div>
    <div id="pl-main"><div id="pl-sum"></div>
    <section id="pl-fs" class="pl-fs"><div class="pl-planner-h"><h3>Projects &amp; epics</h3><span class="pl-planner-btns"><button type="button" class="button" id="pl-fs-btn" aria-pressed="false" title="Show Projects &amp; epics full screen">Full screen</button><button type="button" class="button" id="pl-add-proj">+ Project</button></span></div><div id="pl-tools" class="pl-tools"></div><div id="pl-planner"></div></section></div><div id="pl-rps" hidden></div>`;
    el.querySelector('#pl-team').addEventListener('change',e=>H.setTeam(e.target.value));
    P.tab='plan';
    el.oninput=onInput;
    el.onchange=ev=>{if(ev.target.closest('#pl-start,#pl-end')){const s=el.querySelector('#pl-start').value,e=el.querySelector('#pl-end').value;if(s&&e&&s<=e&&P.plan){P.plan.window={start:s,end:e};drawSummary();queueSave();}else if(s&&e&&s>e)window.toast?.('End date must be on or after the start date.',true);return;}onInput(ev);};
    el.onclick=onClick;load(el);
  }});
H.onEsc('plan',()=>{closeModal();return true;});
window.addEventListener('beforeunload',e=>{if(P.state==='dirty'||P.state==='saving'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hub:team',()=>{closeModal();clearTimeout(P.timer);});
})();
