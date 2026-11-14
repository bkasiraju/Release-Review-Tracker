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
const B={pri:new Set(['P0','P1','P2']),closed:false,status:'',who:'',q:'',bugs:[],sla:[],champ:null,members:[],pick:null,sel:'all',seq:0};
const PCLS=p=>p==='P0'?'rem':p==='P1'?'warn':'add';
const STATES={breached:'Breached',risk:'At risk',warn:'Warning',ok:'Within SLA'};
const inMember=b=>!B.who||(B.who==='none'?!b.assigneeId:b.assigneeId===B.who);
const bugRows=()=>{const q=B.q.toLowerCase();return B.bugs.filter(b=>inMember(b)&&(!B.status||b.status===B.status)&&(!q||(b.name+' '+b.subject).toLowerCase().includes(q)));};
const remaining=i=>i.remaining==null?'—':i.remaining<0?`${i.remaining.toFixed(1)}d (overdue)`:`${i.remaining.toFixed(1)}d`;
const statusSel=(b,pick)=>`<select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(b.id)}" data-field="Status__c" data-prev="${esc(b.status)}" data-label="${esc(b.name)} status" aria-label="Status of ${esc(b.name)}">${H.options(pick?pick.workStatus:[],b.status)}</select>`;
const whoSel=b=>`<select class="hub-inline" data-edit="ADM_Work__c" data-type="ref" data-id="${esc(b.id)}" data-field="Assignee__c" data-prev="${esc(b.assigneeId||'')}" data-label="${esc(b.name)} assignee" aria-label="Assignee of ${esc(b.name)}"><option value="">Unassigned</option>${B.members.map(m=>`<option value="${esc(m.id)}"${m.id===b.assigneeId?' selected':''}>${esc(m.name)}</option>`).join('')}${b.assigneeId&&!B.members.some(m=>m.id===b.assigneeId)?`<option value="${esc(b.assigneeId)}" selected>${esc(b.assignee)}</option>`:''}</select>`;
const link=b=>`<a class="bug-link" href="${H.GUS}ADM_Work__c/${esc(b.id)}/view" target="_blank" rel="noopener noreferrer">${esc(b.name)}</a>`;
function cardCounts(c){
  const items=c.items.filter(inMember);
  if(c.id==='perdev'){const over=new Set(items.map(i=>i.assigneeId)).size;return {a:over,b:B.who?(over?0:1):c.ok,la:'Over',lb:'OK',items,cls:['breached','ok']};}
  const n=s=>items.filter(i=>i.state===s).length;return {a:n('breached'),b:n('risk')+n('warn'),c:n('ok'),la:'Breached',lb:'At risk',lc:'OK',items,cls:['breached','risk','ok']};
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
    <div class="table-scroll"><table><thead><tr><th>#</th><th>SLA</th><th>Priority</th><th>GUS status</th><th>Work item</th><th>Subject</th><th>Assignee</th><th class="num">Age (days)</th><th class="num">Remaining</th><th class="num">Urgency</th></tr></thead><tbody>${items.length?items.map((b,n)=>`<tr><td>${n+1}</td><td><i class="dot ${b.state}" title="${STATES[b.state]}"></i></td><td>${b.priority?`<span class="sp-chip ${PCLS(b.priority)}">${esc(b.priority)}</span>`:'—'}</td><td>${statusSel(b,B.pick)}</td><td>${link(b)}</td><td class="sp-subject">${esc(b.subject)}</td><td>${whoSel(b)}</td><td class="num">${b.age}</td><td class="num ${b.state==='breached'?'late':''}">${remaining(b)}</td><td class="num">${b.urgency}</td></tr>`).join(''):'<tr><td colspan="10"><div class="empty-state hub-empty"><h3>Nothing here</h3><p>No items in this queue.</p></div></td></tr>'}</tbody></table></div>`;
    return;
  }
  const rows=bugRows();
  host.innerHTML=`<div class="table-scroll"><table><thead><tr><th>Bug</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assignee</th><th class="num">Pts</th><th>Found in</th><th class="num">Age</th></tr></thead><tbody>${rows.length?rows.map(b=>`<tr><td>${link(b)}</td><td class="sp-subject">${esc(b.subject)}</td>
  <td><select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(b.id)}" data-field="Priority__c" data-prev="${esc(b.priority)}" data-label="${esc(b.name)} priority" aria-label="Priority of ${esc(b.name)}">${H.options(pr,b.priority)}</select></td><td>${statusSel(b,B.pick)}</td><td>${whoSel(b)}</td>
  <td class="num"><input class="hub-inline num" type="number" min="0" step="0.5" data-edit="ADM_Work__c" data-type="num" data-id="${esc(b.id)}" data-field="Story_Points__c" data-prev="${b.points==null?'':esc(b.points)}" data-label="${esc(b.name)} points" aria-label="Story points of ${esc(b.name)}" value="${b.points==null?'':esc(b.points)}"></td><td>${esc(b.build)}</td><td class="num">${age(b.created)}</td></tr>`).join(''):`<tr><td colspan="8"><div class="empty-state hub-empty"><h3>No bugs match</h3><p>No ${[...B.pri].join('/')||'selected'} bugs for ${esc(H.team.short)} with these filters.</p></div></td></tr>`}</tbody></table></div>`;
  el.querySelector('#bug-count').textContent=rows.length;
  el.querySelector('#bug-counts').innerHTML=['P0','P1','P2'].map(p=>`<span class="sp-chip ${PCLS(p)}">${p} ${B.bugs.filter(b=>b.priority===p&&inMember(b)).length}</span>`).join('');
  const sts=[...new Set(B.bugs.map(b=>b.status))].sort();el.querySelector('#bug-status').innerHTML='<option value="">All statuses</option>'+sts.map(s=>`<option${s===B.status?' selected':''}>${esc(s)}</option>`).join('');
}
function drawChamp(el){
  const c=B.champ&&B.champ.champion;
  el.querySelector('#bug-champ').innerHTML=c?`<span class="champ on" title="Trust Champion">🏆 ${esc(c.name)}</span>`:'<span class="champ">No Trust Champion defined</span>';
  const s=el.querySelector('#bug-champ-set');s.innerHTML='<option value="">Set Trust Champion…</option>'+B.members.map(m=>`<option value="${esc(m.id)}"${c&&c.id===m.id?' selected':''}>${esc(m.name)}</option>`).join('');
}
function drawBugs(el){drawTiles(el);drawQueue(el);}
async function loadBugs(el){
  const my=++B.seq;el.querySelector('#bug-queue').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading bugs from GUS…</div>';
  try{
    const id=H.team.Id;
    const [r,sla,members,pick,champ]=await Promise.all([call('hub-bugs',{teamId:id,priorities:[...B.pri],includeClosed:B.closed}),call('hub-sla',{teamId:id}).catch(e=>({cards:[],error:e.message})),H.members().catch(()=>[]),H.picklists().catch(()=>null),call('hub-champion',{teamId:id}).catch(()=>null)]);
    if(my!==B.seq)return;B.bugs=r.bugs;B.sla=sla.cards||[];B.members=members;B.pick=pick;B.champ=champ;
    el.querySelector('#bug-who').innerHTML='<option value="">All members</option><option value="none">Unassigned</option>'+members.map(m=>`<option value="${esc(m.id)}"${m.id===B.who?' selected':''}>${esc(m.name)}</option>`).join('');
    drawChamp(el);drawBugs(el);
    if(sla.error)window.toast?.('SLA tiles unavailable: '+sla.error,true);
    if(r.truncated)window.toast?.('Showing the first 500 bugs. Narrow the filters.',false);
  }catch(e){if(my===B.seq)el.querySelector('#bug-queue').innerHTML=`<div class="empty-state hub-empty"><h3>Could not load bugs</h3><p>${esc(e.message)}</p></div>`;}
}
H.register({id:'bugs',label:'Bugs',icon:'bug',tone:'rose',desc:'SLA board and open P0–P2 bugs for the team',needsTeam:true,
  stat:home=>home?{big:home.bugs.P0+home.bugs.P1+home.bugs.P2,text:'open P0–P2 bugs',chips:['P0','P1','P2'].map(p=>`<span class="sp-chip ${PCLS(p)}">${p} ${home.bugs[p]}</span>`).join('')}:{text:'Open P0–P2 bugs for the team'},
  render(el){
    el.innerHTML=heading('bug','rose','Bugs',`SLA board for ${H.team.Name}. Click a tile for its priority queue; edit status, assignee, priority and points inline — changes save to GUS immediately.`,refreshBtn)+
    `<section class="table-card"><div class="filterbar bug-head"><label class="hub-field">Team<select class="sp-select" disabled aria-label="Team (set in the top filter)"><option>${esc(H.team.short||H.team.Name)}</option></select></label><label class="hub-field">Member<select id="bug-who" class="sp-select" aria-label="Member filter"><option value="">All members</option></select></label><span class="hub-field">Trust Champion<span id="bug-champ"></span></span><label class="hub-field">Set champion<select id="bug-champ-set" class="sp-select" aria-label="Set Trust Champion"></select></label></div>
    <div id="sla-tiles" class="sla-tiles" role="group" aria-label="SLA tiles"></div></section>
    <section class="table-card"><div class="filterbar" id="bug-allbar"><div class="epic-toolbar-title"><h2>Open bugs <span class="count-pill" id="bug-count">0</span></h2></div><div class="hub-chips" aria-label="Priority">${['P0','P1','P2','P3','P4'].map(p=>chipBtn('data-pri',p,p,B.pri.has(p))).join('')}</div><span id="bug-counts" class="sp-chips"></span><span class="toolbar-spacer"></span><select id="bug-status" class="sp-select" aria-label="Status filter"></select><label class="hub-check"><input type="checkbox" id="bug-closed"${B.closed?' checked':''}> Include closed</label><div class="search-box"><svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input id="bug-q" placeholder="Search bugs…" aria-label="Search bugs" value="${esc(B.q)}"></div></div><div id="bug-queue"></div><div class="table-footer"><span>Source: GUS · ADM_Work__c (Bug, Investigation) · ${esc(H.team.Name)} · SLA thresholds and urgency are computed in the dashboard</span></div></section>`;
    if(bugTeam!==H.team.Id){bugTeam=H.team.Id;B.who='';B.status='';B.sel='all';}
    withIcons(el);
    el.onclick=e=>{
      const c=e.target.closest('[data-pri]');if(c){const p=c.dataset.pri;B.pri.has(p)?B.pri.delete(p):B.pri.add(p);c.classList.toggle('on',B.pri.has(p));c.setAttribute('aria-pressed',String(B.pri.has(p)));loadBugs(el);return;}
      const t=e.target.closest('[data-sla]');if(t){B.sel=B.sel===t.dataset.sla?'all':t.dataset.sla;drawBugs(el);return;}
      const s=e.target.closest('[data-sel]');if(s){B.sel=s.dataset.sel;drawBugs(el);return;}
      if(e.target.closest('[data-refresh]'))loadBugs(el);};
    el.querySelector('#bug-closed').onchange=e=>{B.closed=e.target.checked;loadBugs(el);};
    el.querySelector('#bug-status').onchange=e=>{B.status=e.target.value;drawQueue(el);};
    el.querySelector('#bug-who').onchange=e=>{B.who=e.target.value;drawBugs(el);};
    el.querySelector('#bug-q').oninput=e=>{B.q=e.target.value;drawQueue(el);};
    el.querySelector('#bug-champ-set').onchange=async e=>{const m=B.members.find(x=>x.id===e.target.value);
      try{const r=await call('hub-champion-save',{teamId:H.team.Id,champion:m?{id:m.id,name:m.name}:null,revision:B.champ&&B.champ.revision});B.champ=r;drawChamp(el);window.toast?.(m?`Trust Champion set to ${m.name}`:'Trust Champion cleared',false);}
      catch(err){window.toast?.('Could not save Trust Champion: '+err.message,true);drawChamp(el);}};
    bindPage(el,(id,field,val)=>{
      const lists=[B.bugs,...B.sla.map(c=>c.items)];
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
const TF={data:null,pick:null,members:[],who:'',q:'',seq:0};
const tfAll=()=>[...(TF.data?.patch||[]),...(TF.data?.main||[])];
const tfRows=rows=>{const q=TF.q.toLowerCase();return rows.filter(r=>(!TF.who||(TF.who==='none'?!r.assigneeId:r.assigneeId===TF.who))&&(!q||(r.name+' '+r.subject+' '+r.assignee).toLowerCase().includes(q)));};
const build=(b,patch)=>b?`<span class="tf-build ${patch?'patch':'main'}">${esc(b)}</span>`:'—';
function tfSection(title,cls,desc,rows,pick){
  if(!rows.length)return '';
  return `<section class="tf-section ${cls}"><div class="tf-head"><b>${title}</b><span class="count-pill">${rows.length}</span><span>${esc(desc)}</span></div><div class="table-scroll"><table><thead><tr><th>ID</th><th>Subject</th><th>Assignee</th><th>Found in</th><th>Scheduled</th><th>Age</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><a href="${H.GUS}ADM_Work__c/${esc(r.id)}/view" target="_blank" rel="noopener noreferrer">${esc(r.name)}</a></td><td class="sp-subject" title="${esc(r.subject)}">${esc(r.subject.slice(0,140))}</td><td>${esc(r.assignee||'Unassigned')}</td><td>${build(r.found,r.found.includes('.'))}</td><td>${build(r.scheduled,r.scheduled.includes('.'))}</td><td class="${r.age>14?'tf-stale':''}">${r.age<1?'today':r.age+' days'}</td><td><select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(r.id)}" data-field="Status__c" data-prev="${esc(r.status)}" data-label="${esc(r.name)} status" aria-label="Status of ${esc(r.name)}">${H.options(pick?pick.workStatus:[],r.status)}</select></td></tr>`).join('')}</tbody></table></div></section>`;
}
function drawTests(el){
  const d=TF.data,patch=tfRows(d.patch),main=tfRows(d.main);
  el.querySelector('#tf-chips').innerHTML=`<span class="sp-chip rem">${d.patch.length} Patch TFs</span><span class="sp-chip add">${d.main.length} Main TFs</span>${d.truncated?'<span class="sp-chip warn">Showing first 500</span>':''}`;
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
    el.onclick=e=>{if(e.target.closest('[data-refresh]'))loadTests(el);};
    el.querySelector('#tf-q').oninput=e=>{TF.q=e.target.value;if(TF.data)drawTests(el);};
    el.querySelector('#tf-who').onchange=e=>{TF.who=e.target.value;if(TF.data)drawTests(el);};
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
H.register({id:'rotations',label:'Trust Champion',icon:'rotation',tone:'violet',desc:'PD on-call and Trust Hero rota',needsTeam:true,
  stat:(home,x)=>({big:x&&x.pd?x.pd.name.split(' ')[0]:'—',text:x&&x.th?`PD on-call · Trust Hero ${x.th.name.split(' ')[0]}`:'PD on-call and Trust Hero rota'}),
  render(el){
    el.innerHTML=heading('rotation','violet','Trust Champion — Rotations',`PD on-call and Trust Hero rota for ${H.team.Name}, saved in GUS Apps and shared with the team.`,refreshBtn)+
    `<datalist id="rota-names"></datalist><div id="rota-cards" class="rota-grid"></div>
    <section class="table-card rota-import"><div class="filterbar"><div class="epic-toolbar-title"><h2>Import from Slack</h2></div></div><div class="rota-import-body"><p class="note">The dashboard cannot read Slack history, so copy the rota message from the team channel (#mq-team or the MAPS channel) and paste it here. One shift per line, e.g. <code>Nov 10 - Nov 16: Jane Doe</code> or <code>2026-11-10 to 2026-11-16 Jane Doe</code>. A single date means a one-week shift.</p><div class="rota-import-row"><select id="rota-kind" class="sp-select" aria-label="Rotation type">${KINDS.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select><button class="button primary" id="rota-import">Import shifts</button></div><textarea id="rota-text" rows="5" placeholder="Paste the rota message here…" aria-label="Rota text"></textarea></div></section>`;
    withIcons(el);
    el.onclick=e=>{
      if(e.target.closest('[data-refresh]'))return loadRota(el);
      const add=e.target.closest('[data-radd]');if(add){const k=add.dataset.radd,last=R.rota[k].at(-1),start=last?iso(new Date(new Date(last.end+'T00:00:00Z').getTime()+864e5)):iso(new Date());R.rota[k].push({name:'New shift',start,end:iso(new Date(new Date(start+'T00:00:00Z').getTime()+6*864e5)),backup:''});saveRota(el,true);return;}
      const del=e.target.closest('[data-rdel]');if(del){const [k,i]=del.dataset.rdel.split(':');R.rota[k].splice(+i,1);saveRota(el,true);return;}
      if(e.target.closest('#rota-import')){const k=el.querySelector('#rota-kind').value,rows=parseRota(el.querySelector('#rota-text').value);if(!rows.length)return window.toast?.('No shifts found. Use lines like "Nov 10 - Nov 16: Jane Doe".',true);R.rota[k]=R.rota[k].concat(rows);saveRota(el);el.querySelector('#rota-text').value='';}
    };
    el.onchange=e=>{const f=e.target.closest('[data-rk]');if(!f)return;const row=R.rota[f.dataset.rk][+f.dataset.i];if(!row)return;row[f.dataset.f]=f.value;if(row.start>row.end&&f.dataset.f==='start')row.end=row.start;saveRota(el,true);};
    loadRota(el);
  }});
H.__parseRota=parseRota;
})();
