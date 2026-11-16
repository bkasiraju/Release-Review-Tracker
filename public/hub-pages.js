/* Hub pages backed by GUS: Bugs, Team Dependencies, Rotations. Each registers itself with Hub. */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const chipBtn=(attr,val,label,on)=>`<button class="hub-chip${on?' on':''}" ${attr}="${esc(val)}" aria-pressed="${on}">${esc(label)}</button>`;
const loading=el=>{el.innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading from GUS…</div>';};
const failed=(el,e)=>{el.innerHTML=`<div class="empty-state hub-empty"><h3>Could not load from GUS</h3><p>${esc(e.message)}</p></div>`;};
const heading=(ic,tone,title,sub,actions='')=>`<div class="executive-heading"><div><h2>${icon(ic,tone)} ${esc(title)}</h2><p>${esc(sub)}</p></div><div class="heading-actions">${actions}</div></div>`;
const age=d=>{const n=Math.floor((Date.now()-new Date(d))/864e5);return n<1?'today':n+'d';};
const refreshBtn='<button class="button primary" data-refresh title="Reload from GUS"><span data-icon3d="sync" data-tone="blue"></span> Refresh</button>';
const edits={fn:null,bound:new WeakSet()};
// Hub pages share one container: bind the edit listener once and route to the active page.
const bindPage=(el,fn)=>{edits.fn=fn;if(!edits.bound.has(el)){edits.bound.add(el);H.bindEdit(el,(...a)=>edits.fn&&edits.fn(...a));}};
const withIcons=el=>el.querySelectorAll('[data-icon3d]').forEach(n=>{n.outerHTML=icon(n.dataset.icon3d,n.dataset.tone);});

// ── Bugs (Trust Champion–style SLA board) ───────────────────────────────────
let bugTeam='';
const B={pri:new Set(['P0','P1','P2']),closed:false,status:'',who:'',q:'',bugs:[],sla:[],champ:null,members:[],pick:null,sel:'all',pg:1,size:25,seq:0,wk:null,wkSeq:0,trendData:null};
const PCLS=p=>p==='P0'?'rem':p==='P1'?'warn':'add';
const STATES={breached:'Breached',risk:'At risk',warn:'Warning',ok:'Within SLA'};
const inMember=b=>!B.who||(B.who==='none'?!b.assigneeId:b.assigneeId===B.who);
const bugRows=()=>{const q=B.q.toLowerCase();return (B.wk&&B.wk.bugs||B.bugs).filter(b=>inMember(b)&&(!B.status||b.status===B.status)&&(!q||(b.name+' '+b.subject).toLowerCase().includes(q)));};
const remaining=i=>i.remaining==null?'—':i.remaining<0?`${i.remaining.toFixed(1)}d (overdue)`:`${i.remaining.toFixed(1)}d`;
const statusSel=(b,pick)=>`<select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(b.id)}" data-field="Status__c" data-prev="${esc(b.status)}" data-label="${esc(b.name)} status" aria-label="Status of ${esc(b.name)}">${H.options(pick?pick.workStatus:[],b.status)}</select>`;
const whoSel=b=>`<select class="hub-inline" data-edit="ADM_Work__c" data-type="ref" data-id="${esc(b.id)}" data-field="Assignee__c" data-prev="${esc(b.assigneeId||'')}" data-label="${esc(b.name)} assignee" aria-label="Assignee of ${esc(b.name)}"><option value="">Unassigned</option>${B.members.map(m=>`<option value="${esc(m.id)}"${m.id===b.assigneeId?' selected':''}>${esc(m.name)}</option>`).join('')}${b.assigneeId&&!B.members.some(m=>m.id===b.assigneeId)?`<option value="${esc(b.assigneeId)}" selected>${esc(b.assignee)}</option>`:''}</select>`;
const link=b=>`<a class="bug-link" href="${H.GUS}ADM_Work__c/${esc(b.id)}/view" target="_blank" rel="noopener noreferrer">${esc(b.name)}</a>${H.nudgeBtn(b)}`;
function cardCounts(c){
  const items=c.items.filter(inMember);
  if(c.id==='perdev'){const over=new Set(items.map(i=>i.assigneeId)).size;return {a:over,b:B.who?(over?0:1):c.ok,la:'Over',lb:'OK',items,cls:['breached','ok']};}
  const n=s=>items.filter(i=>i.state===s).length;return {a:n('breached'),b:n('risk')+n('warn'),c:n('ok'),la:'Breached',lb:'At risk',lc:'OK',items,cls:['breached','risk','ok']};
}
/** Pager shared by both bug tables: slices to the current page and renders Prev/Next plus a page-size picker. */
function bugPage(all){const pages=Math.max(1,Math.ceil(all.length/B.size));B.pg=Math.min(Math.max(B.pg,1),pages);return all.slice((B.pg-1)*B.size,B.pg*B.size);}
function bugPager(total){
  if(total<=25)return '';
  const pages=Math.ceil(total/B.size),from=(B.pg-1)*B.size+1,to=Math.min(total,B.pg*B.size);
  return `<div class="tf-pager" role="navigation" aria-label="Bug pages"><span>${from}–${to} of ${total}</span><label>Per page <select class="hub-inline" data-bug-size aria-label="Rows per page">${[25,50,100].map(n=>`<option${n===B.size?' selected':''}>${n}</option>`).join('')}</select></label><button type="button" class="button small" data-bug-page="${B.pg-1}" ${B.pg<=1?'disabled':''}>‹ Prev</button><b>Page ${B.pg} / ${pages}</b><button type="button" class="button small" data-bug-page="${B.pg+1}" ${B.pg>=pages?'disabled':''}>Next ›</button></div>`;
}
function drawTiles(el){
  const tiles=B.sla.map(c=>{const k=cardCounts(c),on=B.sel===c.id;
    const nums=k.c==null?`<span class="sla-n breached"><b>${k.a}</b>${k.la}</span><span class="sla-n ok"><b>${k.b}</b>${k.lb}</span>`:`<span class="sla-n breached"><b>${k.a}</b>${k.la}</span><span class="sla-n risk"><b>${k.b}</b>${k.lb}</span><span class="sla-n ok"><b>${k.c}</b>${k.lc}</span>`;
    return `<button class="sla-tile${on?' on':''}${k.a?' bad':''}" data-sla="${c.id}" aria-pressed="${on}"><strong>${esc(c.label)}</strong><small>${esc(c.note)}</small><span class="sla-nums">${nums}</span></button>`;}).join('')+
    `<div class="sla-tile soon" aria-disabled="true"><strong>Code coverage</strong><small>Aggregate · target 70%</small><span class="sla-nums"><span class="sla-n"><b>—</b>Coming soon</span></span></div>`;
  el.querySelector('#sla-tiles').innerHTML=tiles;
}
function drawQueue(el){
  const host=el.querySelector('#bug-queue'),pr=B.pick?B.pick.priority:['P0','P1','P2','P3','P4'];
  const card=B.sla.find(c=>c.id===B.sel);
  el.querySelector('#bug-allbar').classList.toggle('hidden',!!card);
  if(card){
    const items=cardCounts(card).items;
    host.innerHTML=`<div class="filterbar"><div class="epic-toolbar-title"><h2>${esc(card.label)} — Priority Queue <span class="count-pill">${items.length}</span></h2></div><span class="sla-legend"><i class="dot breached"></i>Breached <i class="dot risk"></i>Critical / At Risk <i class="dot warn"></i>Warning <i class="dot ok"></i>Within SLA</span><span class="toolbar-spacer"></span><button class="button small" data-sel="all">Back to all bugs</button></div>
    <div class="table-scroll"><table><thead><tr><th>#</th><th>SLA</th><th>Priority</th><th>GUS status</th><th>Work item</th><th>Subject</th><th>Assignee</th><th class="num">Age (days)</th><th class="num">Remaining</th><th class="num">Urgency</th></tr></thead><tbody>${items.length?bugPage(items).map((b,n)=>`<tr><td>${(B.pg-1)*B.size+n+1}</td><td><i class="dot ${b.state}" title="${STATES[b.state]}"></i></td><td>${b.priority?`<span class="sp-chip ${PCLS(b.priority)}">${esc(b.priority)}</span>`:'—'}</td><td>${statusSel(b,B.pick)}</td><td>${link(b)}</td><td class="sp-subject">${esc(b.subject)}</td><td>${whoSel(b)}</td><td class="num">${b.age}</td><td class="num ${b.state==='breached'?'late':''}">${remaining(b)}</td><td class="num">${b.urgency}</td></tr>`).join(''):'<tr><td colspan="10"><div class="empty-state hub-empty"><h3>Nothing here</h3><p>No items in this queue.</p></div></td></tr>'}</tbody></table></div>${bugPager(items.length)}`;
    return;
  }
  const rows=bugRows();
  const wkBar=B.wk?`<div class="bt-filter" role="status"><span>Bugs <b>${B.wk.kind}</b> in the week of <b>${esc(B.wk.start)}</b> · all priorities and statuses${B.wk.truncated?' · first 500':''}</span><button type="button" class="button small" data-wk-clear>Clear filter</button></div>`:'';
  host.innerHTML=wkBar+`<div class="table-scroll"><table><thead><tr><th>Bug</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assignee</th><th class="num">Pts</th><th>Found in</th><th class="num">Age</th></tr></thead><tbody>${rows.length?bugPage(rows).map(b=>`<tr><td>${link(b)}</td><td class="sp-subject">${esc(b.subject)}</td>
  <td><select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(b.id)}" data-field="Priority__c" data-prev="${esc(b.priority)}" data-label="${esc(b.name)} priority" aria-label="Priority of ${esc(b.name)}">${H.options(pr,b.priority)}</select></td><td>${statusSel(b,B.pick)}</td><td>${whoSel(b)}</td>
  <td class="num"><input class="hub-inline num" type="number" min="0" step="0.5" data-edit="ADM_Work__c" data-type="num" data-id="${esc(b.id)}" data-field="Story_Points__c" data-prev="${b.points==null?'':esc(b.points)}" data-label="${esc(b.name)} points" aria-label="Story points of ${esc(b.name)}" value="${b.points==null?'':esc(b.points)}"></td><td>${esc(b.build)}</td><td class="num">${age(b.created)}</td></tr>`).join(''):`<tr><td colspan="8"><div class="empty-state hub-empty"><h3>No bugs match</h3><p>No ${B.wk?'matching':[...B.pri].join('/')||'selected'} bugs for ${esc(H.team.short)} with these filters.</p></div></td></tr>`}</tbody></table></div>${bugPager(rows.length)}`;
  el.querySelector('#bug-count').textContent=rows.length;el.querySelector('#bug-allbar h2').firstChild.textContent=B.wk?(B.wk.kind==='closed'?'Closed bugs ':'Opened bugs '):'Open bugs ';
  el.querySelector('#bug-counts').innerHTML=['P0','P1','P2'].map(p=>`<span class="sp-chip ${PCLS(p)}">${p} ${B.bugs.filter(b=>b.priority===p&&inMember(b)).length}</span>`).join('');
  const sts=[...new Set(B.bugs.map(b=>b.status))].sort();el.querySelector('#bug-status').innerHTML='<option value="">All statuses</option>'+sts.map(s=>`<option${s===B.status?' selected':''}>${esc(s)}</option>`).join('');
}
function drawChamp(el){
  const c=B.champ&&B.champ.champion;
  el.querySelector('#bug-champ').innerHTML=c?`<span class="champ on" title="Trust Champion">🏆 ${esc(c.name)}</span>`:'<span class="champ">No Trust Champion defined</span>';
  const s=el.querySelector('#bug-champ-set');s.innerHTML='<option value="">Set Trust Champion…</option>'+B.members.map(m=>`<option value="${esc(m.id)}"${c&&c.id===m.id?' selected':''}>${esc(m.name)}</option>`).join('');
}

