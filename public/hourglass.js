/* Hourglass: PR cycle-time metrics per HRP team and sprint. Data is a static file built offline by scripts/hourglass/*
 * (GUS + git.soma, no AI). Registers the Hourglass page with Hub. */
(function(){
'use strict';
const H=window.Hub,{esc,icon}=H;
const REPORT='https://git.soma.salesforce.com/pages/core-foundational-services/hourglass/reports/';
const T={median:8,p80:16,under:90}; // Hourglass targets
const S={data:null,team:'all',sprint:'2026.11a',sort:'median_h',dir:1};
const f1=v=>v==null?'–':(Math.round(v*10)/10).toString();
const hh=v=>v==null?'–':f1(v)+'h';
const tone=(v,t,hi)=>v==null?'':(hi?v>=t:v<=t)?'ok':(hi?v>=t*.8:v<=t*2)?'warn':'bad';
const sum=(t,sp)=>(t.sprints[sp]||{}).summary;
const load=()=>S.data?Promise.resolve(S.data):fetch('./hourglass-data.json?v=4.0.0-GA-plan132').then(r=>{if(!r.ok)throw new Error('Hourglass data not found ('+r.status+')');return r.json();}).then(d=>(S.data=d));
const sprintsOf=d=>{const all=new Set();Object.values(d.teams).forEach(t=>{Object.keys(t.sprints).forEach(s=>all.add(s));Object.keys(t.published).forEach(s=>all.add(s));});return [...all].sort().reverse();};
const generated=(d,sp)=>Object.values(d.teams).some(t=>t.sprints[sp]);
const tile=(label,val,target,cls,sub)=>`<div class="hg-tile ${cls||''}"><div class="hg-tl">${label}</div><div class="hg-tv">${val}</div><div class="hg-ts">${target?'Target '+target:''}${sub?(target?' · ':'')+sub:''}</div></div>`;
const median=a=>{const v=a.filter(x=>x!=null).sort((x,y)=>x-y);if(!v.length)return null;const m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2;};

function trend(t){
  const pts=[...Object.entries(t.published).map(([s,m])=>({s,m:m.median_h,p:m.p80_h,pub:1})),...Object.entries(t.sprints).map(([s,x])=>({s,m:x.summary.median_h,p:x.summary.p80_h,pub:0}))]
    .filter(p=>p.m!=null).sort((a,b)=>a.s<b.s?-1:1).filter((p,i,a)=>!(p.pub&&a.some(q=>q.s===p.s&&!q.pub)));
  if(pts.length<2)return '<p class="hg-sub">Not enough sprints for a trend.</p>';
  const W=560,Hh=170,pl=34,pb=24,mx=Math.max(...pts.map(p=>p.p||0),T.p80*1.2),x=i=>pl+i*(W-pl-10)/(pts.length-1),y=v=>Hh-pb-(v/mx)*(Hh-pb-10);
  const line=(k,c)=>`<polyline fill="none" stroke="${c}" stroke-width="2.2" points="${pts.map((p,i)=>p[k]==null?'':x(i)+','+y(p[k])).filter(Boolean).join(' ')}"/>`+pts.map((p,i)=>p[k]==null?'':`<circle cx="${x(i)}" cy="${y(p[k])}" r="3.4" fill="${c}" ${p.pub?'':'stroke="#fff" stroke-width="1.5"'}><title>${p.s} ${k==='m'?'median':'P80'} ${hh(p[k])}</title></circle>`).join('');
  return `<svg class="hg-trend" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Median and P80 cycle time by sprint">
  ${[T.median,T.p80].map(v=>`<line x1="${pl}" x2="${W-10}" y1="${y(v)}" y2="${y(v)}" stroke="#94a3b8" stroke-dasharray="3 4"/><text x="2" y="${y(v)+3}" font-size="9" fill="#81889a">${v}h</text>`).join('')}
  ${line('p','#d15b68')}${line('m','#0b6fa8')}
  ${pts.map((p,i)=>`<text x="${x(i)}" y="${Hh-6}" font-size="9" text-anchor="middle" fill="#81889a">${p.s.replace('2026.','')}</text>`).join('')}</svg>
  <div class="hg-legend"><span><i style="background:#0b6fa8"></i>Median</span><span><i style="background:#d15b68"></i>P80</span><span class="hg-sub">Dashed lines are the 8h and 16h targets. Sprints up to 09a come from the published Hourglass reports; 10b and later are generated here (see method note).</span></div>`;
}
function dist(d){const mx=Math.max(1,...d.map(b=>b.n)),tot=d.reduce((a,b)=>a+b.n,0)||1;
  return `<div class="hg-dist">${d.map((b,i)=>`<div class="hg-col"><div class="hg-bn">${b.n} <span>${Math.round(100*b.n/tot)}%</span></div><div class="hg-fill c${i}" style="height:${Math.max(3,100*b.n/mx)}%"></div><div class="hg-bl">${esc(b.label)}</div></div>`).join('')}</div>`;}

function teamView(key){
  const t=S.data.teams[key],sp=t.sprints[S.sprint],pub=t.published[S.sprint];
  if(!sp){
    return `<section class="table-card hg-card"><h3>${esc(t.name)} · ${S.sprint}</h3>${pub?`<div class="hg-tiles">${tile('Merged PRs',pub.prs,'',null)}${tile('Median',hh(pub.median_h),'≤ '+T.median+'h',tone(pub.median_h,T.median))}${tile('P80',hh(pub.p80_h),'≤ '+T.p80+'h',tone(pub.p80_h,T.p80))}${tile('Merged &lt; 24h',f1(pub.pct_under_24h)+'%','≥ '+T.under+'%',tone(pub.pct_under_24h,T.under,1))}</div><p class="hg-sub">Published Hourglass report. <a href="${REPORT}${esc(key)}_PR_CycleTime_${S.sprint}.html" target="_blank" rel="noopener">Open the full report</a></p>`:'<p class="hg-sub">No data for this team and sprint (the team may not run this sprint).</p>'}</section><section class="table-card hg-card"><h3>Trend</h3>${trend(t)}</section>`;
  }
  const s=sp.summary,g=sp.gaps||{};
  return `<section class="table-card hg-card"><div class="hg-head"><h3>${esc(t.name)} · ${S.sprint}</h3><span class="hg-sub">${sp.sprint.start} to ${sp.sprint.end}${sp.sprint.in_progress?' · <b class="hg-live">in progress</b>':''}</span></div>
   <div class="hg-tiles">${tile('Merged PRs',s.merged,'',null,s.work_items_with_pr+' of '+s.work_items+' work items')}${tile('Median',hh(s.median_h),'≤ '+T.median+'h',tone(s.median_h,T.median))}${tile('P80',hh(s.p80_h),'≤ '+T.p80+'h',tone(s.p80_h,T.p80))}${tile('Merged &lt; 24h',s.pct_under_24h+'%','≥ '+T.under+'%',tone(s.pct_under_24h,T.under,1))}${tile('First review',hh(s.median_ttfr_h),'',null,s.pct_ttfr_over_24h+'% over 24h')}${tile('Avg comments',f1(s.avg_comments),'',null,s.pct_large+'% large PRs')}</div></section>
  <div class="hg-grid"><section class="table-card hg-card"><h3>Cycle-time distribution</h3>${dist(sp.dist)}</section><section class="table-card hg-card"><h3>Trend</h3>${trend(t)}</section></div>
  <section class="table-card hg-card"><h3>Recommendations</h3>${sp.recommendations.length?sp.recommendations.map(r=>`<div class="hg-rec"><span class="hg-pri ${r.priority}">${r.priority}</span><div><b>${esc(r.action)}</b><p>${esc(r.description)}</p><span class="hg-sub">Owner: ${esc(r.owner)} · ${esc(r.impact)}</span></div></div>`).join(''):'<p class="hg-sub">No bottleneck over 24h: nothing to recommend.</p>'}</section>
  <section class="table-card hg-card"><h3>Root causes</h3>${sp.root_causes.length?`<table class="hg-table"><thead><tr><th>#</th><th>Cause</th><th>PRs</th><th>Hours past 24h</th><th>Share</th><th>Examples</th></tr></thead><tbody>${sp.root_causes.map(c=>`<tr><td>${c.rank}</td><td>${esc(c.cause)}</td><td>${c.prs_affected}</td><td>${c.hours_lost}</td><td><div class="hg-meter"><i style="width:${c.pct_of_delay}%"></i></div>${c.pct_of_delay}%</td><td class="hg-sub">${c.examples.map(esc).join(', ')}</td></tr>`).join('')}</tbody></table>`:'<p class="hg-sub">No PRs over 24h.</p>'}</section>
  <section class="table-card hg-card"><h3>Repositories</h3><table class="hg-table"><thead><tr><th>Repository</th><th>PRs</th><th>Avg cycle</th><th>Median cycle</th></tr></thead><tbody>${sp.repos.map(r=>`<tr><td>${esc(r.repo)}</td><td>${r.prs}</td><td>${hh(r.avg_cycle_h)}</td><td>${hh(r.median_cycle_h)}</td></tr>`).join('')}</tbody></table></section>
  <section class="table-card hg-card"><h3>Slowest PRs</h3><table class="hg-table"><thead><tr><th>PR</th><th>Cycle</th><th>First review</th><th>Comments</th><th>Lines</th><th>Why</th></tr></thead><tbody>${sp.slowest.map(p=>`<tr><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.repo.split('/')[1])}#${p.num}</a><div class="hg-sub">${esc(p.title)}</div></td><td>${hh(p.cycle_h)}</td><td>${hh(p.ttfr_h)}</td><td>${p.comments}</td><td>${p.size}</td><td>${p.tags.map(x=>`<span class="hg-tag">${esc(x)}</span>`).join('')}</td></tr>`).join('')}</tbody></table></section>
  <section class="table-card hg-card"><h3>Visibility gaps</h3><ul class="hg-gaps"><li><b>${g.with_pr}</b> of ${g.work_items} work items resolved to a PR with the work-item number in its title.</li><li><b>${g.no_pr}</b> work items had no matching PR (non-code or not tagged <code>@W-…</code>).</li></ul></section>`;
}
function allView(){
  const rows=Object.entries(S.data.teams).map(([k,t])=>{const s=sum(t,S.sprint),p=t.published[S.sprint];const m=s||(p&&{merged:p.prs,median_h:p.median_h,p80_h:p.p80_h,pct_under_24h:p.pct_under_24h});return m?{k,name:t.name,m}:null;}).filter(Boolean);
  const v=r=>S.sort==='name'?r.name:S.sort==='merged'?r.m.merged:r.m[S.sort];
  rows.sort((a,b)=>{const x=v(a),y=v(b);if(x==null)return 1;if(y==null)return -1;return (x<y?-1:x>y?1:0)*S.dir;});
  const tot=rows.reduce((a,r)=>a+(r.m.merged||0),0),under=tot?rows.reduce((a,r)=>a+(r.m.pct_under_24h||0)*(r.m.merged||0),0)/tot:null;
  const th=(k,l)=>`<th data-sort="${k}" class="${S.sort===k?'sorted':''}" tabindex="0" role="button">${l}${S.sort===k?(S.dir>0?' ▲':' ▼'):''}</th>`;
  return `<section class="table-card hg-card"><div class="hg-tiles">${tile('Teams reporting',rows.length,'',null)}${tile('Merged PRs',tot,'',null)}${tile('Median of team medians',hh(median(rows.map(r=>r.m.median_h))),'≤ '+T.median+'h',tone(median(rows.map(r=>r.m.median_h)),T.median))}${tile('Median of team P80s',hh(median(rows.map(r=>r.m.p80_h))),'≤ '+T.p80+'h',tone(median(rows.map(r=>r.m.p80_h)),T.p80))}${tile('Merged &lt; 24h (PR-weighted)',under==null?'–':Math.round(under)+'%','≥ '+T.under+'%',tone(under,T.under,1))}</div></section>
  <section class="table-card hg-card"><h3>All teams · ${S.sprint}</h3><table class="hg-table hg-sort"><thead><tr>${th('name','Team')}${th('merged','PRs')}${th('median_h','Median')}${th('p80_h','P80')}${th('pct_under_24h','&lt; 24h')}</tr></thead><tbody>${rows.map(r=>`<tr class="hg-row" data-team="${esc(r.k)}" tabindex="0"><td>${esc(r.name)}</td><td>${r.m.merged}</td><td class="hg-${tone(r.m.median_h,T.median)}">${hh(r.m.median_h)}</td><td class="hg-${tone(r.m.p80_h,T.p80)}">${hh(r.m.p80_h)}</td><td class="hg-${tone(r.m.pct_under_24h,T.under,1)}">${f1(r.m.pct_under_24h)}%</td></tr>`).join('')}</tbody></table><p class="hg-sub">Click a team for root causes, slowest PRs and recommendations.</p></section>`;
}
function draw(el){
  const d=S.data,sps=sprintsOf(d),gen=generated(d,S.sprint);
  const note=gen?'Generated by this dashboard from GUS and git.soma (no AI).':'Published Hourglass report numbers (headline metrics only).';
  el.innerHTML=`<div class="executive-heading"><div><h2>${icon('clock','amber')} Hourglass · PR cycle time</h2><p>How long pull requests take from open to merge, per team and sprint. Targets: median ≤ ${T.median}h, P80 ≤ ${T.p80}h, ≥ ${T.under}% merged within 24h.</p></div></div>
  <section class="table-card hg-card"><div class="filterbar hg-filter"><label class="hub-field">Team<select id="hg-team" class="sp-select">${[['all','All teams'],...Object.entries(d.teams).map(([k,t])=>[k,t.name])].map(([k,n])=>`<option value="${esc(k)}" ${k===S.team?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
  <div class="hub-chips" aria-label="Sprint">${sps.map(s=>`<button class="hub-chip${s===S.sprint?' on':''}" data-sprint="${s}" aria-pressed="${s===S.sprint}">${s.replace('2026.','')}</button>`).join('')}</div><span class="hg-sub">${note} Data as of ${esc(d.generated||'')}.</span></div></section>
  <div id="hg-body">${S.team==='all'?allView():teamView(S.team)}</div>
  <section class="table-card hg-card hg-method"><h3>Method</h3><p class="hg-sub">Work items of each team's sprint (GUS) are matched to git.soma PRs by the <code>@W-</code> number in the PR title. Bots, forks and closed-unmerged PRs are excluded; PRs merged inside the sprint window count. Cycle time is created to merged. Root causes and recommendations are rule-based on review pickup, rework rounds, PR size, approval-to-merge delay and weekends. Counts are a lower bound: PRs that do not carry the work-item number are not found, and the published reports also use Core-on-Git change lists, which are not included here, so 10b and 11a PR counts and tails can differ from a published report for the same sprint (MAPS 09a check: median matched at 4.7h, PRs 38 vs 49). Source: <a href="https://git.soma.salesforce.com/pages/core-foundational-services/hourglass/" target="_blank" rel="noopener">core-foundational-services/hourglass</a>.</p></section>`;
  el.querySelector('#hg-team').onchange=e=>{S.team=e.target.value;draw(el);};
  el.querySelectorAll('[data-sprint]').forEach(b=>b.onclick=()=>{S.sprint=b.dataset.sprint;draw(el);});
  el.querySelectorAll('[data-team]').forEach(r=>{const go=()=>{S.team=r.dataset.team;draw(el);};r.onclick=go;r.onkeydown=e=>{if(e.key==='Enter')go();};});
  el.querySelectorAll('[data-sort]').forEach(h=>{const go=()=>{S.dir=S.sort===h.dataset.sort?-S.dir:1;S.sort=h.dataset.sort;draw(el);};h.onclick=go;h.onkeydown=e=>{if(e.key==='Enter')go();};});
}
H.register({id:'hourglass',label:'Hourglass',icon:'clock',tone:'amber',desc:'PR cycle-time metrics per team and sprint',needsTeam:false,
  stat:()=>({text:'PR cycle time · root causes and recommendations'}),
  render(el){el.innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading Hourglass metrics…</div>';
    load().then(d=>{const sps=sprintsOf(d);if(!sps.includes(S.sprint))S.sprint=sps[0];draw(el);}).catch(e=>{el.innerHTML=`<div class="empty-state hub-empty"><h3>Could not load Hourglass data</h3><p>${esc(e.message)}</p></div>`;});}});
})();
