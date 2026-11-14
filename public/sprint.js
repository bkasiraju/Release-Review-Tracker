/* Sprint Insights: team sprint forecast (commitment, say-do, member breakdown). Read-only GUS data. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLOSED=new Set(['Closed','Fixed','Completed','Duplicate','Will Not Fix','Never','Inactive','Rejected']);
const CLOSED_BUG=new Set([...CLOSED,'Not a bug','Not Reproducible']);
const GUS_WORK='https://gus.lightning.force.com/lightning/r/ADM_Work__c/';
const S={pick:null,view:'pulse',standupIdx:0,ready:false,loading:false,teamId:'',sprintId:'',members:[],sprint:null,history:null,tab:'saydo',open:new Set(),sort:{key:'',dir:'asc'},order:null,modal:null,epic:null,mem:[],search:'',seq:0};
const icon=(n,t)=>window.ReviewIcons?window.ReviewIcons.icon(n,t):'';
const isClosed=i=>(i.status&&i.status.startsWith('Closed'))||(i.recordType==='Bug'?CLOSED_BUG:CLOSED).has(i.status);
const pts=i=>i.forecastPts!=null?i.forecastPts:(i.storyPoints||0);
const fmt=n=>Number.isInteger(n)?String(n):n.toFixed(1);
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const call=(action,data)=>window.api(action,data);

function totals(members){
  const all=members.flatMap(m=>m.items),active=all.filter(i=>i.itemStatus!=='Removed'),fc=all.filter(i=>i.itemStatus==='Forecasted');
  const sum=a=>a.reduce((n,i)=>n+pts(i),0);
  return {committed:sum(fc),committedDone:sum(fc.filter(isClosed)),completed:sum(active.filter(isClosed)),activePts:sum(active),
    items:active.length,closed:active.filter(isClosed).length,spill:fc.filter(i=>!isClosed(i)).length,
    added:all.filter(i=>i.itemStatus==='Added').length,removed:all.filter(i=>i.itemStatus==='Removed').length};
}
function ring(value,caption,color){return `<div class="metric-ring" style="--ring-value:${Math.min(100,Math.max(0,value))}%;--ring-color:${color}" role="img" aria-label="${value}% ${esc(caption)}"><span>${value}%<small>${esc(caption)}</small></span></div>`;}
function card(title,ic,tone,value,unit,detail,value2,caption,color){
  return `<article class="metric"><div class="metric-header"><span>${icon(ic,tone)}${esc(title)}</span></div><div class="metric-main"><div><div class="metric-value">${value}<span class="metric-unit">${esc(unit)}</span></div><p class="metric-detail">${esc(detail)}</p></div>${value2==null?'':ring(value2,caption,color)}</div></article>`;
}
function renderMetrics(){
  const t=totals(S.members),g=S.sprint&&S.sprint.gus;
  if(!g){$('sp-metrics').innerHTML='';return;}
  const fc=g.forecastClosedPct==null?0:Number(g.forecastClosedPct),n=v=>fmt(Math.round((v||0)*100)/100),dl=g.daysLeft;
  // Same definitions and values as the GUS sprint wall header (sprint record roll-ups).
  $('sp-metrics').innerHTML=
    card('Forecast Closed','chart',fc>=80?'green':fc>=50?'amber':'rose',(Math.round(fc*100)/100).toFixed(2),'%',`${n(g.forecastClosedPts)} of ${n(g.forecast)} forecast pts closed`,Math.min(100,Math.round(fc)),'say-do',sayColor(fc))+
    card('Forecast','stack','violet',n(g.forecast),'pts',`${S.members.length} contributors`,pct(g.forecastClosedPts,g.forecast),'closed','#176b91')+
    card('Closed','publish','green',n(g.closed),'pts',`${g.closedItems} of ${g.currentItems} items closed`,pct(g.closed,g.current),'of current','#2e844a')+
    card('Current','healthy','blue',n(g.current),'pts',`${g.currentItems} work items in sprint`,pct(g.closed,g.current),'closed','#0b827c')+
    card('Days Left','sync','amber',dl==null?'—':esc(dl),dl&&/^\d+$/.test(dl)?'days':'','sprint time remaining',null)+
    card('Scope change','sync','amber',`+${t.added}`,`/ −${t.removed}`,'items added / removed',t.items?Math.min(100,pct(t.added+t.removed,t.items)):0,'churn','#b57b22');
}
function renderGoal(){
  const g=(S.sprint?.Goals__c||'').trim();
  $('sp-goal').classList.toggle('hidden',!g);$('sp-goal').textContent=g?'Sprint goal: '+g.replace(/\s+/g,' '):'';
}

// ── Members ─────────────────────────────────────────────────────────────────
const statusClass=i=>isClosed(i)?'closed':'open';
const stCls=st=>{const x=String(st||'').toLowerCase();return /^closed|fixed|completed/.test(x)?'st-done':/review|qa|verif|test/.test(x)?'st-review':/progress|investigat/.test(x)?'st-prog':/block|wait|hold/.test(x)?'st-block':/never|duplicate|reject|will not|inactive/.test(x)?'st-off':'st-new';};
const planOf=items=>items.reduce((n,i)=>n+(i.itemStatus==='Forecasted'?(i.forecastPts||0):0),0);
const churnSum=items=>items.reduce((n,i)=>n+(churnOf(i)||0),0);
const sgn=n=>n>0?`+${fmt(n)}`:n<0?`−${fmt(-n)}`:'0';
/** Planned (green) · Actual (purple) · Churn · Done chips for a set of work items. */
const statChips=items=>{const act=items.filter(i=>i.itemStatus!=='Removed'),sp=l=>fmt(l.reduce((n,i)=>n+spOf(i),0)),g=(cls,l,lab,tip)=>`<span class="mchip ${cls}" title="${esc(tip)}">${lab} <b>${l.length} · ${sp(l)} SP</b></span>`,
  done=act.filter(isClosed),prog=act.filter(i=>!isClosed(i)&&/st-prog|st-review/.test(stCls(i.status))),blk=act.filter(i=>!isClosed(i)&&stCls(i.status)==='st-block');
  return `<span class="mchip pl" title="Story points planned at sprint start">Planned <b>${fmt(planOf(items))} SP</b></span><span class="mchip ac" title="Story points now (excludes removed items)">Actual <b>${fmt(act.reduce((n,i)=>n+spOf(i),0))} SP</b></span>`
   +g('dn2',done,'Completed','Items in a closed status')+g('ip',prog,'In progress','Items in progress, in review or in QA')+g('bk',blk,'Blocked','Items blocked, waiting or on hold');};