function drawTrend(el,t){
  const host=el.querySelector('#bug-trend');if(!host)return;
  if(!t||!t.weeks||!t.weeks.length){host.innerHTML='<div class="empty-state hub-empty"><p>Trend unavailable.</p></div>';return;}
  const w=t.weeks,sum=k=>w.reduce((a,x)=>a+x[k],0),op=sum('opened'),cl=sum('closed'),net=op-cl,last=w[w.length-1].backlog,first=w[0].backlog;
  const W=Math.max(560,Math.round(host.clientWidth||760)),Ht=190,L=34,R=38,T=14,Bt=28,iw=W-L-R,ih=Ht-T-Bt,n=w.length,slot=iw/n,bw=Math.min(16,slot/2-3);
  const mx=Math.max(4,...w.map(x=>Math.max(x.opened,x.closed))),mb=Math.max(1,...w.map(x=>x.backlog)),y=v=>T+ih-v/mx*ih,yb=v=>T+ih-v/mb*ih,cx=i=>L+slot*i+slot/2;
  const grid=[0,.5,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${T+ih-f*ih}" y2="${T+ih-f*ih}" class="bt-g"/><text x="${L-6}" y="${T+ih-f*ih+4}" text-anchor="end" class="bt-ax">${Math.round(mx*f)}</text><text x="${W-R+6}" y="${T+ih-f*ih+4}" class="bt-ax bt-axb">${Math.round(mb*f)}</text>`).join('');
  const hit=(k,x,xx,v,c)=>`<rect x="${xx}" y="${y(v)}" width="${bw}" height="${T+ih-y(v)}" rx="3" class="${c}${B.wk&&B.wk.kind===k&&B.wk.start===x.start?' bt-sel':''}${v?' bt-hit':''}"${v?` data-wk="${x.start}" data-kind="${k}" tabindex="0" role="button" aria-label="Show ${v} bug${v===1?'':'s'} ${k} the week of ${x.start}"`:''}/>`;
  const bars=w.map((x,i)=>`<g><title>Week of ${x.start}: ${x.opened} opened, ${x.closed} closed, backlog ${x.backlog}. Click a bar to list those bugs.</title>${hit('opened',x,cx(i)-bw-1,x.opened,'bt-o')}${hit('closed',x,cx(i)+1,x.closed,'bt-c')}<text x="${cx(i)}" y="${Ht-10}" text-anchor="middle" class="bt-ax">${esc(x.start.slice(5).replace('-','/'))}</text></g>`).join('');
  const line=w.map((x,i)=>`${i?'L':'M'}${cx(i).toFixed(1)} ${yb(x.backlog).toFixed(1)}`).join(' '),dots=w.map((x,i)=>`<circle cx="${cx(i)}" cy="${yb(x.backlog)}" r="3" class="bt-d"/>`).join('');
  const tile=(l,v,c,sub)=>`<div class="bt-tile ${c||''}"><span>${l}</span><b>${v}</b><small>${sub||''}</small></div>`;
  const ob=t.openBy||{};
  host.innerHTML=`<div class="bt-tiles">${tile('Opened',op,'o','12 weeks')}${tile('Closed',cl,'c','12 weeks')}${tile('Net',(net>0?'+':'')+net,net>0?'bad':'good',net>0?'backlog growing':net<0?'backlog shrinking':'flat')}${tile('Open backlog now',t.openNow,'',`${last-first>=0?'+':''}${last-first} vs 12 weeks ago`)}${tile('Open by priority',['P0','P1','P2','P3','P4'].map(p=>`<button type="button" class="bt-p ${PCLS(p)}" data-tp="${p}" title="Show open ${p} bugs">${p} ${ob[p]||0}</button>`).join(''),'wide','')}</div>
  <svg class="bt-svg" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Bugs opened and closed per week with open backlog">${grid}${bars}<path d="${line}" class="bt-l"/>${dots}</svg>
  <div class="bt-legend"><span><i class="bt-o"></i>Opened</span><span><i class="bt-c"></i>Closed</span><span><i class="bt-lg"></i>Open backlog (right axis)</span>${t.truncated?'<span class="note">Counts capped at 2,000 per series.</span>':''}</div>`;
  B.trendData=t;host._bt=t;if(!host._btRs){host._btRs=1;let tm;window.addEventListener('resize',()=>{clearTimeout(tm);tm=setTimeout(()=>{if(host.isConnected&&host._bt&&Math.abs(host.clientWidth-host._btW)>40)drawTrend(el,host._bt);},200);});}host._btW=host.clientWidth;
}
/** Clicking a trend bar lists the bugs opened/closed that week in the table below; clicking it again clears the filter. */
async function pickWeek(el,kind,start){
  if(B.wk&&B.wk.kind===kind&&B.wk.start===start){B.wk=null;B.pg=1;drawQueue(el);drawTrend(el,B.trendData);return;}
  const my=++B.wkSeq;B.sel='all';B.pg=1;B.status='';
  el.querySelector('#bug-queue').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading bugs from GUS…</div>';
  try{const r=await call('hub-bug-trend-items',{teamId:H.team.Id,kind,start});if(my!==B.wkSeq)return;B.wk=r;}
  catch(e){if(my!==B.wkSeq)return;B.wk=null;window.toast?.('Could not load bugs for that week: '+e.message,true);}
  drawBugs(el);drawTrend(el,B.trendData);el.querySelector('#bug-allbar').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function drawBugs(el){drawTiles(el);drawQueue(el);}
async function loadBugs(el){
  B.wk=null;const my=++B.seq;el.querySelector('#bug-queue').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading bugs from GUS…</div>';
  try{
    const id=H.team.Id;
    // Draw as each piece arrives: the table needs bugs + members + picklists; SLA tiles and the champion fill in when ready.
    call('hub-bug-trend',{teamId:id}).then(t=>{if(my===B.seq)drawTrend(el,t);},e=>{const h=el.querySelector('#bug-trend');if(h&&my===B.seq)h.innerHTML=`<div class="empty-state hub-empty"><p>Trend unavailable: ${esc(e.message)}</p></div>`;});
    const pSla=call('hub-sla',{teamId:id}).catch(e=>({cards:[],error:e.message})),pChamp=call('hub-champion',{teamId:id}).catch(()=>null);
    const [r,members,pick]=await Promise.all([call('hub-bugs',{teamId:id,priorities:[...B.pri],includeClosed:B.closed}),H.members().catch(()=>[]),H.picklists().catch(()=>null)]);
    if(my!==B.seq)return;B.bugs=r.bugs;B.members=members;B.pick=pick;B.pg=1;
    el.querySelector('#bug-who').innerHTML='<option value="">All members</option><option value="none">Unassigned</option>'+members.map(m=>`<option value="${esc(m.id)}"${m.id===B.who?' selected':''}>${esc(m.name)}</option>`).join('');
    drawBugs(el);
    if(r.truncated)window.toast?.('Showing the first 500 bugs. Narrow the filters.',false);
    pChamp.then(champ=>{if(my!==B.seq)return;B.champ=champ;drawChamp(el);});
    const sla=await pSla;if(my!==B.seq)return;B.sla=sla.cards||[];drawBugs(el);
    if(sla.error)window.toast?.('SLA tiles unavailable: '+sla.error,true);
  }catch(e){if(my===B.seq)el.querySelector('#bug-queue').innerHTML=`<div class="empty-state hub-empty"><h3>Could not load bugs</h3><p>${esc(e.message)}</p></div>`;}
}
H.register({id:'bugs',label:'Bugs',icon:'bug',tone:'rose',desc:'SLA board and open P0–P2 bugs for the team',needsTeam:true,
  stat:home=>home?{big:home.bugs.P0+home.bugs.P1+home.bugs.P2,text:'open P0–P2 bugs',chips:['P0','P1','P2'].map(p=>`<span class="sp-chip ${PCLS(p)}">${p} ${home.bugs[p]}</span>`).join('')}:{text:'Open P0–P2 bugs for the team'},
  render(el){
    el.innerHTML=heading('bug','rose','Bugs',`SLA board for ${H.team.Name}. Click a tile for its priority queue; edit status, assignee, priority and points inline — changes save to GUS immediately.`,refreshBtn)+
    `<section class="table-card"><div class="filterbar bug-head"><label class="hub-field">Team<select class="sp-select" disabled aria-label="Team (set in the top filter)"><option>${esc(H.team.short||H.team.Name)}</option></select></label><label class="hub-field">Member<select id="bug-who" class="sp-select" aria-label="Member filter"><option value="">All members</option></select></label><span class="hub-field">Trust Champion<span id="bug-champ"></span></span><label class="hub-field">Set champion<select id="bug-champ-set" class="sp-select" aria-label="Set Trust Champion"></select></label></div>
    <div id="sla-tiles" class="sla-tiles" role="group" aria-label="SLA tiles"></div></section>
    <section class="table-card bt-card"><div class="filterbar"><div class="epic-toolbar-title"><h2>Bug trend · last 12 weeks</h2></div><span class="note">Opened vs closed per week, with the open backlog</span></div><div id="bug-trend" class="bt-body"><div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading trend…</div></div></section>
    <section class="table-card"><div class="filterbar" id="bug-allbar"><div class="epic-toolbar-title"><h2>Open bugs <span class="count-pill" id="bug-count">0</span></h2></div><div class="hub-chips" aria-label="Priority">${['P0','P1','P2','P3','P4'].map(p=>chipBtn('data-pri',p,p,B.pri.has(p))).join('')}</div><span id="bug-counts" class="sp-chips"></span><span class="toolbar-spacer"></span><select id="bug-status" class="sp-select" aria-label="Status filter"></select><label class="hub-check"><input type="checkbox" id="bug-closed"${B.closed?' checked':''}> Include closed</label><div class="search-box"><svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input id="bug-q" placeholder="Search bugs…" aria-label="Search bugs" value="${esc(B.q)}"></div></div><div id="bug-queue"></div><div class="table-footer"><span>Source: GUS · ADM_Work__c (Bug, Investigation) · ${esc(H.team.Name)} · SLA thresholds and urgency are computed in the dashboard</span></div></section>`;
    if(bugTeam!==H.team.Id){bugTeam=H.team.Id;B.who='';B.status='';B.sel='all';}
    withIcons(el);
    el.onclick=e=>{
      const wc=e.target.closest('[data-wk-clear]');if(wc){B.wk=null;B.pg=1;drawQueue(el);if(B.trendData)drawTrend(el,B.trendData);return;}
      const tp=e.target.closest('[data-tp]');if(tp){B.wk=null;B.sel='all';B.pg=1;B.pri=new Set([tp.dataset.tp]);el.querySelectorAll('[data-pri]').forEach(b=>{const on=B.pri.has(b.dataset.pri);b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});loadBugs(el);el.querySelector('#bug-allbar').scrollIntoView({block:'start',behavior:'smooth'});return;}
      const wb=e.target.closest('[data-wk]');if(wb){pickWeek(el,wb.dataset.kind,wb.dataset.wk);return;}
      const c=e.target.closest('[data-pri]');if(c){B.wk=null;B.pg=1;const p=c.dataset.pri;B.pri.has(p)?B.pri.delete(p):B.pri.add(p);c.classList.toggle('on',B.pri.has(p));c.setAttribute('aria-pressed',String(B.pri.has(p)));loadBugs(el);return;}
      const pgb=e.target.closest('[data-bug-page]');if(pgb&&!pgb.disabled){B.pg=+pgb.dataset.bugPage;drawQueue(el);el.querySelector('#bug-queue').scrollIntoView({block:'start'});return;}
      const t=e.target.closest('[data-sla]');if(t){B.pg=1;B.sel=B.sel===t.dataset.sla?'all':t.dataset.sla;drawBugs(el);return;}
      const s=e.target.closest('[data-sel]');if(s){B.pg=1;B.sel=s.dataset.sel;drawBugs(el);return;}
      if(e.target.closest('[data-refresh]'))loadBugs(el);};
    el.addEventListener('keydown',e=>{const wb=(e.key==='Enter'||e.key===' ')&&e.target.closest&&e.target.closest('[data-wk]');if(wb){e.preventDefault();pickWeek(el,wb.dataset.kind,wb.dataset.wk);}});
    el.addEventListener('change',e=>{if(e.target.matches('[data-bug-size]')){B.size=+e.target.value;B.pg=1;drawQueue(el);}});
    el.querySelector('#bug-closed').onchange=e=>{B.pg=1;B.closed=e.target.checked;loadBugs(el);};
    el.querySelector('#bug-status').onchange=e=>{B.pg=1;B.status=e.target.value;drawQueue(el);};
    el.querySelector('#bug-who').onchange=e=>{B.pg=1;B.who=e.target.value;drawBugs(el);};
    el.querySelector('#bug-q').oninput=e=>{B.pg=1;B.q=e.target.value;drawQueue(el);};
    el.querySelector('#bug-champ-set').onchange=async e=>{const m=B.members.find(x=>x.id===e.target.value);
      try{const r=await call('hub-champion-save',{teamId:H.team.Id,champion:m?{id:m.id,name:m.name}:null,revision:B.champ&&B.champ.revision});B.champ=r;drawChamp(el);window.toast?.(m?`Trust Champion set to ${m.name}`:'Trust Champion cleared',false);}
      catch(err){window.toast?.('Could not save Trust Champion: '+err.message,true);drawChamp(el);}};
    bindPage(el,(id,field,val)=>{
      const lists=[B.bugs,...(B.wk?[B.wk.bugs]:[]),...B.sla.map(c=>c.items)];
      for(const l of lists)for(const b of l)if(b.id===id){if(field==='Priority__c')b.priority=val;else if(field==='Status__c')b.status=val;else if(field==='Assignee__c'){b.assigneeId=val;b.assignee=(B.members.find(m=>m.id===val)||{}).name||'';}else if(field==='Story_Points__c')b.points=val;}
      drawTiles(el);if(!B.sla.some(c=>c.id===B.sel)){el.querySelector('#bug-counts').innerHTML=['P0','P1','P2'].map(p=>`<span class="sp-chip ${PCLS(p)}">${p} ${B.bugs.filter(x=>x.priority===p&&inMember(x)).length}</span>`).join('');}});
    loadBugs(el);
  }});

// ── Team dependencies ───────────────────────────────────────────────────────
const T={dir:'outgoing',data:null,pick:null,seq:0};
function drawTds(el){
  const list=T.data[T.dir],other=T.dir==='outgoing'?'providerTeam':'dependentTeam',st=T.pick?T.pick.tdStatus:[];
  el.querySelector('#td-tabs').innerHTML=['outgoing','incoming'].map(d=>`<button data-dir="${d}" class="${d===T.dir?'selected':''}" aria-pressed="${d===T.dir}">${d==='outgoing'?'Outgoing':'Incoming'} <span class="count-pill">${T.data[d].length}</span></button>`).join('');
  el.querySelector('#td-hint').textContent=T.dir==='outgoing'?`${H.team.short} depends on these teams to deliver.`:`These teams depend on ${H.team.short} to deliver.`;
  el.querySelector('#td-body').innerHTML=list.length?list.map(t=>{const late=t.deliverBy&&t.deliverBy<new Date().toISOString().slice(0,10);return `<tr><td><a href="${H.GUS}ADM_Team_Dependency__c/${esc(t.id)}/view" target="_blank" rel="noopener noreferrer">${esc(t.name)}</a></td><td class="sp-subject" title="${esc(t.deliverable)}">${esc(t.deliverable.slice(0,160))}</td><td>${esc(t[other])}</td>
  <td><select class="hub-inline" data-edit="ADM_Team_Dependency__c" data-id="${esc(t.id)}" data-field="Dependency_Status__c" data-prev="${esc(t.status)}" data-label="${esc(t.name)} status" aria-label="Status of ${esc(t.name)}">${H.options(st,t.status)}</select></td>
  <td><input class="hub-inline${late?' late':''}" type="date" data-edit="ADM_Team_Dependency__c" data-type="date" data-id="${esc(t.id)}" data-field="Deliver_By__c" data-prev="${esc(t.deliverBy||'')}" data-label="${esc(t.name)} deliver-by" aria-label="Deliver by for ${esc(t.name)}" value="${esc(t.deliverBy||'')}"></td>
  <td>${esc(t.build)}</td>
  <td>${[[t.dependentStory,t.dependentStoryId],[t.providerStory,t.providerStoryId]].filter(x=>x[0]).map(([n,id])=>id?`<a href="${H.GUS}ADM_Work__c/${esc(id)}/view" target="_blank" rel="noopener noreferrer">${esc(n)}</a>`:esc(n)).join(' → ')}</td></tr>`;}).join(''):`<tr><td colspan="7"><div class="empty-state hub-empty"><h3>No open ${T.dir} dependencies</h3><p>Nothing outstanding for ${esc(H.team.short)}.</p></div></td></tr>`;
}
async function loadTds(el){
  const my=++T.seq;el.querySelector('#td-body').innerHTML='<tr><td colspan="7" class="hub-loading">Loading dependencies from GUS…</td></tr>';
  try{const [d,p]=await Promise.all([call('hub-tds',{teamId:H.team.Id}),H.picklists().catch(()=>null)]);if(my!==T.seq)return;T.data=d;T.pick=p;drawTds(el);}
  catch(e){if(my===T.seq)el.querySelector('#td-body').innerHTML=`<tr><td colspan="7"><div class="empty-state hub-empty"><h3>Could not load dependencies</h3><p>${esc(e.message)}</p></div></td></tr>`;}
}
H.register({id:'tds',label:'Team Dependencies',icon:'td',tone:'amber',desc:'Incoming and outgoing team dependencies',needsTeam:true,
  stat:home=>home?{big:home.tds.incoming+home.tds.outgoing,text:'open team dependencies',chips:`<span class="sp-chip add">In ${home.tds.incoming}</span><span class="sp-chip warn">Out ${home.tds.outgoing}</span>`}:{text:'Incoming and outgoing team dependencies'},
  render(el){
    el.innerHTML=heading('td','amber','Team Dependencies',`Open TDs for ${H.team.Name}. Edit status and deliver-by date inline; changes save to GUS immediately.`,refreshBtn)+
    `<section class="table-card"><div class="filterbar"><div class="epic-toolbar-title"><h2>Dependencies</h2></div><nav class="sp-tabs" id="td-tabs" aria-label="Direction"></nav><span id="td-hint" class="note"></span></div><div class="table-scroll"><table><thead><tr><th>TD</th><th>Deliverable</th><th>Other team</th><th>Status</th><th>Deliver by</th><th>Target build</th><th>Stories</th></tr></thead><tbody id="td-body"></tbody></table></div><div class="table-footer"><span>Source: GUS · ADM_Team_Dependency__c · ${esc(H.team.Name)}</span></div></section>`;
    withIcons(el);
    el.onclick=e=>{const b=e.target.closest('[data-dir]');if(b&&T.data){T.dir=b.dataset.dir;drawTds(el);}if(e.target.closest('[data-refresh]'))loadTds(el);};
    bindPage(el,(id,field,val)=>{const t=[...(T.data?.outgoing||[]),...(T.data?.incoming||[])].find(x=>x.id===id);if(!t)return;if(field==='Dependency_Status__c')t.status=val;else if(field==='Deliver_By__c')t.deliverBy=val;});
    loadTds(el);
  }});

// ── Test failures (Patch / Main) ────────────────────────────────────────────
const TF={data:null,pick:null,members:[],who:'',q:'',kind:'',pg:{patch:1,main:1},seq:0},TF_PAGE=25;
const tfAll=()=>[...(TF.data?.patch||[]),...(TF.data?.main||[])];
const tfRows=rows=>{const q=TF.q.toLowerCase();return rows.filter(r=>(!TF.who||(TF.who==='none'?!r.assigneeId:r.assigneeId===TF.who))&&(!q||(r.name+' '+r.subject+' '+r.assignee).toLowerCase().includes(q)));};
const build=(b,patch)=>b?`<span class="tf-build ${patch?'patch':'main'}">${esc(b)}</span>`:'—';
function tfPager(cls,total,pg){
  const pages=Math.ceil(total/TF_PAGE);if(pages<2)return '';
  const from=(pg-1)*TF_PAGE+1,to=Math.min(total,pg*TF_PAGE);
  return `<div class="tf-pager" role="navigation" aria-label="${cls} pages"><span>${from}–${to} of ${total}</span><button type="button" class="button small" data-tf-page="${cls}:${pg-1}" ${pg<=1?'disabled':''}>‹ Prev</button><b>Page ${pg} / ${pages}</b><button type="button" class="button small" data-tf-page="${cls}:${pg+1}" ${pg>=pages?'disabled':''}>Next ›</button></div>`;
}
function tfSection(title,cls,desc,all,pick){
  if(!all.length)return '';
  const pages=Math.ceil(all.length/TF_PAGE),pg=TF.pg[cls]=Math.min(Math.max(TF.pg[cls]||1,1),pages),rows=all.slice((pg-1)*TF_PAGE,pg*TF_PAGE);
  return `<section class="tf-section ${cls}"><div class="tf-head"><b>${title}</b><span class="count-pill">${all.length}</span><span>${esc(desc)}</span></div><div class="table-scroll"><table class="tf-table" style="table-layout:fixed;width:100%;min-width:1060px"><colgroup><col style="width:180px"><col><col style="width:150px"><col style="width:90px"><col style="width:100px"><col style="width:90px"><col style="width:150px"></colgroup><thead><tr><th>ID</th><th>Subject</th><th>Assignee</th><th>Found in</th><th>Scheduled</th><th>Age</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><a href="${H.GUS}ADM_Work__c/${esc(r.id)}/view" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a>${H.nudgeBtn(r)}</td><td class="sp-subject" style="max-width:none;white-space:normal" title="${esc(r.subject)}">${esc(r.subject.slice(0,140))}</td><td>${esc(r.assignee||'Unassigned')}</td><td>${build(r.found,r.found.includes('.'))}</td><td>${build(r.scheduled,r.scheduled.includes('.'))}</td><td class="${r.age>14?'tf-stale':''}">${r.age<1?'today':r.age+' days'}</td><td><select class="hub-inline" style="width:100%;max-width:100%;min-width:0" data-edit="ADM_Work__c" data-id="${esc(r.id)}" data-field="Status__c" data-prev="${esc(r.status)}" data-label="${esc(r.name)} status" aria-label="Status of ${esc(r.name)}">${H.options(pick?pick.workStatus:[],r.status)}</select></td></tr>`).join('')}</tbody></table></div>${tfPager(cls,all.length,pg)}</section>`;
}
function drawTests(el){
  const d=TF.data,patch=TF.kind==='main'?[]:tfRows(d.patch),main=TF.kind==='patch'?[]:tfRows(d.main);
  el.querySelector('#tf-chips').innerHTML=`<button type="button" class="sp-chip rem tf-filter${TF.kind==='patch'?' on':''}" data-tf-kind="patch" aria-pressed="${TF.kind==='patch'}" title="Show only Patch TFs">${d.patch.length} Patch TFs</button><button type="button" class="sp-chip add tf-filter${TF.kind==='main'?' on':''}" data-tf-kind="main" aria-pressed="${TF.kind==='main'}" title="Show only Main TFs">${d.main.length} Main TFs</button>${TF.kind?'<button type="button" class="button small" data-tf-kind="">Show all</button>':''}${d.truncated?'<span class="sp-chip warn">Showing first 500</span>':''}`;
  el.querySelector('#tf-body').innerHTML=(patch.length||main.length)?tfSection('Patch Open TFs','patch','Scheduled for a patch build — fix before the patch ships',patch,TF.pick)+tfSection('Main Open TFs','main','Open on main release, oldest first — don’t let these become patch TFs',main,TF.pick):`<div class="empty-state hub-empty"><h3>No open test failures</h3><p>Nothing matches for ${esc(H.team.short)}.</p></div>`;
}
async function loadTests(el){
  const my=++TF.seq;el.querySelector('#tf-body').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading test failures from GUS…</div>';
  try{const [d,p,m]=await Promise.all([call('hub-tests',{teamId:H.team.Id}),H.picklists().catch(()=>null),H.members().catch(()=>[])]);if(my!==TF.seq)return;TF.data=d;TF.pick=p;TF.members=m;
    el.querySelector('#tf-who').innerHTML='<option value="">All assignees</option><option value="none">Unassigned</option>'+m.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('');el.querySelector('#tf-who').value=TF.who;drawTests(el);}
  catch(e){if(my===TF.seq)failed(el.querySelector('#tf-body'),e);}
}
H.register({id:'tests',label:'Test Failures',icon:'flask',tone:'rose',desc:'Open test failures: patch first, then main',needsTeam:true,
  render(el){
    el.innerHTML=heading('flask','rose','Test Failures',`Open test failures for ${H.team.Name}. Edit status inline; changes save to GUS immediately.`,refreshBtn)+
    `<section class="table-card"><div class="filterbar"><input id="tf-q" class="hub-inline" placeholder="Search name or subject" aria-label="Search test failures" value="${esc(TF.q)}"><select id="tf-who" class="hub-inline" aria-label="Assignee"></select><span id="tf-chips" class="tf-chips"></span></div><div id="tf-body"></div></section>`;
    withIcons(el);
    el.onclick=e=>{
      if(e.target.closest('[data-refresh]'))return loadTests(el);
      const k=e.target.closest('[data-tf-kind]');if(k&&TF.data){const v=k.dataset.tfKind;TF.kind=TF.kind===v?'':v;TF.pg={patch:1,main:1};return drawTests(el);}
      const g=e.target.closest('[data-tf-page]');if(g&&TF.data){const [c,n]=g.dataset.tfPage.split(':');TF.pg[c]=+n;drawTests(el);el.querySelector('.tf-section.'+c)?.scrollIntoView({block:'start'});}
    };
    H.onEsc('tests',()=>{if(TF.kind){TF.kind='';TF.pg={patch:1,main:1};if(TF.data)drawTests(el);return true;}return false;});
    el.querySelector('#tf-q').oninput=e=>{TF.q=e.target.value;TF.pg={patch:1,main:1};if(TF.data)drawTests(el);};
    el.querySelector('#tf-who').onchange=e=>{TF.who=e.target.value;TF.pg={patch:1,main:1};if(TF.data)drawTests(el);};
    bindPage(el,(id,field,val)=>{const r=tfAll().find(x=>x.id===id);if(r&&field==='Status__c')r.status=val;});
    loadTests(el);
  }});

// ── Rotations ───────────────────────────────────────────────────────────────
const KINDS=[['pd','PD on-call','rotation','violet'],['trusthero','Trust Hero','flag','amber']];
const R={rota:{pd:[],trusthero:[]},revision:null,team:null,members:[]};
const iso=d=>d.toISOString().slice(0,10);
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
/** Parse pasted rota lines such as "Nov 10 - Nov 16: Jane Doe" or "2026-11-10 to 2026-11-16 Jane Doe". */
function parseRota(text){
  const year=new Date().getFullYear(),rows=[];
  for(const line of String(text).split(/\n/)){
    const dates=[];let rest=line.replace(/(\d{4})-(\d{2})-(\d{2})|(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?(?:,?\s*(\d{4}))?|([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s*(\d{4}))?/g,(m,y,mo,d,d2,m2,y2,m3,d3,y3)=>{
      let Y,M,D;if(y){Y=+y;M=+mo;D=+d;}else if(d2){Y=+y2||year;M=MONTHS.indexOf(m2.toLowerCase())+1;D=+d2;}else{Y=+y3||year;M=MONTHS.indexOf(m3.toLowerCase())+1;D=+d3;}
      if(M<1||M>12||D<1||D>31)return m;dates.push(`${Y}-${String(M).padStart(2,'0')}-${String(D).padStart(2,'0')}`);return ' ';});
    const name=rest.replace(/[:\-–—>|•*_~`]+|\bto\b|<@[^>]*\|?|>/gi,' ').replace(/\s+/g,' ').trim();
    if(!dates.length||!name)continue;
    const start=dates[0],end=dates[1]||iso(new Date(new Date(start+'T00:00:00Z').getTime()+6*864e5));
    rows.push({name,start,end:end<start?start:end,backup:''});
  }
  return rows;
}
let rotaChain=Promise.resolve();
function saveRota(el,quiet){return rotaChain=rotaChain.then(()=>doSaveRota(el,quiet));}
async function doSaveRota(el,quiet){
  try{
    const r=await call('hub-rotation-save',{teamId:R.team,rota:R.rota,revision:R.revision});
    R.rota=r.rota;R.revision=r.revision;if(!quiet)window.toast?.('Rotation saved to GUS Apps');drawRota(el,true);
  }catch(e){window.toast?.('Could not save rotation: '+e.message,true);loadRota(el);}
}
function shiftRow(kind,r,i){const now=H.currentRota([r]);return `<tr class="${now?'now':''}"><td><input class="hub-inline" list="rota-names" data-rk="${kind}" data-i="${i}" data-f="name" value="${esc(r.name)}" aria-label="Name"></td><td><input class="hub-inline" type="date" data-rk="${kind}" data-i="${i}" data-f="start" value="${esc(r.start)}" aria-label="Start"></td><td><input class="hub-inline" type="date" data-rk="${kind}" data-i="${i}" data-f="end" value="${esc(r.end)}" aria-label="End"></td><td>${now?'<span class="sp-chip ok">On now</span>':''}</td><td><button class="icon-button" data-rdel="${kind}:${i}" aria-label="Remove shift">×</button></td></tr>`;}
function drawRota(el){
  const t=iso(new Date());
  el.querySelector('#rota-cards').innerHTML=KINDS.map(([k,label,ic,tone])=>{
    const rows=R.rota[k],now=H.currentRota(rows),next=rows.find(r=>r.start>t);
    return `<section class="table-card rota-card"><div class="filterbar"><div class="epic-toolbar-title"><h2>${icon(ic,tone)} ${label}</h2></div><span class="toolbar-spacer"></span><button class="button small" data-radd="${k}"><span data-icon3d="plus" data-tone="green"></span> Add shift</button></div>
    <div class="rota-now"><div><span class="hub-eyebrow">On now</span><strong>${now?esc(now.name):'Not set'}</strong><small>${now?`${esc(now.start)} → ${esc(now.end)}`:'No shift covers today'}</small></div><div><span class="hub-eyebrow">Up next</span><strong>${next?esc(next.name):'—'}</strong><small>${next?`${esc(next.start)} → ${esc(next.end)}`:''}</small></div></div>
    <div class="table-scroll"><table><thead><tr><th>Name</th><th>Start</th><th>End</th><th></th><th></th></tr></thead><tbody>${rows.length?rows.map((r,i)=>shiftRow(k,r,i)).join(''):'<tr><td colspan="5"><div class="empty-state hub-empty"><p>No shifts yet. Add a shift or import the rota below.</p></div></td></tr>'}</tbody></table></div></section>`;}).join('');
  el.querySelector('#rota-cards').querySelectorAll('[data-icon3d]').forEach(n=>{n.outerHTML=icon(n.dataset.icon3d,n.dataset.tone);});
  el.querySelector('#rota-names').innerHTML=R.members.map(m=>`<option value="${esc(m.name)}">`).join('');
}
async function loadRota(el){
  el.querySelector('#rota-cards').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner"></span> Loading rotation…</div>';
  R.team=H.team.Id;
  try{const [r,ms]=await Promise.all([call('hub-rotation',{teamId:R.team}),H.members().catch(()=>[])]);if(R.team!==H.team.Id)return;R.rota=r.rota;R.revision=r.revision;R.members=ms;drawRota(el);}
  catch(e){failed(el.querySelector('#rota-cards'),e);}
}
const PD={team:'',open:new Set(),threads:new Map(),sums:new Map()};
const pdAge=iso=>{const d=Math.floor((Date.now()-new Date(iso))/864e5);return d<1?'today':d===1?'yesterday':d+'d ago';};
const PDCOLS=[['at','Triggered'],['name','Alert'],['kind','Type'],['severity','Sev'],['urgency','Urgency'],['scope','Scope / DC'],['client','Affected client'],['meaning','What it means'],['actions','Action items'],['service','Service'],['replies','Thread']];
PD.sort={key:'at',dir:'desc'};
const SEVRANK={P0:0,P1:1,P2:2,P3:3,P4:4};
function sortPd(list){
  const {key,dir}=PD.sort,d=dir==='desc'?-1:1,v=a=>key==='severity'?(a.severity in SEVRANK?SEVRANK[a.severity]:9):key==='replies'?a.replies||0:String(a[key]||'').toLowerCase(),none=a=>key!=='replies'&&key!=='severity'&&!a[key];
  return [...list].sort((x,y)=>{if(none(x)!==none(y))return none(x)?1:-1;const p=v(x),q=v(y);return (typeof p==='number'?p-q:p.localeCompare(q,undefined,{numeric:true}))*d;});
}
const pdTh=(k,l)=>{const on=PD.sort.key===k;return `<th aria-sort="${on?(PD.sort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="sp-sort${on?' on':''}" data-pdsort="${k}" title="Sort by ${esc(l)}">${esc(l)}</button></th>`;};
const pdWhen=iso=>{const d=new Date(iso);return d.toLocaleDateString([],{month:'short',day:'numeric'})+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});};
const pdLinkify=t=>esc(t).replace(/(https?:\/\/[^\s<)]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
function threadRow(ts){
  const t=PD.threads.get(ts);let h;
  if(!t)h='<span class="muted">Loading conversation…</span>';
  else if(t.error)h=`<span class="pd-err">Could not load the thread: ${esc(t.error)}</span>`;
  else h=(t.messages.length?t.messages.map(m=>`<li><div class="pd-m-h"><b>${esc(m.who)}</b>${m.bot?' <span class="pd-bot">app</span>':''}<span class="muted"> · ${esc(pdWhen(m.at))}</span></div><div class="pd-m-t">${pdLinkify(m.text)}</div></li>`).join(''):'<li class="muted">No replies.</li>')+`</ul><a class="pd-open" href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Open thread in Slack ↗</a>`;
  return `<tr class="pd-thread"><td colspan="12">${t&&!t.error?'<ul class="pd-convo">':'<div>'}${h}${t&&!t.error?'':'</div>'}</td></tr>`;
}
async function loadThread(el,ts){
  try{const r=await call('hub-pd-thread',{teamId:PD.team,ts});PD.threads.set(ts,r);}catch(e){PD.threads.set(ts,{error:e.message});}
  if(PD.open.has(ts))drawPd(el);
}
// Hover card: overall summary and next steps of an alert's thread.
let pdTipEl=null,pdTipTimer=0,pdTipFor='';
const pdTipHide=()=>{clearTimeout(pdTipTimer);pdTipFor='';if(pdTipEl){pdTipEl.remove();pdTipEl=null;}};
function pdTipDraw(row,ts){
  if(pdTipFor!==ts||!row.isConnected)return;
  const r=PD.sums.get(ts),el=pdTipEl||(pdTipEl=Object.assign(document.createElement('div'),{className:'pd-tip',role:'tooltip'}));
  let h;
  if(!r)h='<div class="pd-tip-h">Thread summary</div><p class="muted">Summarizing the thread…</p>';
  else if(r.error)h=`<div class="pd-tip-h">Thread summary</div><p class="pd-err">${esc(r.error)}</p>`;
  else h=`<div class="pd-tip-h">Thread summary<span class="muted"> · ${r.replies} repl${r.replies===1?'y':'ies'}${r.lastAt?', last '+esc(pdWhen(r.lastAt))+(r.lastBy?' by '+esc(r.lastBy):''):''}</span></div>${r.summary?`<p>${esc(r.summary)}</p>`:`<p class="muted">${esc(r.note||'No summary available.')}</p>`}${r.next&&r.next.length?`<div class="pd-tip-h">Next steps</div><ol>${r.next.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`:''}<div class="pd-tip-f">${r.ai?'AI-generated from the Slack thread. ':''}Click the replies to read the full conversation.</div>`;
  el.innerHTML=h;if(!el.isConnected)document.body.appendChild(el);
  const b=row.getBoundingClientRect(),w=Math.min(420,innerWidth-24);el.style.width=w+'px';
  const x=Math.max(12,Math.min(innerWidth-w-12,b.left+80)),hh=el.offsetHeight;let y=b.bottom+6;if(y+hh>innerHeight-12)y=Math.max(12,b.top-hh-6);
  el.style.left=x+'px';el.style.top=y+'px';
}
async function pdTipShow(el,row){
  const ts=row.dataset.pdts;if(!ts||pdTipFor===ts)return;pdTipFor=ts;pdTipDraw(row,ts);
  if(!PD.sums.has(ts)){try{PD.sums.set(ts,await call('hub-pd-summary',{teamId:PD.team,ts}));}catch(e){PD.sums.set(ts,{error:e.message});}}
  pdTipDraw(row,ts);
}
function drawPd(el){
  const r=PD.r,body=el.querySelector('#pd-body');if(!r||!body)return;
    const A=sortPd(r.alerts),by=k=>A.filter(a=>a.kind===k).length,p1=A.filter(a=>/^P[01]$/.test(a.severity)).length,sum=el.querySelector('#pd-sum');
    sum.innerHTML=A.length?`<span class="mchip"><b>${A.length}</b> alerts</span>${p1?`<span class="mchip bk"><b>${p1}</b> P0/P1</span>`:''}${['Availability','Latency','Remediation','Infrastructure','Incident','Alert'].filter(by).map(k=>`<span class="mchip">${k} <b>${by(k)}</b></span>`).join('')}`:'';
    const dt=pdWhen;
    body.innerHTML=A.length?`<div class="table-scroll"><table class="pd-table"><thead><tr>${PDCOLS.map(([k,l])=>pdTh(k,l)).join('')}<th>Links</th></tr></thead><tbody>${A.map(a=>{const dash='<span class="muted">—</span>',lk=(h,t)=>h?`<a href="${esc(h)}" target="_blank" rel="noopener noreferrer">${t}</a>`:'';return `<tr data-pdts="${esc(a.ts)}" data-pdrep="${a.replies||0}"><td class="pd-when" title="${esc(new Date(a.at).toLocaleString())}">${esc(dt(a.at))}<span class="muted">${pdAge(a.at)}</span></td><td class="pd-title"><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer" title="${esc(a.title)}">${esc(a.name||a.title)}</a></td><td>${esc(a.kind)}</td><td>${a.severity?`<span class="pd-sev ${esc(a.severity.toLowerCase())}">${esc(a.severity)}</span>`:dash}</td><td>${esc(a.urgency)||dash}</td><td class="pd-scope">${esc(a.scope)||dash}</td><td class="pd-scope">${esc(a.client)||dash}</td><td class="pd-txt">${esc(a.meaning)||dash}</td><td class="pd-txt">${esc(a.actions)||dash}</td><td class="pd-svc">${esc((a.service||'').replace(/^GUS:\s*/,''))||dash}</td><td class="pd-thcell">${a.replies?`<button type="button" class="pd-thr-btn" data-pdthr="${esc(a.ts)}" aria-expanded="${PD.open.has(a.ts)}">${a.replies} repl${a.replies>1?'ies':'y'} ${PD.open.has(a.ts)?'▴':'▾'}</button>`:'<span class="muted">No replies</span>'} ${lk(a.slack,'↗')}${a.reviewStarted?' <span class="pd-pir" title="Post-incident review already started">PIR</span>':''}</td><td class="pd-links">${lk(a.url,'PagerDuty')}${a.argus?' · '+lk(a.argus,'Argus'):''}</td></tr>${PD.open.has(a.ts)?threadRow(a.ts):''}`;}).join('')}</tbody></table></div>`:`<div class="empty-state hub-empty"><p>No PagerDuty alerts in the last ${r.days} days.</p></div>`;
}
async function loadPd(el,fresh,quiet){
  const body=el.querySelector('#pd-body'),sub=el.querySelector('#pd-sub');if(!body)return;if(fresh)PD.sums.clear();{const sm=el.querySelector('#pd-sum');if(sm)sm.innerHTML='';}if(PD.team!==H.team.Id){PD.open.clear();PD.threads.clear();PD.sums.clear();}PD.team=H.team.Id;
  try{
    const r=await call('hub-pd-alerts',fresh?{teamId:PD.team,fresh:true}:{teamId:PD.team});if(PD.team!==H.team.Id)return;
    if(!r.configured){body.innerHTML='<div class="empty-state hub-empty"><p>No PagerDuty channel is linked to this team yet.</p></div>';sub.textContent='';return;}
    sub.innerHTML=`Updated ${new Date(r.fetchedAt||Date.now()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · auto-refreshes every 3 min · Last ${r.days} days · <a href="${esc(r.channel.url)}" target="_blank" rel="noopener noreferrer">${esc(r.channel.name)}</a>`;
    PD.r=r;drawPd(el);
  }catch(e){if(quiet&&PD.r)return;sub.textContent='';body.innerHTML=`<div class="empty-state hub-empty"><p>PagerDuty alerts are unavailable: ${esc(e.message)}</p></div>`;}
}
H.register({id:'rotations',label:'Trust Champion',icon:'rotation',tone:'violet',desc:'PD on-call and Trust Hero rota',needsTeam:true,
  stat:(home,x)=>({big:x&&x.pd?x.pd.name.split(' ')[0]:'—',text:x&&x.th?`PD on-call · Trust Hero ${x.th.name.split(' ')[0]}`:'PD on-call and Trust Hero rota'}),
  render(el){
    el.innerHTML=heading('rotation','violet','Trust Champion — PagerDuty alerts',`PagerDuty alerts for ${H.team.Name}, read from its PagerDuty Slack channel.`,refreshBtn)+
    `<section class="table-card pd-alerts" id="pd-alerts"><div class="filterbar"><div class="epic-toolbar-title"><h2>PagerDuty alerts</h2></div><span class="pd-sub" id="pd-sub"></span></div><div id="pd-sum" class="pd-sum"></div><div id="pd-body" class="pd-body"><div class="hub-loading" role="status"><span class="executive-spinner"></span> Loading alerts…</div></div></section>`;
    withIcons(el);
    el.onmouseover=e=>{const row=e.target.closest&&e.target.closest('tr[data-pdts]');if(!row||+row.dataset.pdrep<1||(e.relatedTarget&&row.contains(e.relatedTarget)))return;clearTimeout(pdTipTimer);pdTipTimer=setTimeout(()=>pdTipShow(el,row),350);};
    el.onmouseout=e=>{const row=e.target.closest&&e.target.closest('tr[data-pdts]');if(!row||(e.relatedTarget&&row.contains(e.relatedTarget)))return;pdTipHide();};
    window.addEventListener('scroll',pdTipHide,{capture:true,passive:true});
    el.onclick=e=>{if(e.target.closest('[data-refresh]')){PD.threads.clear();PD.sums.clear();PD.open.forEach(ts=>loadThread(el,ts));return loadPd(el,true);}
      const th=e.target.closest('[data-pdthr]');if(th){pdTipHide();const ts=th.dataset.pdthr;if(PD.open.has(ts)){PD.open.delete(ts);drawPd(el);}else{PD.open.add(ts);drawPd(el);if(!PD.threads.has(ts))loadThread(el,ts);}return;}const t=e.target.closest('[data-pdsort]');if(t){const k=t.dataset.pdsort;PD.sort=PD.sort.key===k?{key:k,dir:PD.sort.dir==='asc'?'desc':'asc'}:{key:k,dir:k==='at'||k==='replies'?'desc':'asc'};drawPd(el);}};
    loadPd(el);
    clearInterval(PD.timer);PD.timer=setInterval(()=>{if(!el.isConnected){clearInterval(PD.timer);return;}if(!document.hidden&&H.team&&H.team.Id===PD.team)loadPd(el,true,true);},180000);
  }});
H.__parseRota=parseRota;
})();
