/* Sprint Insights: team sprint forecast (commitment, say-do, member breakdown). Read-only GUS data. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLOSED=new Set(['Closed','Fixed','Completed','Duplicate','Will Not Fix','Never','Inactive','Rejected']);
const CLOSED_BUG=new Set([...CLOSED,'Not a bug','Not Reproducible']);
const GUS_WORK='https://gus.lightning.force.com/lightning/r/ADM_Work__c/';
const S={pick:null,view:'pulse',standupIdx:0,ready:false,loading:false,teamId:'',sprintId:'',members:[],sprint:null,history:null,tab:'saydo',open:new Set(),search:'',seq:0};
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
  return `<article class="metric"><div class="metric-header"><span>${icon(ic,tone)}${esc(title)}</span></div><div class="metric-main"><div><div class="metric-value">${value}<span class="metric-unit">${esc(unit)}</span></div><p class="metric-detail">${esc(detail)}</p></div>${ring(value2,caption,color)}</div></article>`;
}
function renderMetrics(){
  const t=totals(S.members),sayDo=pct(t.committedDone,t.committed);
  $('sp-metrics').innerHTML=
    card('Say-Do','chart',sayDo>=80?'green':sayDo>=50?'amber':'rose',sayDo,'%',`${fmt(t.committedDone)} of ${fmt(t.committed)} committed pts done`,Math.min(sayDo,100),'say-do',sayDo>=80?'#2e844a':sayDo>=50?'#b57b22':'#ba0517')+
    card('Committed','stack','violet',fmt(t.committed),'pts',`${S.members.length} contributors`,pct(t.committedDone,t.committed),'done','#176b91')+
    card('Completed','publish','green',fmt(t.completed),'pts',`of ${fmt(t.activePts)} pts in sprint`,pct(t.completed,t.activePts),'complete','#2e844a')+
    card('Items closed','healthy','blue',`${t.closed}`,`/ ${t.items}`,`${t.spill} spillover item${t.spill===1?'':'s'}`,pct(t.closed,t.items),'closed','#0b827c')+
    card('Scope change','sync','amber',`+${t.added}`,`/ −${t.removed}`,'items added / removed',t.items?Math.min(100,pct(t.added+t.removed,t.items)):0,'churn','#b57b22');
}
function renderGoal(){
  const g=(S.sprint?.Goals__c||'').trim();
  $('sp-goal').classList.toggle('hidden',!g);$('sp-goal').textContent=g?'Sprint goal: '+g.replace(/\s+/g,' '):'';
}

// ── Members ─────────────────────────────────────────────────────────────────
const statusClass=i=>isClosed(i)?'closed':'open';
const statusSelect=i=>`<select class="hub-inline" data-edit="ADM_Work__c" data-id="${esc(i.id)}" data-field="Status__c" data-prev="${esc(i.status)}" data-label="${esc(i.name)} status" aria-label="Status of ${esc(i.name)}">${window.Hub.options(S.pick?S.pick.workStatus:[],i.status)}</select>`;
const ptsInput=i=>`<input class="hub-inline num" type="number" min="0" step="0.5" data-edit="ADM_Work__c" data-type="num" data-id="${esc(i.id)}" data-field="Story_Points__c" data-prev="${i.storyPoints==null?'':esc(i.storyPoints)}" data-label="${esc(i.name)} points" aria-label="Story points of ${esc(i.name)}" value="${i.storyPoints==null?'':esc(i.storyPoints)}">`;
function itemRow(i){
  const flag=i.itemStatus==='Added'?'<span class="sp-chip add">Added</span>':i.itemStatus==='Removed'?'<span class="sp-chip rem">Removed</span>':'';
  const changed=i.ptsChanged?`<span class="sp-chip chg" title="Forecast ${esc(i.forecastPts)} pts, now ${esc(i.storyPoints)} pts">pts changed</span>`:'';
  return `<tr class="${i.itemStatus==='Removed'?'sp-removed':''}"><td><a href="${GUS_WORK}${esc(i.id)}/view" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a></td><td class="sp-subject">${esc(i.subject)} ${flag}${changed}</td><td>${esc(i.recordType)}</td><td>${statusSelect(i)}</td><td class="num">${ptsInput(i)}</td><td class="num">${i.forecastPts==null?'—':esc(i.forecastPts)}</td></tr>`;
}
const itemsTable=rows=>`<div class="table-scroll sp-items"><table><thead><tr><th>Work</th><th>Subject</th><th>Type</th><th>Status</th><th class="num">Pts</th><th class="num">Forecast</th></tr></thead><tbody>${rows.map(itemRow).join('')}</tbody></table></div>`;
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
  const chips=`${m.closedCount?`<span class="sp-chip ok">✓ ${m.closedCount} closed</span>`:''}${m.spilloverCount?`<span class="sp-chip bad">⚠ ${m.spilloverCount} spillover</span>`:''}${m.addedCount?`<span class="sp-chip add">+${m.addedCount} added</span>`:''}${m.removedCount?`<span class="sp-chip chg">−${m.removedCount} removed</span>`:''}${m.ptsChangedCount?`<span class="sp-chip chg">Δ${m.ptsChangedCount} pts chg</span>`:''}`;
  return `<article class="sp-card${open?' open':''}" style="--card:${col}" data-member="${esc(m.name)}"><button class="sp-card-head" data-toggle="${esc(m.name)}" aria-expanded="${open}"><span class="su-av">${esc(initials(m.name))}</span><strong>${esc(m.name)}</strong><span class="sp-card-pts" title="Points done / committed">${fmt(done)}/${fmt(m.initialPts)}p <i>${open?'▾':'▸'}</i></span></button>
  <div class="sp-card-sum"><b>★ ${esc(sm.head)}</b><p>${esc(sm.text)}</p></div><div class="sp-chips">${chips}</div>
  ${open?`<div class="sp-card-body"><div class="sp-prog" title="${p}% of committed points done"><span>${fmt(done)} of ${fmt(m.initialPts)} committed pts done</span><span>${p}%</span></div><span class="sp-bar"><i style="width:${Math.min(p,100)}%;background:${col}"></i></span>${memberBody(m)}</div>`:''}</article>`;
}
function renderMembers(){
  const q=S.search.trim().toLowerCase();
  const list=S.members.filter(m=>!q||m.name.toLowerCase().includes(q)||m.items.some(i=>(i.name+' '+i.subject).toLowerCase().includes(q)));
  $('sp-member-count').textContent=list.length;
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
const initials=n=>String(n).split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const activeItems=m=>m.items.filter(i=>i.itemStatus!=='Removed');
const EPIC=id=>`https://gus.lightning.force.com/lightning/r/ADM_Epic__c/${id}/view`;
/** Epics of the selected member's sprint work items; epics they lead come first; items without an epic are grouped as Others. */
function epicCards(items,title,uid){
  const g=new Map();
  for(const i of items){const k=i.epicId||'__none';const e=g.get(k)||{name:i.epicId?i.epic:'Others — no epic linked',id:i.epicId,n:0,done:0,sp:0,lead:!!(uid&&i.epicLeadId===uid),leadName:i.epicLead};e.n++;e.sp+=spOf(i);if(isClosed(i))e.done++;g.set(k,e);}
  const list=[...g.values()].sort((a,b)=>(a.id==null)-(b.id==null)||b.lead-a.lead||b.sp-a.sp);
  const others=g.get('__none');
  return `<div class="su-epics"><h3>${esc(title)} <span class="count-pill">${list.length-(others?1:0)}</span></h3>${others?`<p class="su-callout">⚠ ${others.n} work item${others.n>1?'s have':' has'} no epic in GUS — grouped under “Others”.</p>`:''}<div class="su-epic-grid">${list.map(e=>`<article class="su-epic${e.id?'':' others'}${e.lead?' lead':''}"><strong title="${esc(e.name)}">${e.id?`<a href="${EPIC(esc(e.id))}" target="_blank" rel="noopener noreferrer">${esc(e.name)}</a>`:esc(e.name)}</strong>${e.lead?'<span class="sp-chip add">Development lead</span>':e.leadName?`<small class="su-lead">Dev lead: ${esc(e.leadName)}</small>`:''}<span>${e.done}/${e.n} items · ${fmt(e.sp)} SP</span><span class="sp-bar"><i style="width:${pct(e.done,e.n)}%;background:${e.id?'#2e844a':'#9aa5b1'}"></i></span></article>`).join('')}</div></div>`;
}
function renderStandup(){
  const host=$('sp-standup');if(S.view!=='standup')return;
  const ms=S.members.filter(m=>activeItems(m).length).sort((a,b)=>a.name.localeCompare(b.name));
  if(!ms.length){host.innerHTML='<div class="empty-state sp-empty"><h3>No work in this sprint</h3><p>There are no committed items for the selected sprint.</p></div>';return;}
  S.standupIdx=Math.min(Math.max(S.standupIdx,0),ms.length-1);const m=ms[S.standupIdx],items=activeItems(m).sort((a,b)=>isClosed(a)-isClosed(b)||String(a.name).localeCompare(String(b.name)));
  const sp=items.reduce((n,i)=>n+spOf(i),0),doneSp=items.filter(isClosed).reduce((n,i)=>n+spOf(i),0);
  const pills=ms.map((x,k)=>{const a=activeItems(x);return `<button class="su-pill${k===S.standupIdx?' active':''}" data-su="${k}" aria-pressed="${k===S.standupIdx}"><span class="su-av">${esc(initials(x.name))}</span><span>${esc(x.name)}</span><small>${a.length} WI · ${fmt(a.reduce((n,i)=>n+spOf(i),0))} SP</small></button>`;}).join('');
  host.innerHTML=`<section class="table-card su-card"><div class="su-pills" role="group" aria-label="Team members">${pills}</div>
  <div class="su-carousel"><div class="su-nav"><button class="button small" data-su-step="-1" aria-label="Previous member"${S.standupIdx===0?' disabled':''}>‹ Prev</button><div class="su-dots" role="tablist">${ms.map((x,k)=>`<button class="su-dot${k===S.standupIdx?' active':''}" data-su="${k}" role="tab" aria-selected="${k===S.standupIdx}" aria-label="${esc(x.name)}"></button>`).join('')}</div><button class="button small" data-su-step="1" aria-label="Next member"${S.standupIdx===ms.length-1?' disabled':''}>Next ›</button></div>
  <div class="su-member"><div class="su-member-head"><span class="su-av big">${esc(initials(m.name))}</span><div><h3>${esc(m.name)}</h3><p>${S.standupIdx+1} of ${ms.length} · ${items.filter(isClosed).length}/${items.length} items done · ${fmt(doneSp)}/${fmt(sp)} SP</p></div><span class="sp-bar su-bar"><i style="width:${Math.min(100,pct(doneSp,sp))}%;background:#2e844a"></i></span></div>
  ${epicCards(items,'Epics for '+m.name+'’s sprint work',(items.find(i=>i.assigneeId)||{}).assigneeId)}
  <ol class="su-items">${items.map(i=>`<li class="${isClosed(i)?'done':''}"><span class="su-no"></span><a href="${GUS_WORK}${esc(i.id)}/view" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a><span class="su-subject" title="${esc(i.subject)}">${esc(i.subject)}${i.itemStatus==='Added'?' <span class="sp-chip add">Added</span>':''}${i.epic?` <span class="sp-chip">${esc(i.epic)}</span>`:''}</span>${statusSelect(i)}${ptsInput(i)}</li>`).join('')}</ol></div></div></section>`;
}
function bindStandup(){
  $('sp-standup').addEventListener('click',e=>{const t=e.target.closest('[data-su],[data-su-step]');if(!t)return;S.standupIdx=t.dataset.su!=null?Number(t.dataset.su):S.standupIdx+Number(t.dataset.suStep);renderStandup();});
  document.addEventListener('keydown',e=>{if(S.view!=='standup'||document.body.dataset.hub!=='sprints'||/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;if(e.key==='ArrowRight'){S.standupIdx++;renderStandup();}else if(e.key==='ArrowLeft'){S.standupIdx--;renderStandup();}});
}

// ── Loading ─────────────────────────────────────────────────────────────────
function fill(sel,list,value,label){sel.innerHTML=list.map(o=>`<option value="${esc(o.Id)}"${o.Id===value?' selected':''}>${esc(label(o))}</option>`).join('');}
function busy(on,text){S.loading=on;$('sp-status').textContent=text||'';$('sp-status').classList.toggle('hidden',!text);$('sp-panel-body').setAttribute('aria-busy',String(on));$('sp-refresh').disabled=on;}
async function loadHistory(){
  const my=S.seq;
  try{const r=await call('sprint-history',{teamId:S.teamId});if(my===S.seq){S.history=r;renderChart();}}
  catch(e){if(my===S.seq)$('sp-chart').innerHTML=`<div class="empty-state sp-empty"><h3>Trend unavailable</h3><p>${esc(e.message)}</p></div>`;}
}
function applyData(d){S.sprint=d.sprint;S.members=d.members||[];S.sprintId=d.sprint?.Id||S.sprintId;renderGoal();renderMetrics();renderMembers();renderStandup();}
async function loadTeam(teamId){
  const my=++S.seq;S.teamId=teamId;S.history=null;S.members=[];S.open.clear();busy(true,'Loading sprint data from GUS…');
  $('sp-chart').innerHTML='<div class="sp-loading">Loading trend…</div>';
  try{
    const d=await call('sprint-initial',{teamId});if(my!==S.seq)return;
    fill($('sp-sprint'),d.sprints,d.defaultSprintId,s=>s.Name);S.sprintId=d.defaultSprintId||'';
    if(d.sprint)applyData(d);else{S.sprint=null;renderGoal();renderMetrics();renderMembers();}
    busy(false);void loadHistory();
  }catch(e){if(my!==S.seq)return;busy(false,'');window.toast?.('Sprint Insights: '+e.message,true);$('sp-members').innerHTML=`<div class="empty-state sp-empty"><h3>Could not load sprint data</h3><p>${esc(e.message)}</p></div>`;}
}
async function loadSprint(sprintId){
  const my=++S.seq;S.sprintId=sprintId;S.open.clear();busy(true,'Loading sprint…');
  try{const d=await call('sprint-data',{teamId:S.teamId,sprintId});if(my!==S.seq)return;applyData(d);busy(false);if(!S.history)void loadHistory();else renderChart();}
  catch(e){if(my!==S.seq)return;busy(false,'');window.toast?.('Sprint Insights: '+e.message,true);}
}
async function show(){
  const H=window.Hub;
  if(!S.pick)H.picklists().then(p=>{S.pick=p;if(S.members.length){renderMembers();renderStandup();}},()=>{});
  if(!H.hasTeam()){S.seq++;S.teamId='';S.members=[];$('sp-metrics').innerHTML='';$('sp-chart').innerHTML='';$('sp-trend-stats').innerHTML='';$('sp-standup').innerHTML='';
    $('sp-members').innerHTML='<div class="empty-state sp-empty"><h3>Select a team</h3><p>Pick a team in the filter at the top.</p></div>';$('sp-member-count').textContent='0';$('sp-row-count').textContent='';return;}
  if(S.teamId!==H.team.Id)await loadTeam(H.team.Id);
}
function setSubview(v){
  S.view=v;$('sp-pulse').classList.toggle('hidden',v!=='pulse');$('sp-standup').classList.toggle('hidden',v!=='standup');
  document.querySelectorAll('[data-sp-view]').forEach(x=>{const on=x.dataset.spView===v;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});
  if(v==='standup')renderStandup();
}
function bind(){
  document.querySelectorAll('[data-sp-view]').forEach(b=>b.onclick=()=>setSubview(b.dataset.spView));
  window.Hub.onTeam(()=>{if(document.body.dataset.hub==='sprints')show();});
  window.Hub.bindEdit($('sp-panel-body'),(id,field,val)=>{
    for(const m of S.members)for(const i of m.items)if(i.id===id){if(field==='Status__c')i.status=val;else if(field==='Story_Points__c'){i.storyPoints=val;i.ptsChanged=i.itemStatus!=='Removed'&&i.forecastPts!=null&&val!=null&&i.forecastPts!==val;}}
    renderMetrics();renderMembers();if(S.view==='standup')renderStandup();});
  $('sp-sprint').onchange=e=>loadSprint(e.target.value);
  $('sp-refresh').onclick=()=>loadTeam(S.teamId);
  $('sp-expand').onclick=()=>{S.members.forEach(m=>S.open.add(m.name));renderMembers();};
  $('sp-collapse').onclick=()=>{S.open.clear();renderMembers();};
  $('sp-search').oninput=e=>{S.search=e.target.value;renderMembers();};
  $('sp-members').addEventListener('click',e=>{const t=e.target.closest('[data-toggle]');if(!t)return;const n=t.dataset.toggle;S.open.has(n)?S.open.delete(n):S.open.add(n);renderMembers();});
  document.querySelectorAll('[data-sp-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.spTab;document.querySelectorAll('[data-sp-tab]').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});renderChart();});
}
window.SprintInsights={show};
bind();bindStandup();
// Page registry entry: the Sprint panel is an existing view, so the hub just switches to it.
window.Hub.register({id:'sprints',label:'Sprints',icon:'sprint',tone:'blue',desc:'Sprint pulse, say-do and daily standup',legacy:'sprint',needsTeam:false,
  stat:h=>{const s=h&&h.sprint;return s?{big:s.sayDo!=null?Math.round(s.sayDo)+'%':'—',text:`say-do · ${s.name}`}:{text:'Sprint pulse, say-do and daily standup'};}});
})();