const churnOf=i=>i.itemStatus==='Added'?(i.storyPoints||0):i.forecastPts==null?null:(i.storyPoints||0)-i.forecastPts;
const planCell=i=>i.forecastPts==null?'<span class="muted">—</span>':`<span class="mchip pl sm">${esc(i.forecastPts)}</span>`;
const churnCell=i=>{const c=churnOf(i);return c==null?'<span class="muted">—</span>':`<span class="mchip ch sm ${c>0?'up':c<0?'dn':''}">${sgn(c)}</span>`;};
const planChip=i=>i.itemStatus==='Added'?'<span class="sp-chip add">Added</span>':i.itemStatus==='Removed'?'<span class="sp-chip rem">Removed</span>':'<span class="sp-chip plan">Planned</span>';
const whoSelect=i=>`<select class="hub-inline who" data-edit="ADM_Work__c" data-type="ref" data-id="${esc(i.id)}" data-field="Assignee__c" data-prev="${esc(i.assigneeId||'')}" data-label="${esc(i.name)} assignee" aria-label="Assignee of ${esc(i.name)}"><option value="">Unassigned</option>${S.mem.map(m=>`<option value="${esc(m.id)}"${m.id===i.assigneeId?' selected':''}>${esc(m.name)}</option>`).join('')}${i.assigneeId&&!S.mem.some(m=>m.id===i.assigneeId)?`<option value="${esc(i.assigneeId)}" selected>${esc((S.members.find(m=>m.items.includes(i))||{}).name||'Assigned')}</option>`:''}</select>`;
const statusSelect=i=>`<select class="hub-inline ${stCls(i.status)}" data-edit="ADM_Work__c" data-id="${esc(i.id)}" data-field="Status__c" data-prev="${esc(i.status)}" data-label="${esc(i.name)} status" aria-label="Status of ${esc(i.name)}">${window.Hub.options(S.pick?S.pick.workStatus:[],i.status)}</select>`;
const ptsInput=i=>`<input class="hub-inline num" type="number" min="0" step="0.5" data-edit="ADM_Work__c" data-type="num" data-id="${esc(i.id)}" data-field="Story_Points__c" data-prev="${i.storyPoints==null?'':esc(i.storyPoints)}" data-label="${esc(i.name)} points" aria-label="Story points of ${esc(i.name)}" value="${i.storyPoints==null?'':esc(i.storyPoints)}">`;
function itemRow(i,who){
  const flag=i.itemStatus==='Added'?'<span class="sp-chip add">Added</span>':i.itemStatus==='Removed'?'<span class="sp-chip rem">Removed</span>':'';
  const changed=i.ptsChanged?`<span class="sp-chip chg" title="Forecast ${esc(i.forecastPts)} pts, now ${esc(i.storyPoints)} pts">pts changed</span>`:'';
  return `<tr class="${i.itemStatus==='Removed'?'sp-removed':''}"><td><a href="${GUS_WORK}${esc(i.id)}/view" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a></td><td class="sp-subject" title="${esc(i.subject)}${i.epic?esc('\n\nEpic: '+i.epic):''}"><span class="sp-clip">${esc(i.subject)}</span>${who?`<span class="sp-tags">${itemTags(i)}</span>`:`${flag}${changed}`}</td><td class="sp-epic-cell" title="${esc(i.epic)}">${i.epicId?`<a href="${EPIC(esc(i.epicId))}" target="_blank" rel="noopener noreferrer">${esc(i.epic)}</a>`:'<span class="muted">—</span>'}</td><td class="sp-type">${esc(i.recordType)}</td>${who?`<td class="sp-qa-cell">${qaCell(i)}</td>`:''}<td>${statusSelect(i)}</td><td class="num">${planCell(i)}</td><td class="num">${ptsInput(i)}</td><td class="num">${churnCell(i)}</td></tr>`;
}
const SORTS={name:i=>i.name,subject:i=>i.subject,epic:i=>i.epic,recordType:i=>i.recordType,status:i=>i.status,forecast:i=>i.forecastPts,pts:i=>i.storyPoints,churn:churnOf};
function sortRows(rows){
  const k=S.sort.key;if(!k)return rows;const f=SORTS[k],d=S.sort.dir==='desc'?-1:1,none=v=>v==null||v==='';
  return [...rows].sort((a,b)=>{const x=f(a),y=f(b);if(none(x))return none(y)?0:1;if(none(y))return -1;return (typeof x==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'}))*d;});
}
const sortTh=(k,label,cls)=>{const on=S.sort.key===k;return `<th class="${cls||''}" aria-sort="${on?(S.sort.dir==='asc'?'ascending':'descending'):'none'}"><button type="button" class="sp-sort${on?' on':''}" data-sort="${k}" title="Sort by ${esc(label)}">${label}<i aria-hidden="true">${on?(S.sort.dir==='asc'?'▲':'▼'):'↕'}</i></button></th>`;};
const itemsTable=(rows,who)=>`<div class="table-scroll sp-items${who?' who':''}"><table><thead><tr>${sortTh('name','Work')}${sortTh('subject','Subject')}${sortTh('epic','Epic')}${sortTh('recordType','Type')}${who?'<th>QA</th>':''}${sortTh('status','Status')}${sortTh('forecast','Planned','num pl')}${sortTh('pts','Actual','num ac')}${sortTh('churn','Churn','num')}</tr></thead><tbody>${sortRows(rows).map(r=>itemRow(r,who)).join('')}</tbody></table></div>`;
// Summary text is derived from GUS commitment data only (no generated claims).
const names=(a,n=3)=>a.slice(0,n).map(i=>i.name).join(', ')+(a.length>n?` +${a.length-n} more`:'');
function memberSummary(m){
  const act=m.items.filter(i=>i.itemStatus!=='Removed'),fc=m.items.filter(i=>i.itemStatus==='Forecasted'),added=m.items.filter(i=>i.itemStatus==='Added'),removed=m.items.filter(i=>i.itemStatus==='Removed'),fcClosed=fc.filter(isClosed),spill=fc.filter(i=>!isClosed(i));
  let head;
  if(!act.length&&removed.length)head='Sprint cleared by full scope removal';
  else if(!fc.length&&added.length)head='No committed work; all items were added mid-sprint';
  else if(!fc.length)head='No committed work';
  else if(spill.length&&fcClosed.length)head=`${spill.length} committed item${spill.length>1?'s':''} still open`;
  else if(spill.length)head='No committed items closed';
  else if(added.length||removed.length)head='All committed items closed despite mid-sprint scope change';
  else head='All committed items closed';
  const bits=[];
  if(fc.length)bits.push(`Closed ${fcClosed.length} of ${fc.length} committed item${fc.length>1?'s':''} (${fmt(fcClosed.reduce((n,i)=>n+pts(i),0))}/${fmt(m.initialPts)} pts).`);
  if(added.length)bits.push(`Added: ${names(added)}.`);
  if(removed.length)bits.push(`Removed: ${names(removed)}.`);
  if(spill.length)bits.push(`Spillover: ${names(spill)}.`);
  return {head,text:bits.join(' ')||'No items in this sprint.',fc,added,removed,spill};
}
const miniItems=(list,cls)=>list.map(i=>`<li class="${cls}"><span class="sp-mi-top"><a href="${GUS_WORK}${esc(i.id)}/view" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a><span class="sp-pts-tag">${fmt(spOf(i))}p</span><span class="sp-status ${statusClass(i)}">${esc(i.status)}</span></span><span class="sp-mi-sub" title="${esc(i.subject)}">${esc(i.subject)}</span></li>`).join('');
function memberBody(m){
  const sm=memberSummary(m),rows=m.items.filter(i=>i.itemStatus==='Forecasted').sort((a,b)=>isClosed(a)-isClosed(b)||String(a.name).localeCompare(String(b.name)));
  return `${sm.added.length?`<h4 class="sp-sec add">Added mid-sprint</h4><ul class="sp-mini">${miniItems(sm.added,'')}</ul>`:''}${sm.removed.length?`<h4 class="sp-sec rem">Removed mid-sprint</h4><ul class="sp-mini">${miniItems(sm.removed,'rem')}</ul>`:''}${rows.length?`<h4 class="sp-sec">Committed work</h4>${itemsTable(rows)}`:''}`;
}
function memberHtml(m){
  const sm=memberSummary(m);m={...m,initialPts:sm.fc.reduce((n,i)=>n+pts(i),0),closedCount:m.items.filter(i=>i.itemStatus!=='Removed'&&isClosed(i)).length,spilloverCount:sm.spill.length,ptsChangedCount:m.items.filter(i=>i.itemStatus!=='Removed'&&i.forecastPts!=null&&i.storyPoints!=null&&i.forecastPts!==i.storyPoints).length};
  const done=sm.fc.filter(isClosed).reduce((n,i)=>n+pts(i),0),p=pct(done,m.initialPts),open=S.open.has(m.name);
  const col=!m.initialPts?(sm.removed.length?'#ba0517':'#9aa5b1'):p>=80?'#2e844a':p>=50?'#b57b22':'#ba0517';
  const chips=metricChips(m);
  return `<article class="sp-card${open?' open':''}" style="--card:${col}" data-member="${esc(m.name)}"><button class="sp-card-head" data-toggle="${esc(m.name)}" aria-expanded="${open}">${avImg(m)}<strong>${esc(m.name)}</strong><span class="sp-card-pts" title="Points done / committed">${fmt(done)}/${fmt(m.initialPts)}p <i>${open?'▾':'▸'}</i></span></button>
  <div class="sp-card-sum"><b>★ ${esc(sm.head)}</b><p>${esc(sm.text)}</p></div><div class="sp-chips">${chips}<button type="button" class="button small sp-open" data-open-member="${esc(m.name)}" title="Open full details with previous / next engineer">Open details ⤢</button></div>
  ${open?`<div class="sp-card-body"><div class="sp-prog" title="${p}% of committed points done"><span>${fmt(done)} of ${fmt(m.initialPts)} committed pts done</span><span>${p}%</span></div><span class="sp-bar"><i style="width:${Math.min(p,100)}%;background:${col}"></i></span>${memberBody(m)}</div>`:''}</article>`;
}
function renderMembers(){
  const q=S.search.trim().toLowerCase();
  const list=window.Hub.sortPeople(S.members.filter(m=>!q||m.name.toLowerCase().includes(q)||m.items.some(i=>(i.name+' '+i.subject).toLowerCase().includes(q))));
  $('sp-member-count').textContent=list.length;
  {const sel=$('sp-sprint'),nm=sel&&sel.selectedOptions[0]?sel.selectedOptions[0].textContent:'',cur=!S.defaultSprintId||S.sprintId===S.defaultSprintId;$('sp-member-title').textContent=cur?'Current sprint contributors':'Sprint contributors';$('sp-member-sub').textContent=nm?(cur?'Committed work in ':'Committed work in ')+nm:'';}
  $('sp-members').innerHTML=list.length?list.map(memberHtml).join(''):`<div class="empty-state sp-empty"><h3>${S.members.length?'No contributors match':'No committed work'}</h3><p>${S.members.length?'Try a different search.':'This sprint has no forecasted or added items.'}</p></div>`;
  $('sp-row-count').textContent=`${list.length} contributor${list.length===1?'':'s'}`;
}

// ── Trend chart (dependency-free SVG sized to its container, interactive tooltip) ──
const sayColor=v=>v>=80?'#2e844a':v>=50?'#b57b22':'#ba0517';
function renderChart(){
  const h=S.history?.history||[],host=$('sp-chart');
  if(!h.length){host.innerHTML='<div class="empty-state sp-empty"><h3>No sprint history</h3></div>';$('sp-trend-stats').innerHTML='';return;}
  const W=Math.max(320,Math.round(host.clientWidth||760)),H=300,L=48,R=20,T=30,B=44,pw=W-L-R,ph=H-T-B,n=h.length,slot=pw/n,cx=i=>L+slot*(i+.5);
  const axis=(max,step,suffix,y)=>{let o='';for(let v=0;v<=max;v+=step)o+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="sp-grid"/><text x="${L-10}" y="${y(v)+4}" text-anchor="end" class="sp-tick">${v}${suffix}</text>`;return o;};
  const xl=h.map((s,i)=>`<text x="${cx(i)}" y="${H-18}" text-anchor="middle" class="sp-tick sp-xl" data-i="${i}">${esc(s.shortName)}</text>`).join('');
  let svg='',tip;
  if(S.tab==='saydo'){
    const vals=h.map(s=>s.sayDo),top=Math.max(...vals.filter(v=>v!=null),0),max=Math.max(100,Math.ceil((top+10)/20)*20),y=v=>T+ph-ph*v/max;
    const pts_=vals.map((v,i)=>v==null?null:[cx(i),y(v),v]).filter(Boolean),d=pts_.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    svg=`<defs><linearGradient id="spg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#176b91" stop-opacity=".28"/><stop offset="1" stop-color="#176b91" stop-opacity="0"/></linearGradient></defs>`+
      `<rect x="${L}" y="${y(max)}" width="${pw}" height="${y(80)-y(max)}" class="sp-zone"/>`+axis(max,20,'%',y)+
      `<line x1="${L}" x2="${W-R}" y1="${y(80)}" y2="${y(80)}" class="sp-target"/><text x="${W-R-4}" y="${y(80)-6}" text-anchor="end" class="sp-tick sp-target-label">80% target</text>`+
      (pts_.length>1?`<path d="${d} L${pts_.at(-1)[0]} ${T+ph} L${pts_[0][0]} ${T+ph} Z" fill="url(#spg)" stroke="none"/><path d="${d}" class="sp-line"/>`:'')+
      pts_.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5.5" fill="${sayColor(p[2])}" class="sp-dot"/><text x="${p[0]}" y="${Math.max(T-8,p[1]-12)}" text-anchor="middle" class="sp-val">${p[2]}%</text>`).join('');
    tip=i=>{const s=h[i];return `<b>${esc(s.name)}</b><span>Say-do <strong style="color:${s.sayDo==null?'inherit':sayColor(s.sayDo)}">${s.sayDo==null?'—':s.sayDo+'%'}</strong></span><span>Committed ${fmt(s.committed)} pts · Completed ${fmt(s.completedPts)} pts</span><span>${s.completedItems}/${s.committedItems} committed items done</span>`;};
  }else{
    const pt=S.tab==='points',a=pt?h.map(s=>s.committed):h.map(s=>s.committedItems),b=pt?h.map(s=>s.completedPts):h.map(s=>s.completedItems);
    const top=Math.max(...a,...b,1),step=Math.max(1,Math.ceil(top*1.15/5)),max=step*Math.ceil(top*1.15/step),y=v=>T+ph-ph*v/max,bw=Math.min(30,slot/2.6),avg=b.reduce((x,v)=>x+v,0)/n;
    svg=axis(max,step,'',y)+h.map((_,i)=>[[a[i],'sp-bar-a',-bw-2],[b[i],'sp-bar-b',2]].map(([v,c,dx])=>`<rect x="${cx(i)+dx}" y="${y(v)}" width="${bw}" height="${Math.max(0,T+ph-y(v))}" rx="3" class="${c}"/><text x="${cx(i)+dx+bw/2}" y="${y(v)-6}" text-anchor="middle" class="sp-val">${fmt(v)}</text>`).join('')).join('')+
      `<line x1="${L}" x2="${W-R}" y1="${y(avg)}" y2="${y(avg)}" class="sp-target"/><text x="${W-R-4}" y="${y(avg)-6}" text-anchor="end" class="sp-tick sp-target-label">avg completed ${fmt(Math.round(avg*10)/10)}</text>`+
      `<g transform="translate(${L},6)"><rect width="10" height="10" rx="2" class="sp-bar-a"/><text x="15" y="9" class="sp-tick">Committed</text><rect x="86" width="10" height="10" rx="2" class="sp-bar-b"/><text x="101" y="9" class="sp-tick">Completed</text></g>`;
    tip=i=>{const s=h[i];return `<b>${esc(s.name)}</b><span>Committed <strong>${fmt(a[i])}</strong> ${pt?'pts':'items'}</span><span>Completed <strong>${fmt(b[i])}</strong> ${pt?'pts':'items'}</span><span>Say-do ${s.sayDo==null?'—':s.sayDo+'%'}</span>`;};
  }
  host.innerHTML=`<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sprint trend: ${esc(S.tab)}"><g class="sp-draw">${svg}</g>${xl}<line class="sp-guide" y1="${T}" y2="${T+ph}" x1="0" x2="0" visibility="hidden"/></svg><div class="sp-tip" role="status" hidden></div>`;
  const svgEl=host.firstElementChild,guide=svgEl.querySelector('.sp-guide'),tipEl=host.querySelector('.sp-tip');
  const move=e=>{const r=svgEl.getBoundingClientRect(),x=(e.clientX-r.left)*W/r.width,i=Math.min(n-1,Math.max(0,Math.floor((x-L)/slot)));
    guide.setAttribute('x1',cx(i));guide.setAttribute('x2',cx(i));guide.setAttribute('visibility','visible');tipEl.innerHTML=tip(i);tipEl.hidden=false;
    const px=cx(i)*r.width/W,tw=tipEl.offsetWidth;tipEl.style.left=Math.min(Math.max(4,px-tw/2),r.width-tw-4)+'px';tipEl.style.top='6px';
    svgEl.querySelectorAll('.sp-xl').forEach(t=>t.classList.toggle('on',Number(t.dataset.i)===i));};
  svgEl.onmousemove=move;svgEl.onmouseleave=()=>{guide.setAttribute('visibility','hidden');tipEl.hidden=true;svgEl.querySelectorAll('.sp-xl.on').forEach(t=>t.classList.remove('on'));};
  const done_=h.filter(s=>!s.inProgress),valid=done_.filter(s=>s.sayDo!=null),vs=valid.map(s=>s.sayDo),avg=vs.length?Math.round(vs.reduce((n,v)=>n+v,0)/vs.length):null,last=done_.at(-1)||h.at(-1);
  const mean=a=>a.length?a.reduce((n,v)=>n+v,0)/a.length:null,recent=mean(vs.slice(-3)),prior=mean(vs.slice(-6,-3));
  const trend=recent==null||prior==null?['—','']:recent-prior>=5?['↑ rising','#2e844a']:prior-recent>=5?['↓ falling','#ba0517']:['→ steady','#5b6b7c'];
  const stat=(k,v,c)=>`<div class="sp-stat"><span>${k}</span><strong${c?` style="color:${c}"`:''}>${v}</strong></div>`;
  $('sp-trend-stats').innerHTML=stat('Avg say-do',avg==null?'—':avg+'%',avg==null?'':sayColor(avg))+stat('Best sprint',vs.length?Math.max(...vs)+'%':'—','#2e844a')+stat('Worst sprint',vs.length?Math.min(...vs)+'%':'—',vs.length?sayColor(Math.min(...vs)):'')+stat('Trend',trend[0],trend[1])+stat('Latest',last.sayDo==null?'—':last.sayDo+'%',last.sayDo==null?'':sayColor(last.sayDo))+stat('Avg pts/sprint',fmt(Math.round(mean(done_.map(s=>s.completedPts))*10)/10)+' pts')+stat('Peak delivery',fmt(Math.max(0,...done_.map(s=>s.completedPts)))+' pts')+stat('Sprints ≥80%',vs.length?Math.round(vs.filter(v=>v>=80).length/vs.length*100)+'%':'—','#2e844a')+stat('Sprints tracked',done_.length+(h.length>done_.length?' + current':''));
}
let rz=null;if(window.ResizeObserver)new ResizeObserver(()=>{clearTimeout(rz);rz=setTimeout(()=>{if(S.history&&$('sp-chart').clientWidth&&Math.abs($('sp-chart').clientWidth-(S.cw||0))>8){S.cw=$('sp-chart').clientWidth;renderChart();}},120);}).observe($('sp-chart'));

// ── Standup (member carousel + epics in sprint + numbered items) ───────────
const spOf=i=>i.storyPoints==null?0:i.storyPoints;
const avatarOf=(id,name,big)=>{const pr=window.Hub.personAvatar&&window.Hub.personAvatar(id,name);
  return `<span class="su-av${big?' big':''}" data-i="${esc(initials(name))}">${pr&&pr.avatar?`<img src="${esc(pr.avatar)}" alt="" decoding="async" ${pr.alt&&pr.alt!==pr.avatar?`data-alt="${esc(pr.alt)}"`:''} onerror="var a=this.dataset.alt;if(a){this.removeAttribute('data-alt');this.src=a;}else this.remove()">`:''}</span>`;};
const qaCell=i=>i.qa?`<span class="sp-qa" title="QA engineer: ${esc(i.qa)}">${avatarOf(i.qaId,i.qa)}<span>${esc(i.qa)}</span></span>`:'<span class="muted" title="No QA engineer set in GUS">—</span>';
const isSpill=i=>i.itemStatus==='Forecasted'&&!isClosed(i);
const sprintCtx=()=>{const sel=$('sp-sprint');if(!sel)return {cur:'this sprint',next:'the next sprint'};const o=[...sel.options],k=o.findIndex(x=>x.value===S.sprintId);return {cur:k>=0?o[k].textContent:'this sprint',next:k>0?o[k-1].textContent:'the next sprint / backlog'};};
const itemTip=i=>{const c=sprintCtx(),fc=i.forecastPts==null?'—':fmt(i.forecastPts),sp=fmt(spOf(i));return {
  closed:`Closed: status “${i.status}”. Counts toward completed points (${sp} SP).`,
  spill:`Spillover: committed in ${c.cur} at ${fc} SP but not closed (status “${i.status}”). It carries over from ${c.cur} to ${c.next}.`,
  added:`Added: not in the sprint-start forecast. Pulled into ${c.cur} after it started — adds ${sp} SP.`,
  removed:`Removed: was committed in ${c.cur} at ${fc} SP and later taken out of the sprint (moved to the backlog or another sprint).`,
  chg:`Points changed: estimate moved from ${fc} SP (at commitment) to ${sp} SP (now).`};};
const itemTags=i=>{const t=itemTip(i);return `${isClosed(i)&&i.itemStatus!=='Removed'?`<span class="sp-chip ok" title="${esc(t.closed)}">✓ Closed</span>`:''}${isSpill(i)?`<span class="sp-chip bad" title="${esc(t.spill)}">⚠ Spillover</span>`:''}${i.itemStatus==='Added'?`<span class="sp-chip add" title="${esc(t.added)}">+ Added</span>`:''}${i.itemStatus==='Removed'?`<span class="sp-chip chg" title="${esc(t.removed)}">− Removed</span>`:''}${i.ptsChanged?`<span class="sp-chip chg" title="${esc(t.chg)}">Δ pts chg</span>`:''}`;};
const metricChips=m=>{const a=m.items,c=sprintCtx(),sum=l=>fmt(l.reduce((n,i)=>n+spOf(i),0)),fsum=l=>fmt(l.reduce((n,i)=>n+(i.forecastPts||0),0)),
  cl=a.filter(i=>i.itemStatus!=='Removed'&&isClosed(i)),sp=a.filter(isSpill),ad=a.filter(i=>i.itemStatus==='Added'),rm=a.filter(i=>i.itemStatus==='Removed'),pc=a.filter(i=>i.ptsChanged),net=pc.reduce((n,i)=>n+spOf(i)-(i.forecastPts||0),0),
  chs=a.filter(i=>churnOf(i)),cs=churnSum(a);
  const row=(i,val)=>`<li><b>${esc(i.name)}</b> ${esc(i.subject||'').slice(0,70)}<span class="sg-m">${esc(i.status||'')} · ${val}</span></li>`;
  const ch=(cls,l,txt,title,what,metrics,val)=>l.length?`<span class="sp-chip sg ${cls}" tabindex="0">${txt}<span class="sg-tip" role="tooltip"><strong>${esc(title)}</strong><em>${esc(what)}</em><span class="sg-k">${esc(metrics)}</span><ul>${l.slice(0,12).map(i=>row(i,val(i))).join('')}</ul>${l.length>12?`<span class="sg-k">+${l.length-12} more</span>`:''}</span></span>`:'';
  const cc=cs>0?'add':cs<0?'chg':'';
  return ch(cc,chs,`Churn ${sgn(cs)}`,'Churn','Actual points minus points planned at sprint start. Added work counts in full; removed work counts as zero.',`${chs.length} item(s) moved the total: planned ${fmt(planOf(a))} SP → actual ${fmt(a.filter(i=>i.itemStatus!=='Removed').reduce((n,i)=>n+spOf(i),0))} SP (${sgn(cs)}).`,i=>`${sgn(churnOf(i))} SP`)
   +ch('ok',cl,`✓ ${cl.length} closed`,'Closed',`Items now in a closed status in ${c.cur}.`,`${cl.length} item(s), ${sum(cl)} SP completed.`,i=>`${fmt(spOf(i))} SP`)
   +ch('bad',sp,`⚠ ${sp.length} spillover`,'Spillover',`Committed at sprint start in ${c.cur} but not closed. They carry over to ${c.next}.`,`${sp.length} item(s), ${sum(sp)} SP carrying over.`,i=>`${fmt(spOf(i))} SP`)
   +ch('add',ad,`+${ad.length} added`,'Added',`Not in the sprint-start forecast; pulled into ${c.cur} after it started.`,`${ad.length} item(s), +${sum(ad)} SP.`,i=>`+${fmt(spOf(i))} SP`)
   +ch('chg',rm,`−${rm.length} removed`,'Removed',`Committed in ${c.cur}, then taken out (moved to the backlog or another sprint).`,`${rm.length} item(s), ${fsum(rm)} SP originally committed.`,i=>`${fmt(i.forecastPts||0)} SP`)
   +ch('chg',pc,`Δ${pc.length} pts chg`,'Points changed','Estimate changed after the item was committed.',`${pc.length} item(s); net ${net>0?'+':''}${fmt(net)} SP (planned → now).`,i=>`${fmt(i.forecastPts)} → ${fmt(spOf(i))} SP`);};
const memberChips=m=>`<div class="mchips su-metrics su-signals"><span class="sg-l">Signals</span>${metricChips(m)||'<span class="muted">none</span>'}</div>`;
const avImg=(m,big)=>{const id=(m.items.find(i=>i.assigneeId)||{}).assigneeId,pr=window.Hub.personAvatar&&window.Hub.personAvatar(id,m.name);
  return `<span class="su-av${big?' big':''}" data-i="${esc(initials(m.name))}">${pr&&pr.avatar?`<img src="${esc(pr.avatar)}" alt="" decoding="async" ${pr.alt&&pr.alt!==pr.avatar?`data-alt="${esc(pr.alt)}"`:''} onerror="var a=this.dataset.alt;if(a){this.removeAttribute('data-alt');this.src=a;}else this.remove()">`:''}</span>`;};
const initials=n=>String(n).split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const activeItems=m=>m.items.filter(i=>i.itemStatus!=='Removed');
const EPIC=id=>`https://gus.lightning.force.com/lightning/r/ADM_Epic__c/${id}/view`;
/** Epics of the selected member's sprint work items; epics they lead come first; items without an epic are grouped as Others. */
const epicKey=i=>i.epicId||'__none';
/** The selected epic only applies while it exists in the member's items; otherwise no filter. */
const epicSel=items=>S.epic&&items.some(i=>epicKey(i)===S.epic)?S.epic:null;
S.types=S.types||new Set();
const typeOf=i=>i.recordType||'Other';
const epicFilter=items=>{const k=epicSel(items);let r=k?items.filter(i=>epicKey(i)===k):items;if(S.types.size)r=r.filter(i=>S.types.has(typeOf(i)));return r;};
const typeChips=items=>{const c=new Map();items.forEach(i=>c.set(typeOf(i),(c.get(typeOf(i))||0)+1));S.types.forEach(t=>{if(!c.has(t))c.set(t,0);});
  const all=!S.types.size;return `<div class="sp-typechips" role="group" aria-label="Filter work items by type"><button type="button" class="sp-tchip${all?' on':''}" data-type-chip="" aria-pressed="${all}">All <b>${items.length}</b></button>${[...c.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([t,n])=>`<button type="button" class="sp-tchip${S.types.has(t)?' on':''}" data-type-chip="${esc(t)}" aria-pressed="${S.types.has(t)}">${esc(t)} <b>${n}</b></button>`).join('')}</div>`;};
function epicCards(items,title,uid){
  const g=new Map();
  for(const i of items){const k=i.epicId||'__none';const e=g.get(k)||{name:i.epicId?i.epic:'Others — no epic linked',id:i.epicId,n:0,done:0,sp:0,lead:!!(uid&&i.epicLeadId===uid),leadName:i.epicLead};e.n++;e.sp+=spOf(i);if(isClosed(i))e.done++;g.set(k,e);}
  const list=[...g.values()].sort((a,b)=>(a.id==null)-(b.id==null)||b.lead-a.lead||b.sp-a.sp);
  const others=g.get('__none');
  return `<div class="su-epics"><h3>${esc(title)} <span class="count-pill">${list.length-(others?1:0)}</span>${epicSel(items)?'<button type="button" class="button small su-clear" data-epic-clear title="Clear epic filter (Esc)">Clear filter ✕</button>':'<small class="su-hint">Click an epic to filter its work items</small>'}</h3>${others?`<p class="su-callout">⚠ ${others.n} work item${others.n>1?'s have':' has'} no epic in GUS — grouped under “Others”.</p>`:''}<div class="su-epic-grid">${list.map(e=>`<article class="su-epic${e.id?'':' others'}${(e.id||'__none')===epicSel(items)?' sel':''}" data-epic="${esc(e.id||'__none')}" role="button" tabindex="0" aria-pressed="${(e.id||'__none')===epicSel(items)}"><strong title="${esc(e.name)}">${e.id?`<a href="${EPIC(esc(e.id))}" target="_blank" rel="noopener noreferrer">${esc(e.name)}</a>`:esc(e.name)}</strong>${e.lead?'<span class="sp-chip add">Development lead</span>':e.leadName?`<small class="su-lead">Dev lead: ${esc(e.leadName)}</small>`:''}<span>${e.done}/${e.n} items · ${fmt(e.sp)} SP</span><span class="sp-bar"><i style="width:${pct(e.done,e.n)}%;background:${e.id?'#2e844a':'#9aa5b1'}"></i></span></article>`).join('')}</div></div>`;
}
function orderedMembers(){
  const ms=S.members.filter(m=>activeItems(m).length).sort((a,b)=>a.name.localeCompare(b.name));
  if(!S.order)return window.Hub.sortPeople(ms);const ix=n=>{const k=S.order.indexOf(n);return k<0?1e9:k;};
  return window.Hub.sortPeople(ms.sort((a,b)=>ix(a.name)-ix(b.name)||a.name.localeCompare(b.name)));
}
function shuffle(){
  const names=orderedMembers().map(m=>m.name);if(names.length<2)return;
  for(let i=names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
  S.order=names;S.standupIdx=0;if(S.modal)S.modal=names[0];renderStandup();renderModal();window.toast?.('Standup order shuffled.');
}
function renderModal(){
  const old=$('sp-modal'),keep=old&&old.querySelector('.sp-modal-body'),top=keep?keep.scrollTop:0;
  if(old)old.remove();if(!S.modal)return;
  const ms=orderedMembers(),k=ms.findIndex(x=>x.name===S.modal);if(k<0){S.modal=null;return;}
  const m=ms[k],items=activeItems(m).sort((a,b)=>isClosed(a)-isClosed(b)||String(a.name).localeCompare(String(b.name)));
  const shown=epicFilter(items),sp=items.reduce((n,i)=>n+spOf(i),0),doneSp=items.filter(isClosed).reduce((n,i)=>n+spOf(i),0),pv=ms[k-1],nx=ms[k+1];
  const nav=(o,step,label,arrow)=>`<button type="button" class="sp-mnav" data-modal-step="${step}"${o?'':' disabled'} aria-label="${label}${o?': '+esc(o.name):''}">${step<0?`<b>${arrow}</b>`:''}<span><small>${label}</small>${o?esc(o.name):'—'}</span>${step>0?`<b>${arrow}</b>`:''}</button>`;
  const el=document.createElement('div');el.id='sp-modal';el.className='sp-modal'+(keep?' sp-swap':'');
  el.innerHTML=`<div class="sp-modal-card" role="dialog" aria-modal="true" aria-label="Standup review: ${esc(m.name)}">
  <div class="sp-modal-top">${nav(pv,-1,'Previous engineer','‹')}<div class="sp-mtitle">${avImg(m,1)}<div><h3>${esc(m.name)}</h3><div class="mchips su-groups">${statChips(items)}</div>${memberChips(m)}</div></div>${nav(nx,1,'Next engineer','›')}</div>
  <span class="sp-bar sp-bar-thin"><i style="width:${Math.min(100,pct(doneSp,sp))}%;background:#2e844a"></i></span>
  <div class="sp-modal-tools"><div class="sp-mstrip" role="group" aria-label="Jump to engineer">${ms.map(x=>`<button type="button" class="sp-mav${x.name===m.name?' on':''}" data-modal-go="${esc(x.name)}" title="${esc(x.name)}" aria-label="${esc(x.name)}"${x.name===m.name?' aria-current="true"':''}>${avImg(x,0)}</button>`).join('')}</div><span class="sp-mbtns"><button type="button" class="button small" data-shuffle title="Randomise the order of engineers for standup">🔀 Shuffle order</button><button type="button" class="button small" data-modal-close>Close ✕</button></span></div>
  <div class="sp-modal-body">${epicCards(items,'Epics',(items.find(i=>i.assigneeId)||{}).assigneeId)}<div class="sp-sec-row"><h4 class="sp-sec">Work items <span class="count-pill">${shown.length<items.length?`${shown.length} of ${items.length}`:items.length}</span></h4>${typeChips(items)}</div>${itemsTable(shown,true)}</div></div>`;
  $('sp-panel-body').appendChild(el);const b=el.querySelector('.sp-modal-body');b.scrollTop=top;if(!keep)el.querySelector('.sp-mnav:not([disabled]),[data-modal-close]').focus();
}
function bindModal(){
  $('sp-panel-body').addEventListener('click',e=>{
    const t=e.target;
    if(t.closest('[data-epic-clear]')){S.epic=null;renderStandup();renderModal();return;}
    const tc=t.closest('[data-type-chip]');if(tc){const v=tc.dataset.typeChip;if(!v)S.types.clear();else S.types.has(v)?S.types.delete(v):S.types.add(v);renderStandup();renderModal();return;}
    const ec=t.closest('[data-epic]');if(ec&&!t.closest('a')){S.epic=S.epic===ec.dataset.epic?null:ec.dataset.epic;renderStandup();renderModal();return;}
    const so=t.closest('[data-sort]');if(so){const k=so.dataset.sort;S.sort=S.sort.key===k?{key:k,dir:S.sort.dir==='asc'?'desc':'asc'}:{key:k,dir:'asc'};renderMembers();renderModal();return;}
    const op=t.closest('[data-open-member]');if(op){S.modal=op.dataset.openMember;renderModal();return;}
    const go=t.closest('[data-modal-go]');if(go){const ms=orderedMembers(),k=ms.findIndex(x=>x.name===go.dataset.modalGo);if(k>=0){S.modal=ms[k].name;S.standupIdx=k;renderModal();renderStandup();}return;}
    const st=t.closest('[data-modal-step]');if(st){const ms=orderedMembers(),k=ms.findIndex(x=>x.name===S.modal)+Number(st.dataset.modalStep);if(ms[k]){S.modal=ms[k].name;S.standupIdx=k;renderModal();renderStandup();}return;}
    if(t.closest('[data-shuffle]')){shuffle();return;}
    if(t.closest('[data-modal-close]')||t.id==='sp-modal'){S.modal=null;renderModal();}
  });
  document.addEventListener('keydown',e=>{
    if(!S.modal)return;
    if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[data-epic]')){e.preventDefault();e.target.click();return;}
    if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;
    const d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;
    const ms=orderedMembers(),k=ms.findIndex(x=>x.name===S.modal)+d;if(ms[k]){S.modal=ms[k].name;S.standupIdx=k;renderModal();renderStandup();}
  });
}
function renderStandup(){
  const host=$('sp-standup');if(S.view!=='standup')return;
  const ms=orderedMembers();
  if(!ms.length){{const a=$('sp-bar-actions');if(a)a.innerHTML='';}host.innerHTML='<div class="empty-state sp-empty"><h3>No work in this sprint</h3><p>There are no committed items for the selected sprint.</p></div>';return;}
  S.standupIdx=Math.min(Math.max(S.standupIdx,0),ms.length-1);const m=ms[S.standupIdx],all=activeItems(m).sort((a,b)=>isClosed(a)-isClosed(b)||String(a.name).localeCompare(String(b.name))),items=all;
  const sp=items.reduce((n,i)=>n+spOf(i),0),doneSp=items.filter(isClosed).reduce((n,i)=>n+spOf(i),0);
  const pills=ms.map((x,k)=>{const a=activeItems(x);return `<button class="su-pill${k===S.standupIdx?' active':''}" data-su="${k}" aria-pressed="${k===S.standupIdx}">${avImg(x)}<span>${esc(x.name)}</span><small class="pill-chips"><i class="mchip pl">${fmt(planOf(a))}</i><i class="mchip ac">${fmt(a.reduce((n,i)=>n+spOf(i),0))}</i><span>${a.length} WI</span></small></button>`;}).join('');
  const acts=$('sp-bar-actions');if(acts)acts.innerHTML=`<button class="button small" data-su-step="-1" aria-label="Previous member"${S.standupIdx===0?' disabled':''}>‹ Prev</button><button class="button small" data-su-step="1" aria-label="Next member"${S.standupIdx===ms.length-1?' disabled':''}>Next ›</button><button class="button small" data-shuffle title="Randomise the order of engineers for standup">🔀 Shuffle</button><button class="button small" data-open-member="${esc(m.name)}" title="Open in popup">Open ⤢</button>`;
  host.innerHTML=`<section class="table-card su-card"><div class="su-pills" role="group" aria-label="Team members">${pills}</div>
  <div class="su-carousel"><div class="su-nav"><div class="su-nav-c"><span class="su-count">${S.standupIdx+1} of ${ms.length}</span><div class="su-dots" role="tablist">${ms.map((x,k)=>`<button class="su-dot${k===S.standupIdx?' active':''}" data-su="${k}" role="tab" aria-selected="${k===S.standupIdx}" aria-label="${esc(x.name)}"></button>`).join('')}</div></div></div>
  <div class="su-member"><div class="su-member-head">${avImg(m,1)}<div><h3>${esc(m.name)}</h3><p>${S.standupIdx+1} of ${ms.length}</p><div class="mchips su-groups">${statChips(items)}</div>${memberChips(m)}</div><span class="sp-bar su-bar"><i style="width:${Math.min(100,pct(doneSp,sp))}%;background:#2e844a"></i></span></div>
  ${epicCards(items,'Epics for '+m.name+'’s sprint work',(items.find(i=>i.assigneeId)||{}).assigneeId)}
  <div class="sp-sec-row su-sec-row"><h4 class="sp-sec">Work items <span class="count-pill">${epicFilter(items).length<items.length?`${epicFilter(items).length} of ${items.length}`:items.length}</span></h4>${typeChips(items)}</div>
  <div class="su-cols" aria-hidden="true"><span>#</span><span>Work</span><span>Subject / Epic</span><span>QA</span><span>Status</span><span class="num pl">Planned</span><span class="num ac">Actual</span><span class="num">Churn</span></div>
  <ol class="su-items">${epicFilter(items).map(i=>`<li class="${isClosed(i)?'done':''}"><span class="su-no"></span><a href="${GUS_WORK}${esc(i.id)}/view" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a><span class="su-subject" title="${esc(i.subject)}${i.epic?esc('\n\nEpic: '+i.epic):''}">${esc(i.subject)}${i.epic?` <span class="sp-chip">${esc(i.epic)}</span>`:''} <span class="sp-tags">${itemTags(i)}</span></span>${qaCell(i)}${statusSelect(i)}<span class="num">${planCell(i)}</span>${ptsInput(i)}<span class="num">${churnCell(i)}</span></li>`).join('')}</ol></div></div></section>`;
}
function bindStandup(){
  const stepClick=e=>{const t=e.target.closest('[data-su],[data-su-step]');if(!t)return;S.standupIdx=t.dataset.su!=null?Number(t.dataset.su):S.standupIdx+Number(t.dataset.suStep);renderStandup();};
  $('sp-standup').addEventListener('click',stepClick);$('sp-sprintbar').addEventListener('click',stepClick);
  document.addEventListener('keydown',e=>{if(S.modal||S.view!=='standup'||document.body.dataset.hub!=='sprints'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;if(e.key==='ArrowRight'){S.standupIdx++;renderStandup();}else if(e.key==='ArrowLeft'){S.standupIdx--;renderStandup();}});
}

// ── Loading ─────────────────────────────────────────────────────────────────
function fill(sel,list,value,label){sel.innerHTML=list.map(o=>`<option value="${esc(o.Id)}"${o.Id===value?' selected':''}>${esc(label(o))}</option>`).join('');}
function busy(on,text){S.loading=on;$('sp-status').textContent=text||'';$('sp-status').classList.toggle('hidden',!text);$('sp-panel-body').setAttribute('aria-busy',String(on));$('sp-refresh').disabled=on;}
async function loadHistory(){
  const my=S.seq;
  try{const r=await call('sprint-history',{teamId:S.teamId});if(my===S.seq){S.history=r;renderChart();}}
  catch(e){if(my===S.seq)$('sp-chart').innerHTML=`<div class="empty-state sp-empty"><h3>Trend unavailable</h3><p>${esc(e.message)}</p></div>`;}
}
function applyData(d){S.sprint=d.sprint;S.members=d.members||[];S.sprintId=d.sprint?.Id||S.sprintId;renderGoal();renderMetrics();renderMembers();renderModal();renderStandup();}
async function loadTeam(teamId){
  const my=++S.seq;S.teamId=teamId;S.history=null;S.members=[];S.open.clear();S.order=null;S.modal=null;renderModal();busy(true,'Loading sprint data from GUS…');
  $('sp-chart').innerHTML='<div class="sp-loading">Loading trend…</div>';
  try{
    const d=await call('sprint-initial',{teamId});if(my!==S.seq)return;
    fill($('sp-sprint'),d.sprints,d.defaultSprintId,s=>s.Name);S.sprintId=d.defaultSprintId||'';S.defaultSprintId=d.defaultSprintId||'';
    if(d.sprint)applyData(d);else{S.sprint=null;renderGoal();renderMetrics();renderMembers();}
    busy(false);void loadHistory();
  }catch(e){if(my!==S.seq)return;busy(false,'');window.toast?.('Sprint Insights: '+e.message,true);$('sp-members').innerHTML=`<div class="empty-state sp-empty"><h3>Could not load sprint data</h3><p>${esc(e.message)}</p></div>`;}
}
async function loadSprint(sprintId){
  const my=++S.seq;S.sprintId=sprintId;S.open.clear();S.modal=null;renderModal();busy(true,'Loading sprint…');
  try{const d=await call('sprint-data',{teamId:S.teamId,sprintId});if(my!==S.seq)return;applyData(d);busy(false);if(!S.history)void loadHistory();else renderChart();}
  catch(e){if(my!==S.seq)return;busy(false,'');window.toast?.('Sprint Insights: '+e.message,true);}
}
async function show(){
  const H=window.Hub;H.peopleReady().then(()=>{if(S.members.length){renderMembers();renderModal();renderStandup();}});
  H.members().then(m=>{S.mem=m;if(S.members.length){renderMembers();renderModal();renderStandup();}},()=>{});
  if(!S.pick)H.picklists().then(p=>{S.pick=p;if(S.members.length){renderMembers();renderStandup();}},()=>{});
  if(!H.hasTeam()){S.seq++;S.teamId='';S.members=[];$('sp-metrics').innerHTML='';$('sp-chart').innerHTML='';$('sp-trend-stats').innerHTML='';$('sp-standup').innerHTML='';
    $('sp-members').innerHTML='<div class="empty-state sp-empty"><h3>Select a team</h3><p>Pick a team in the filter at the top.</p></div>';$('sp-member-count').textContent='0';$('sp-row-count').textContent='';return;}
  if(S.teamId!==H.team.Id)await loadTeam(H.team.Id);
}
function setSubview(v){
  S.view=v;$('sp-pulse').classList.toggle('hidden',v!=='pulse');$('sp-standup').classList.toggle('hidden',v!=='standup');
  document.querySelectorAll('[data-sp-view]').forEach(x=>{const on=x.dataset.spView===v;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});
  const ba=$('sp-bar-actions');if(ba&&v!=='standup')ba.innerHTML='';
  const bar=$('sp-sprintbar');if(bar){if(v==='standup'){const hb=document.querySelector('#sp-panel-body .heading-actions, .heading-actions .sp-tabs');const tabs=document.querySelector('.sp-tabs');tabs.before(bar);}else $('sp-metrics').before(bar);}
  if(v==='standup')renderStandup();
}
/** Move a work item to another engineer's group right away (the GUS write is already queued by Hub.bindEdit). */
function reassign(id,uid){
  const mem=S.mem.find(x=>x.id===uid),name=uid?(mem?mem.name:'Assigned'):'Unassigned';let item=null;
  for(const m of S.members){const k=m.items.findIndex(i=>i.id===id);if(k>=0){item=m.items.splice(k,1)[0];break;}}
  if(!item)return;item.assigneeId=uid||null;
  let to=S.members.find(m=>m.name===name);if(!to){to={name,items:[]};S.members.push(to);}
  to.items.push(item);S.members=S.members.filter(m=>m.items.length);
  for(const m of S.members){m.addedCount=m.items.filter(i=>i.itemStatus==='Added').length;m.removedCount=m.items.filter(i=>i.itemStatus==='Removed').length;}
}
function bind(){
  document.querySelectorAll('[data-sp-view]').forEach(b=>b.onclick=()=>setSubview(b.dataset.spView));
  window.Hub.onTeam(()=>{if(document.body.dataset.hub==='sprints')show();});
  window.Hub.bindEdit($('sp-panel-body'),(id,field,val)=>{
    if(field==='Assignee__c')reassign(id,val);
    for(const m of S.members)for(const i of m.items)if(i.id===id){if(field==='Status__c')i.status=val;else if(field==='Story_Points__c'){i.storyPoints=val;i.ptsChanged=i.itemStatus!=='Removed'&&i.forecastPts!=null&&val!=null&&i.forecastPts!==val;}}
    renderMetrics();renderMembers();renderModal();if(S.view==='standup')renderStandup();});
  $('sp-sprint').onchange=e=>loadSprint(e.target.value);
  $('sp-refresh').onclick=()=>loadTeam(S.teamId);
  $('sp-expand').onclick=()=>{S.members.forEach(m=>S.open.add(m.name));renderMembers();};
  $('sp-collapse').onclick=()=>{S.open.clear();renderMembers();};
  $('sp-search').oninput=e=>{S.search=e.target.value;renderMembers();};
  $('sp-members').addEventListener('click',e=>{const t=e.target.closest('[data-toggle]');if(!t)return;const n=t.dataset.toggle;S.open.has(n)?S.open.delete(n):S.open.add(n);renderMembers();});
  document.querySelectorAll('[data-sp-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.spTab;document.querySelectorAll('[data-sp-tab]').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});renderChart();});
}
window.SprintInsights={show};
bind();bindStandup();bindModal();
$('sp-standup').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-epic]')){e.preventDefault();e.target.click();}});
// Escape peels one level per press: popup → epic filter → search → sort → expanded cards
window.Hub.onEsc('sprints',()=>{
  if(S.modal){S.modal=null;renderModal();return true;}
  if(S.epic){S.epic=null;renderStandup();return true;}
  if(S.search){S.search='';$('sp-search').value='';renderMembers();return true;}
  if(S.sort.key){S.sort={key:'',dir:'asc'};renderMembers();return true;}
  if(S.open.size){S.open.clear();renderMembers();return true;}
  return false;
});
// Page registry entry: the Sprint panel is an existing view, so the hub just switches to it.
window.Hub.register({id:'sprints',label:'Sprints',icon:'sprint',tone:'blue',desc:'Sprint pulse, say-do and daily standup',legacy:'sprint',needsTeam:false,
  stat:h=>{const s=h&&h.sprint;return s?{big:s.sayDo!=null?Math.round(s.sayDo)+'%':'—',text:`say-do · ${s.name}`}:{text:'Sprint pulse, say-do and daily standup'};}});
})();
