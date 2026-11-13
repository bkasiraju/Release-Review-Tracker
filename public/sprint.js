/* Sprint Insights: team sprint forecast (commitment, say-do, member breakdown). Read-only GUS data. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLOSED=new Set(['Closed','Fixed','Completed','Duplicate','Will Not Fix','Never','Inactive','Rejected']);
const CLOSED_BUG=new Set([...CLOSED,'Not a bug','Not Reproducible']);
const GUS_WORK='https://gus.lightning.force.com/lightning/r/ADM_Work__c/';
const S={ready:false,loading:false,teamId:'',sprintId:'',members:[],sprint:null,history:null,tab:'saydo',open:new Set(),search:'',seq:0};
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
function itemRow(i){
  const flag=i.itemStatus==='Added'?'<span class="sp-chip add">Added</span>':i.itemStatus==='Removed'?'<span class="sp-chip rem">Removed</span>':'';
  const changed=i.ptsChanged?`<span class="sp-chip chg" title="Forecast ${esc(i.forecastPts)} pts, now ${esc(i.storyPoints)} pts">pts changed</span>`:'';
  return `<tr class="${i.itemStatus==='Removed'?'sp-removed':''}"><td><a href="${GUS_WORK}${esc(i.id)}/view" target="_blank" rel="noopener noreferrer">${esc(i.name)}</a></td><td class="sp-subject">${esc(i.subject)} ${flag}${changed}</td><td>${esc(i.recordType)}</td><td><span class="sp-status ${statusClass(i)}">${esc(i.status)}</span></td><td class="num">${i.storyPoints==null?'—':esc(i.storyPoints)}</td><td class="num">${i.forecastPts==null?'—':esc(i.forecastPts)}</td></tr>`;
}
function memberHtml(m){
  const forecasted=m.items.filter(i=>i.itemStatus==='Forecasted'),done=forecasted.filter(isClosed).reduce((n,i)=>n+pts(i),0);
  const p=pct(done,m.initialPts),col=p>=80?'#2e844a':p>=50?'#b57b22':'#ba0517',open=S.open.has(m.name);
  const rows=[...m.items].sort((a,b)=>isClosed(a)-isClosed(b)||String(a.name).localeCompare(String(b.name)));
  return `<details class="sp-member" data-member="${esc(m.name)}"${open?' open':''}><summary><span class="sp-name">${esc(m.name)}</span><span class="sp-bar" title="${p}% of committed points done"><i style="width:${Math.min(p,100)}%;background:${col}"></i></span><span class="sp-pts"><strong>${fmt(done)}</strong> / ${fmt(m.initialPts)} pts</span><span class="sp-chips"><span class="sp-chip ok">${m.closedCount} closed</span>${m.spilloverCount?`<span class="sp-chip warn">${m.spilloverCount} spillover</span>`:''}${m.addedCount?`<span class="sp-chip add">+${m.addedCount}</span>`:''}${m.removedCount?`<span class="sp-chip rem">−${m.removedCount}</span>`:''}</span></summary><div class="table-scroll sp-items"><table><thead><tr><th>Work</th><th>Subject</th><th>Type</th><th>Status</th><th class="num">Pts</th><th class="num">Forecast</th></tr></thead><tbody>${rows.map(itemRow).join('')}</tbody></table></div></details>`;
}
function renderMembers(){
  const q=S.search.trim().toLowerCase();
  const list=S.members.filter(m=>!q||m.name.toLowerCase().includes(q)||m.items.some(i=>(i.name+' '+i.subject).toLowerCase().includes(q)));
  $('sp-member-count').textContent=list.length;
  $('sp-members').innerHTML=list.length?list.map(memberHtml).join(''):`<div class="empty-state sp-empty"><h3>${S.members.length?'No contributors match':'No committed work'}</h3><p>${S.members.length?'Try a different search.':'This sprint has no forecasted or added items.'}</p></div>`;
  $('sp-row-count').textContent=`${list.length} contributor${list.length===1?'':'s'}`;
}

// ── Trend chart (dependency-free SVG, always fits its container) ────────────
function renderChart(){
  const h=S.history?.history||[],host=$('sp-chart');
  if(!h.length){host.innerHTML='<div class="empty-state sp-empty"><h3>No sprint history</h3></div>';$('sp-trend-stats').innerHTML='';return;}
  const W=760,H=270,L=46,R=18,T=26,B=40,pw=W-L-R,ph=H-T-B,n=h.length,x=i=>L+22+(n===1?(pw-44)/2:(pw-44)*i/(n-1)),bx=i=>L+pw*(i+.5)/n;
  const axis=(max,step,suffix)=>{let o='';for(let v=0;v<=max;v+=step){const y=T+ph-ph*v/max;o+=`<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" class="sp-grid"/><text x="${L-8}" y="${y+4}" text-anchor="end" class="sp-tick">${v}${suffix}</text>`;}return o;};
  const xl=(i,pos)=>`<text x="${pos}" y="${H-16}" text-anchor="middle" class="sp-tick">${esc(h[i].shortName)}</text>`;
  let svg='';
  if(S.tab==='saydo'){
    const vals=h.map(s=>s.sayDo),top=Math.max(...vals.filter(v=>v!=null),0),max=Math.max(120,Math.ceil((top+10)/20)*20),y=v=>T+ph-ph*v/max;
    const pts_=vals.map((v,i)=>v==null?null:[x(i),y(v),v]).filter(Boolean);
    svg=axis(max,20,'%')+`<line x1="${L}" x2="${W-R}" y1="${y(80)}" y2="${y(80)}" class="sp-target"/><text x="${W-R}" y="${y(80)-5}" text-anchor="end" class="sp-tick sp-target-label">80% target</text>`+
      (pts_.length>1?`<path d="${pts_.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')} L${pts_.at(-1)[0]} ${T+ph} L${pts_[0][0]} ${T+ph} Z" class="sp-area"/><path d="${pts_.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')}" class="sp-line"/>`:'')+
      pts_.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${p[2]>=80?'#2e844a':p[2]>=50?'#b57b22':'#ba0517'}" class="sp-dot"><title>${p[2]}%</title></circle><text x="${p[0]}" y="${Math.max(T-6,p[1]-10)}" text-anchor="middle" class="sp-val">${p[2]}%</text>`).join('')+h.map((_,i)=>xl(i,x(i))).join('');
  }else{
    const a=S.tab==='points'?h.map(s=>s.committed):h.map(s=>s.committedItems),b=S.tab==='points'?h.map(s=>s.completed):h.map(s=>s.completedItems);
    const top=Math.max(...a,...b,1),step=Math.max(1,Math.ceil(top*1.15/5)),max=step*Math.ceil(top*1.15/step),y=v=>T+ph-ph*v/max,bw=Math.min(26,pw/n/3);
    svg=axis(max,step,'')+h.map((_,i)=>[[a[i],'sp-bar-a',-bw-1],[b[i],'sp-bar-b',1]].map(([v,c,dx])=>`<rect x="${bx(i)+dx}" y="${y(v)}" width="${bw}" height="${T+ph-y(v)}" rx="3" class="${c}"><title>${v}</title></rect><text x="${bx(i)+dx+bw/2}" y="${y(v)-5}" text-anchor="middle" class="sp-val">${fmt(v)}</text>`).join('')).join('')+h.map((_,i)=>xl(i,bx(i))).join('')+
      `<g transform="translate(${W-R-190},8)"><rect width="10" height="10" rx="2" class="sp-bar-a"/><text x="15" y="9" class="sp-tick">Committed</text><rect x="90" width="10" height="10" rx="2" class="sp-bar-b"/><text x="105" y="9" class="sp-tick">Completed</text></g>`;
  }
  host.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Sprint trend: ${esc(S.tab)}" preserveAspectRatio="xMidYMid meet">${svg}</svg>`;
  const valid=h.filter(s=>s.sayDo!=null),avg=valid.length?Math.round(valid.reduce((n,s)=>n+s.sayDo,0)/valid.length):null,last=h.at(-1);
  const stat=(k,v)=>`<div class="sp-stat"><span>${k}</span><strong>${v}</strong></div>`;
  $('sp-trend-stats').innerHTML=stat('Avg say-do',avg==null?'—':avg+'%')+stat('Latest',last.sayDo==null?'—':last.sayDo+'%')+stat('Best',valid.length?Math.max(...valid.map(s=>s.sayDo))+'%':'—')+stat('Avg completed',fmt(Math.round(h.reduce((n,s)=>n+s.completedPts,0)/h.length*10)/10)+' pts')+stat('Sprints',h.length);
}

// ── Loading ─────────────────────────────────────────────────────────────────
function fill(sel,list,value,label){sel.innerHTML=list.map(o=>`<option value="${esc(o.Id)}"${o.Id===value?' selected':''}>${esc(label(o))}</option>`).join('');}
function busy(on,text){S.loading=on;$('sp-status').textContent=text||'';$('sp-status').classList.toggle('hidden',!text);$('sp-panel-body').setAttribute('aria-busy',String(on));$('sp-refresh').disabled=on;}
async function loadHistory(){
  const my=S.seq;
  try{const r=await call('sprint-history',{teamId:S.teamId});if(my===S.seq){S.history=r;renderChart();}}
  catch(e){if(my===S.seq)$('sp-chart').innerHTML=`<div class="empty-state sp-empty"><h3>Trend unavailable</h3><p>${esc(e.message)}</p></div>`;}
}
function applyData(d){S.sprint=d.sprint;S.members=d.members||[];S.sprintId=d.sprint?.Id||S.sprintId;renderGoal();renderMetrics();renderMembers();}
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
async function init(){
  if(S.ready)return;S.ready=true;
  try{
    const t=await call('sprint-teams',{});fill($('sp-team'),t.teams,t.primaryTeamId||t.teams[0].Id,x=>x.Name);
    await loadTeam($('sp-team').value);
  }catch(e){S.ready=false;window.toast?.('Sprint Insights: '+e.message,true);}
}
function bind(){
  $('sp-team').onchange=e=>loadTeam(e.target.value);
  $('sp-sprint').onchange=e=>loadSprint(e.target.value);
  $('sp-refresh').onclick=()=>loadTeam(S.teamId).then(()=>window.toast?.('Sprint data refreshed from GUS.'));
  $('sp-expand').onclick=()=>{S.members.forEach(m=>S.open.add(m.name));renderMembers();};
  $('sp-collapse').onclick=()=>{S.open.clear();renderMembers();};
  $('sp-search').oninput=e=>{S.search=e.target.value;renderMembers();};
  $('sp-members').addEventListener('toggle',e=>{const d=e.target;if(!d.dataset?.member)return;d.open?S.open.add(d.dataset.member):S.open.delete(d.dataset.member);},true);
  document.querySelectorAll('[data-sp-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.spTab;document.querySelectorAll('[data-sp-tab]').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',String(on));});renderChart();});
}
window.SprintInsights={show:init};
bind();
})();
