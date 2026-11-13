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
const withIcons=el=>el.querySelectorAll('[data-icon3d]').forEach(n=>{n.outerHTML=icon(n.dataset.icon3d,n.dataset.tone);});

// ── Bugs ────────────────────────────────────────────────────────────────────
const B={pri:new Set(['P0','P1','P2']),closed:false,status:'',who:'',q:'',bugs:[],members:[],pick:null,seq:0};
function bugRows(){
  const q=B.q.toLowerCase();
  return B.bugs.filter(b=>(!B.status||b.status===B.status)&&(!B.who||(B.who==='none'?!b.assigneeId:b.assigneeId===B.who))&&(!q||(b.name+' '+b.subject).toLowerCase().includes(q)));
}
function drawBugs(el){
  const rows=bugRows(),st=B.pick?B.pick.workStatus:[],pr=B.pick?B.pick.priority:['P0','P1','P2','P3','P4'];
  const counts=['P0','P1','P2'].map(p=>`<span class="sp-chip ${p==='P0'?'rem':p==='P1'?'warn':'add'}">${p} ${B.bugs.filter(b=>b.priority===p).length}</span>`).join('');
  el.querySelector('#bug-body').innerHTML=rows.length?rows.map(b=>`<tr><td><a href="${H.GUS}ADM_Work__c/${esc(b.id)}/view" target="_blank" rel="noopener noreferrer">${esc(b.name)}</a></td><td class="sp-subject">${esc(b.subject)}</td>
  <td><select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(b.id)}" data-field="Priority__c" data-prev="${esc(b.priority)}" data-label="${esc(b.name)} priority" aria-label="Priority of ${esc(b.name)}">${H.options(pr,b.priority)}</select></td>
  <td><select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(b.id)}" data-field="Status__c" data-prev="${esc(b.status)}" data-label="${esc(b.name)} status" aria-label="Status of ${esc(b.name)}">${H.options(st,b.status)}</select></td>
  <td><select class="hub-inline" data-edit="ADM_Work__c" data-type="ref" data-id="${esc(b.id)}" data-field="Assignee__c" data-prev="${esc(b.assigneeId||'')}" data-label="${esc(b.name)} assignee" aria-label="Assignee of ${esc(b.name)}"><option value="">Unassigned</option>${B.members.map(m=>`<option value="${esc(m.id)}"${m.id===b.assigneeId?' selected':''}>${esc(m.name)}</option>`).join('')}${b.assigneeId&&!B.members.some(m=>m.id===b.assigneeId)?`<option value="${esc(b.assigneeId)}" selected>${esc(b.assignee)}</option>`:''}</select></td>
  <td class="num"><input class="hub-inline num" type="number" min="0" step="0.5" data-edit="ADM_Work__c" data-type="num" data-id="${esc(b.id)}" data-field="Story_Points__c" data-prev="${b.points==null?'':esc(b.points)}" data-label="${esc(b.name)} points" aria-label="Story points of ${esc(b.name)}" value="${b.points==null?'':esc(b.points)}"></td><td>${esc(b.build)}</td><td class="num">${age(b.created)}</td></tr>`).join(''):`<tr><td colspan="8"><div class="empty-state hub-empty"><h3>No bugs match</h3><p>No ${[...B.pri].join('/')||'selected'} bugs for ${esc(H.team.short)} with these filters.</p></div></td></tr>`;
  el.querySelector('#bug-count').textContent=rows.length;el.querySelector('#bug-counts').innerHTML=counts;
  const sts=[...new Set(B.bugs.map(b=>b.status))].sort();el.querySelector('#bug-status').innerHTML='<option value="">All statuses</option>'+sts.map(s=>`<option${s===B.status?' selected':''}>${esc(s)}</option>`).join('');
}
async function loadBugs(el){
  const my=++B.seq;el.querySelector('#bug-body').innerHTML='<tr><td colspan="8" class="hub-loading">Loading bugs from GUS…</td></tr>';
  try{
    const [r,members,pick]=await Promise.all([call('hub-bugs',{teamId:H.team.Id,priorities:[...B.pri],includeClosed:B.closed}),H.members().catch(()=>[]),H.picklists().catch(()=>null)]);
    if(my!==B.seq)return;B.bugs=r.bugs;B.members=members;B.pick=pick;drawBugs(el);
    if(r.truncated)window.toast?.('Showing the first 500 bugs. Narrow the filters.',false);
  }catch(e){if(my===B.seq)el.querySelector('#bug-body').innerHTML=`<tr><td colspan="8"><div class="empty-state hub-empty"><h3>Could not load bugs</h3><p>${esc(e.message)}</p></div></td></tr>`;}
}
H.register({id:'bugs',label:'Bugs',icon:'bug',tone:'rose',desc:'Open P0–P2 bugs for the team',needsTeam:true,
  stat:home=>home?{big:home.bugs.P0+home.bugs.P1+home.bugs.P2,text:'open P0–P2 bugs',chips:['P0','P1','P2'].map(p=>`<span class="sp-chip ${p==='P0'?'rem':p==='P1'?'warn':'add'}">${p} ${home.bugs[p]}</span>`).join('')}:{text:'Open P0–P2 bugs for the team'},
  render(el){
    el.innerHTML=heading('bug','rose','Bugs',`Open bugs assigned to ${H.team.Name}. Edit priority, status, assignee and points inline; changes save to GUS immediately.`,refreshBtn)+
    `<section class="table-card"><div class="filterbar"><div class="epic-toolbar-title"><h2>Bugs <span class="count-pill" id="bug-count">0</span></h2></div><div class="hub-chips" aria-label="Priority">${['P0','P1','P2','P3','P4'].map(p=>chipBtn('data-pri',p,p,B.pri.has(p))).join('')}</div><span id="bug-counts" class="sp-chips"></span><span class="toolbar-spacer"></span><select id="bug-status" class="sp-select" aria-label="Status filter"></select><select id="bug-who" class="sp-select" aria-label="Assignee filter"><option value="">All assignees</option><option value="none">Unassigned</option></select><label class="hub-check"><input type="checkbox" id="bug-closed"${B.closed?' checked':''}> Include closed</label><div class="search-box"><svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input id="bug-q" placeholder="Search bugs…" aria-label="Search bugs" value="${esc(B.q)}"></div></div>
    <div class="table-scroll"><table><thead><tr><th>Bug</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assignee</th><th class="num">Pts</th><th>Found in</th><th class="num">Age</th></tr></thead><tbody id="bug-body"></tbody></table></div><div class="table-footer"><span>Source: GUS · ADM_Work__c (Bug) · ${esc(H.team.Name)}</span></div></section>`;
    withIcons(el);
    el.onclick=e=>{const c=e.target.closest('[data-pri]');if(c){const p=c.dataset.pri;B.pri.has(p)?B.pri.delete(p):B.pri.add(p);c.classList.toggle('on',B.pri.has(p));c.setAttribute('aria-pressed',String(B.pri.has(p)));loadBugs(el);}if(e.target.closest('[data-refresh]'))loadBugs(el);};
    el.querySelector('#bug-closed').onchange=e=>{B.closed=e.target.checked;loadBugs(el);};
    el.querySelector('#bug-status').onchange=e=>{B.status=e.target.value;drawBugs(el);};
    el.querySelector('#bug-who').onchange=e=>{B.who=e.target.value;drawBugs(el);};
    el.querySelector('#bug-q').oninput=e=>{B.q=e.target.value;drawBugs(el);};
    H.members().then(ms=>{const w=el.querySelector('#bug-who');if(w)w.insertAdjacentHTML('beforeend',ms.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''));},()=>{});
    if(!el.dataset.bound){el.dataset.bound='1';H.bindEdit(el,(id,field,val)=>{const b=B.bugs.find(x=>x.id===id);if(!b)return;if(field==='Priority__c')b.priority=val;else if(field==='Status__c')b.status=val;else if(field==='Assignee__c'){b.assigneeId=val;b.assignee=(B.members.find(m=>m.id===val)||{}).name||'';}else if(field==='Story_Points__c')b.points=val;el.querySelector('#bug-counts').innerHTML=['P0','P1','P2'].map(p=>`<span class="sp-chip ${p==='P0'?'rem':p==='P1'?'warn':'add'}">${p} ${B.bugs.filter(x=>x.priority===p).length}</span>`).join('');});}
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
  <td>${esc([t.dependentStory,t.providerStory].filter(Boolean).join(' → '))}</td></tr>`;}).join(''):`<tr><td colspan="7"><div class="empty-state hub-empty"><h3>No open ${T.dir} dependencies</h3><p>Nothing outstanding for ${esc(H.team.short)}.</p></div></td></tr>`;
}
async function loadTds(el){
  const my=++T.seq;el.querySelector('#td-body').innerHTML='<tr><td colspan="7" class="hub-loading">Loading dependencies from GUS…</td></tr>';
  try{const [d,p]=await Promise.all([call('hub-tds',{teamId:H.team.Id}),H.picklists().catch(()=>null)]);if(my!==T.seq)return;T.data=d;T.pick=p;drawTds(el);}
  catch(e){if(my===T.seq)el.querySelector('#td-body').innerHTML=`<tr><td colspan="7"><div class="empty-state hub-empty"><h3>Could not load dependencies</h3><p>${esc(e.message)}</p></div></td></tr>`;}
}
H.register({id:'tds',label:"TDs",icon:'td',tone:'amber',desc:'Incoming and outgoing team dependencies',needsTeam:true,
  stat:home=>home?{big:home.tds.incoming+home.tds.outgoing,text:'open team dependencies',chips:`<span class="sp-chip add">In ${home.tds.incoming}</span><span class="sp-chip warn">Out ${home.tds.outgoing}</span>`}:{text:'Incoming and outgoing team dependencies'},
  render(el){
    el.innerHTML=heading('td','amber','Team Dependencies',`Open TDs for ${H.team.Name}. Edit status and deliver-by date inline; changes save to GUS immediately.`,refreshBtn)+
    `<section class="table-card"><div class="filterbar"><div class="epic-toolbar-title"><h2>Dependencies</h2></div><nav class="sp-tabs" id="td-tabs" aria-label="Direction"></nav><span id="td-hint" class="note"></span></div><div class="table-scroll"><table><thead><tr><th>TD</th><th>Deliverable</th><th>Other team</th><th>Status</th><th>Deliver by</th><th>Target build</th><th>Stories</th></tr></thead><tbody id="td-body"></tbody></table></div><div class="table-footer"><span>Source: GUS · ADM_Team_Dependency__c · ${esc(H.team.Name)}</span></div></section>`;
    withIcons(el);
    el.onclick=e=>{const b=e.target.closest('[data-dir]');if(b&&T.data){T.dir=b.dataset.dir;drawTds(el);}if(e.target.closest('[data-refresh]'))loadTds(el);};
    if(!el.dataset.bound){el.dataset.bound='1';H.bindEdit(el,(id,field,val)=>{const t=[...(T.data?.outgoing||[]),...(T.data?.incoming||[])].find(x=>x.id===id);if(!t)return;if(field==='Dependency_Status__c')t.status=val;else if(field==='Deliver_By__c')t.deliverBy=val;});}
    loadTds(el);
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
H.register({id:'rotations',label:'Rotations',icon:'rotation',tone:'violet',desc:'PD on-call and Trust Hero rota',needsTeam:true,
  stat:(home,x)=>({big:x&&x.pd?x.pd.name.split(' ')[0]:'—',text:x&&x.th?`PD on-call · Trust Hero ${x.th.name.split(' ')[0]}`:'PD on-call and Trust Hero rota'}),
  render(el){
    el.innerHTML=heading('rotation','violet','Rotations',`PD on-call and Trust Hero rota for ${H.team.Name}, saved in GUS Apps and shared with the team.`,refreshBtn)+
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
