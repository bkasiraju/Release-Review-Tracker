/* Hourglass: PR cycle-time metrics per HRP team and sprint. Data is a static file built offline by scripts/hourglass/*
 * (GUS + git.soma, no AI). Registers the Hourglass page with Hub. */
(function(){
'use strict';
const H=window.Hub,{esc,icon}=H;
const REPORT='https://git.soma.salesforce.com/pages/core-foundational-services/hourglass/reports/';
const T={median:8,p80:16,under:90}; // Hourglass targets
const S={data:null,sprint:'2026.11a',sort:'median_h',dir:1};
const f1=v=>v==null?'–':(Math.round(v*10)/10).toString();
const hh=v=>v==null?'–':f1(v)+'h';
const tone=(v,t,hi)=>v==null?'':(hi?v>=t:v<=t)?'ok':(hi?v>=t*.8:v<=t*2)?'warn':'bad';
const sum=(t,sp)=>(t.sprints[sp]||{}).summary;
const load=()=>S.data?Promise.resolve(S.data):fetch('./hourglass-data.json?v=4.0.0-GA-plan137').then(r=>{if(!r.ok)throw new Error('Hourglass data not found ('+r.status+')');return r.json();}).then(d=>(S.data=d));
const sprintsOf=d=>{const all=new Set();Object.values(d.teams).forEach(t=>{Object.keys(t.sprints).forEach(s=>all.add(s));Object.keys(t.published).forEach(s=>all.add(s));});return [...all].sort().reverse();};
const generated=(d,sp)=>Object.values(d.teams).some(t=>t.sprints[sp]);
const tile=(label,val,target,cls,sub)=>`<div class="hg-tile ${cls||''}"><div class="hg-tl">${label}</div><div class="hg-tv">${val}</div><div class="hg-ts">${target?'Target '+target:''}${sub?(target?' · ':'')+sub:''}</div></div>`;
const median=a=>{const v=a.filter(x=>x!=null).sort((x,y)=>x-y);if(!v.length)return null;const m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2;};

const teamKey=(tm=H.team)=>!tm||tm.Id==='all'?null:tm.short==='MAPS'?'MAPS':tm.short==='MQ'?'MQ':/vegacache/i.test(tm.Name)?'VegaCache':null;
function trend(t){
  const pts=[...Object.entries(t.published).map(([s,m])=>({s,m:m.median_h,p:m.p80_h,pub:1})),...Object.entries(t.sprints).map(([s,x])=>({s,m:x.summary.median_h,p:x.summary.p80_h,pub:0}))]
    .filter(p=>p.m!=null).sort((a,b)=>a.s<b.s?-1:1).filter((p,i,a)=>!(p.pub&&a.some(q=>q.s===p.s&&!q.pub)));
  if(pts.length<2)return '<p class="hg-sub">Not enough sprints for a trend.</p>';
  const W=760,Ht=220,L=40,R=16,Tp=14,Bt=28,iw=W-L-R,ih=Ht-Tp-Bt,n=pts.length,slot=iw/n,cx=i=>L+slot*i+slot/2;
  const mx=Math.max(T.p80*1.25,...pts.map(p=>p.p||0)),y=v=>Tp+ih-v/mx*ih;
  const grid=[0,.5,1].map(f=>`<line x1="${L}" x2="${W-R}" y1="${Tp+ih-f*ih}" y2="${Tp+ih-f*ih}" class="bt-g"/><text x="${L-6}" y="${Tp+ih-f*ih+4}" text-anchor="end" class="bt-ax">${Math.round(mx*f)}h</text>`).join('');
  const targets=[[T.median,'8h target'],[T.p80,'16h target']].map(([v,l])=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" class="hg-tg"/><text x="${L+4}" y="${y(v)-3}" class="bt-ax">${l}</text>`).join('');
  const path=k=>pts.map((p,i)=>p[k]==null?'':`${i?'L':'M'}${cx(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ').replace(/^L/,'M');
  const dots=(k,cls)=>pts.map((p,i)=>p[k]==null?'':`<circle cx="${cx(i)}" cy="${y(p[k])}" r="3.4" class="${cls}"><title>${p.s} ${k==='m'?'median':'P80'} ${hh(p[k])}${p.pub?' (published report)':''}</title></circle>`).join('');
  const labs=pts.map((p,i)=>`<text x="${cx(i)}" y="${Ht-10}" text-anchor="middle" class="bt-ax">${esc(p.s.replace('2026.',''))}</text>`).join('');
  const last=pts[pts.length-1],prev=pts[pts.length-2],dm=last.m-prev.m;
  const tl=(l,v,c,sub)=>`<div class="bt-tile ${c||''}"><span>${l}</span><b>${v}</b><small>${sub||''}</small></div>`;
  return `<div class="bt-tiles hg-ttiles">${tl('Latest median',hh(last.m),tone(last.m,T.median)==='ok'?'good':'',last.s.replace('2026.','')+' · target &lt; '+T.median+'h')}${tl('Latest P80',hh(last.p),tone(last.p,T.p80)==='ok'?'good':'bad','target &lt; '+T.p80+'h')}${tl('Median vs previous',(dm>0?'+':'')+f1(dm)+'h',dm>0?'bad':'good',dm>0?'slower than '+prev.s.replace('2026.',''):'faster than '+prev.s.replace('2026.',''))}${tl('Sprints shown',n,'',pts.filter(p=>p.pub).length+' published · '+pts.filter(p=>!p.pub).length+' generated')}</div>
  <svg class="bt-svg" viewBox="0 0 ${W} ${Ht}" role="img" aria-label="Median and P80 cycle time by sprint">${grid}${targets}<path d="${path('p')}" class="hg-l2"/>${dots('p','hg-d2')}<path d="${path('m')}" class="bt-l"/>${dots('m','bt-d')}${labs}</svg>
  <div class="bt-legend"><span><i class="bt-lg"></i>Median</span><span><i class="bt-lg hg-lg2"></i>P80</span><span class="hg-sub">Dashed lines are the 8h and 16h targets. Up to 09a from the published Hourglass reports; 10b onward generated here.</span></div>`;
}
function dist(d){const mx=Math.max(1,...d.map(b=>b.n)),tot=d.reduce((a,b)=>a+b.n,0)||1;
  return `<div class="hg-dist">${d.map((b,i)=>`<div class="hg-col"><div class="hg-bn">${b.n} <span>${Math.round(100*b.n/tot)}%</span></div><div class="hg-fill c${i}" style="height:${Math.max(3,100*b.n/mx)}%"></div><div class="hg-bl">${esc(b.label)}</div></div>`).join('')}</div>`;}
const donut=(label,pct,color,sub)=>{const r=38,c=2*Math.PI*r,v=pct==null?0:Math.max(0,Math.min(100,pct));
  return `<div class="hg-donut" ${pct==null?'title="Core PRs (Core-on-Git) are not collected by this dashboard"':''}><svg viewBox="0 0 100 100" role="img" aria-label="${esc(label)} ${pct==null?'not available':f1(pct)+'%'}"><circle cx="50" cy="50" r="${r}" class="hg-dn-bg"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="${(c*v/100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)" stroke-linecap="butt"/><text x="50" y="55" text-anchor="middle" class="hg-dn-t">${pct==null?'n/a':f1(pct)+'%'}</text></svg><div class="hg-dn-l">${esc(label)}</div><div class="hg-sub">${esc(sub)}</div></div>`;};
const CAUSE_DESC={'Slow review pickup':'The first review arrived more than 24h after the PR was opened, so the PR sat idle before any feedback.','Weekend stall':'PRs opened late in the week waited through the weekend before they were reviewed or merged.','Merge delay after approval':'The PR was approved but not merged promptly afterwards.','Large PR':'Large diffs take longer to review and tend to need more rework rounds.','Open longer than a week':'PRs left open for more than a week, usually blocked on feedback, rework or an external dependency.'};
const why=p=>{const bits=[];if(p.ttfr_h!=null&&p.ttfr_h>24)bits.push('first review took '+hh(p.ttfr_h));else if(p.ttfr_h!=null)bits.push('first review after '+hh(p.ttfr_h));
  if(p.tags.includes('Large PR'))bits.push('large change ('+p.size+' lines)');if(p.tags.includes('Weekend stall'))bits.push('spanned a weekend');if(p.tags.includes('Merge delay after approval'))bits.push('merge was delayed after approval');if(p.tags.includes('Open longer than a week'))bits.push('open longer than a week');
  if(p.comments>=10)bits.push(p.comments+' review comments (rework)');
  return bits.length?bits[0].charAt(0).toUpperCase()+bits.join('; ').slice(1)+'.':'No single bottleneck stands out.';};
const repoNote=(r,sp)=>{const sl=sp.slowest.find(p=>p.repo===r.repo),n=[];
  if(r.avg_cycle_h<=T.median)n.push('Within the '+T.median+'h target');else if(r.avg_cycle_h<=T.p80)n.push('Within the '+T.p80+'h bar');else if(r.avg_cycle_h>24)n.push('Average over 24h');
  if(sl&&sl.cycle_h>24)n.push('slowest PR #'+sl.num+' took '+hh(sl.cycle_h));if(r.prs===1)n.push('single PR');else if(r.median_cycle_h!=null&&r.avg_cycle_h>2*r.median_cycle_h)n.push('a few outliers skew the average (median '+hh(r.median_cycle_h)+')');
  const t=n.join('; ');return t.charAt(0).toUpperCase()+t.slice(1)+'.';};
const secH=(n,t,sub)=>`<h3 class="hg-sec"><span class="hg-secn">${n}</span>${t}</h3>${sub?`<p class="hg-sub">${sub}</p>`:''}`;
const execSummary=(t,sp)=>{const s=sp.summary,rc=sp.root_causes[0],ok=[],gr=[];
  const prevK=[...new Set([...Object.keys(t.sprints),...Object.keys(t.published)])].filter(k=>k<S.sprint).sort().pop(),pv=prevK&&((t.sprints[prevK]||{}).summary||t.published[prevK]),pm=pv&&(pv.median_h),pp=pv&&pv.p80_h;
  if(s.median_h<=T.median)ok.push(`Median cycle time <b>${hh(s.median_h)}</b>, inside the &lt;${T.median}h target`);else gr.push(`Median cycle time <b>${hh(s.median_h)}</b> is above the &lt;${T.median}h target`);
  if(s.p80_h<=T.p80)ok.push(`P80 cycle time <b>${hh(s.p80_h)}</b>, inside the &lt;${T.p80}h target`);else gr.push(`P80 cycle time <b>${hh(s.p80_h)}</b> is ${f1(s.p80_h-T.p80)}h over the &lt;${T.p80}h target: a slow tail of PRs`);
  if(s.pct_under_24h>=T.under)ok.push(`<b>${s.pct_under_24h}%</b> of PRs merged within 24h (target &gt;${T.under}%)`);else gr.push(`Only <b>${s.pct_under_24h}%</b> of PRs merged within 24h (target &gt;${T.under}%)`);
  ok.push(`<b>${s.merged}</b> PRs merged across ${sp.repos.length} repo${sp.repos.length===1?'':'s'}; ${s.work_items_with_pr} of ${s.work_items} work items traced to a PR`);
  if(pm!=null&&s.median_h<pm)ok.push(`Median improved from ${hh(pm)} in ${prevK.replace('2026.','')} to ${hh(s.median_h)}`);else if(pm!=null&&s.median_h>pm)gr.push(`Median slipped from ${hh(pm)} in ${prevK.replace('2026.','')} to ${hh(s.median_h)}`);
  if(pp!=null&&s.p80_h<pp)ok.push(`P80 improved from ${hh(pp)} to ${hh(s.p80_h)} versus ${prevK.replace('2026.','')}`);else if(pp!=null&&s.p80_h>pp)gr.push(`P80 rose from ${hh(pp)} to ${hh(s.p80_h)} versus ${prevK.replace('2026.','')}`);
  if(s.median_ttfr_h!=null&&s.median_ttfr_h<=8)ok.push(`Reviews start quickly: median first review in <b>${hh(s.median_ttfr_h)}</b>`);
  if(rc)gr.push(`<b>${esc(rc.cause)}</b> drove ~${rc.hours_lost}h (${rc.pct_of_delay}%) of time past 24h across ${rc.prs_affected} PR${rc.prs_affected===1?'':'s'}`);
  if(s.pct_ttfr_over_24h>=15)gr.push(`${s.pct_ttfr_over_24h}% of PRs waited over 24h for a first review`);
  if(s.pct_large>=15)gr.push(`${s.pct_large}% of PRs are large changes, which slow review`);
  const w=sp.slowest[0];if(w&&w.cycle_h>48)gr.push(`Slowest PR ${esc(w.repo.split('/').pop())}#${w.num} took <b>${hh(w.cycle_h)}</b>`);
  const verdict=gr.length<=1&&s.median_h<=T.median&&s.p80_h<=T.p80?'On track':s.median_h<=T.median?'Median on target, tail needs attention':'Cycle time needs attention';
  const li=a=>a.length?a.map(x=>`<li>${x}</li>`).join(''):'<li class="hg-none">Nothing notable.</li>';
  return `<div class="hg-verdict"><b>${esc(verdict)}</b> · ${esc(t.name)}, ${esc(S.sprint)}${sp.sprint.in_progress?' (sprint in progress, numbers will move)':''}</div><div class="hg-exgrid"><div class="hg-ex-ok"><h4>✓ Accomplished</h4><ul>${li(ok)}</ul></div><div class="hg-ex-gr"><h4>▲ Growth areas</h4><ul>${li(gr)}</ul></div></div>`;};
function teamView(key){
  const t=S.data.teams[key],sp=t.sprints[S.sprint],pub=t.published[S.sprint];
  if(!sp){
    return `<section class="table-card hg-card"><h3>${esc(t.name)} · ${S.sprint}</h3>${pub?`<div class="hg-tiles">${tile('Merged PRs',pub.prs,'',null)}${tile('Median',hh(pub.median_h),'&lt; '+T.median+'h',tone(pub.median_h,T.median))}${tile('P80',hh(pub.p80_h),'&lt; '+T.p80+'h',tone(pub.p80_h,T.p80))}${tile('Merged &lt; 24h',f1(pub.pct_under_24h)+'%','&gt; '+T.under+'%',tone(pub.pct_under_24h,T.under,1))}</div><p class="hg-sub">Published Hourglass report (headline metrics only). <a href="${REPORT}${esc(key)}_PR_CycleTime_${S.sprint}.html" target="_blank" rel="noopener">Open the full report</a></p>`:'<p class="hg-sub">No data for this team and sprint (the team may not run this sprint).</p>'}</section><section class="table-card hg-card"><h3>Trend</h3>${trend(t)}</section>`;
  }
  const s=sp.summary,g=sp.gaps||{},lost=sp.root_causes.reduce((a,c)=>a+c.hours_lost,0),mxr=Math.max(1,...sp.repos.map(r=>r.avg_cycle_h||0)),over=100-(s.pct_under_24h||0);
  const rbar=v=>`<span class="hg-rbar"><i class="${tone(v,T.p80)}" style="width:${Math.max(3,100*v/mxr)}%"></i></span>`;
  return `<section class="table-card hg-card"><div class="hg-head"><h3>${esc(t.name)} · ${S.sprint}</h3><span class="hg-sub">${sp.sprint.start} to ${sp.sprint.end}${sp.sprint.in_progress?' · <b class="hg-live">in progress</b>':''}</span></div>
   ${secH(1,'Executive Summary')}<div class="hg-exec">${execSummary(t,sp)}</div></section>
  <section class="table-card hg-card">${secH(2,'Summary Metrics')}
   <div class="hg-tiles hg-six">${tile('Total PRs',s.prs,'',null,s.open+' still open')}${tile('Merged PRs',s.merged,'',null)}${tile('Median cycle',hh(s.median_h),'&lt; '+T.median+'h',tone(s.median_h,T.median))}${tile('P80 cycle',hh(s.p80_h),'&lt; '+T.p80+'h',tone(s.p80_h,T.p80))}${tile('Merged &lt; 24h',s.pct_under_24h+'%','&gt; '+T.under+'%',tone(s.pct_under_24h,T.under,1))}${tile('Avg comments',f1(s.avg_comments),'',null,'per PR')}</div>
   <div class="hg-donuts">${donut('% merged &lt; 24h'.replace('&lt;','<'),s.pct_under_24h,'#249474','target > '+T.under+'%')}${donut('% Core PRs',null,'#0b6fa8','Core-on-Git not collected')}${donut('% merged > 24h',over,'#d15b68','of merged PRs')}</div>
   <div class="hg-grid"><div><h4 class="hg-h4">Cycle-time distribution</h4>${dist(sp.dist)}</div><div><h4 class="hg-h4">Trend</h4>${trend(t)}</div></div></section>
  <section class="table-card hg-card">${secH(3,'Cycle Time by Repository')}<table class="hg-table"><thead><tr><th>Repository</th><th>PRs</th><th>Merged</th><th>Avg cycle time</th><th>Notes</th></tr></thead><tbody>${sp.repos.map(r=>`<tr><td><b>${esc(r.repo)}</b></td><td>${r.prs}</td><td>${r.merged!=null?r.merged:r.prs}</td><td><div class="hg-rc">${rbar(r.avg_cycle_h)}<span class="hg-${tone(r.avg_cycle_h,T.p80)}">${hh(r.avg_cycle_h)}</span></div></td><td class="hg-sub">${esc(repoNote(r,sp))}</td></tr>`).join('')}</tbody></table></section>
  <section class="table-card hg-card">${secH(4,'Slowest PRs')}<table class="hg-table"><thead><tr><th>#</th><th>PR</th><th>Repo</th><th>Cycle time</th><th>Comments</th><th>Root causes</th></tr></thead><tbody>${sp.slowest.map((p,i)=>`<tr><td>${i+1}</td><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></td><td class="hg-sub">${esc(p.repo.split('/').pop())}#${p.num}</td><td class="hg-${tone(p.cycle_h,24)}">${hh(p.cycle_h)}</td><td>${p.comments}</td><td class="hg-sub">${esc(why(p))}</td></tr>`).join('')}</tbody></table></section>
  <section class="table-card hg-card">${secH(5,'Root Cause Analysis','Rule-based, from review pickup, rework, size and weekend gaps. Hours are time beyond 24h.')}${sp.root_causes.length?sp.root_causes.map(c=>`<details class="hg-rcause"><summary><span class="hg-num">${c.rank}</span><span class="hg-rct"><b>${esc(c.cause)}</b><span class="hg-sub">${esc(CAUSE_DESC[c.cause]||'')}</span></span><span class="hg-badges"><i>${c.prs_affected} PR${c.prs_affected===1?'':'s'}</i><i class="b">${c.hours_lost}h lost</i><i class="c">${c.pct_of_delay}%</i></span></summary><div class="hg-sub hg-ex">Examples: ${c.examples.map(esc).join(', ')}</div></details>`).join(''):'<p class="hg-sub">No PRs over 24h.</p>'}</section>
  <section class="table-card hg-card">${secH(6,'Recommendations')}${sp.recommendations.length?sp.recommendations.map(r=>`<div class="hg-rec"><span class="hg-pri ${r.priority}">${r.priority}</span><div class="hg-recb"><b>${esc(r.action)}</b><p>${esc(r.description)}</p><em class="hg-sub">Owner: ${esc(r.owner)}</em></div><div class="hg-impact">${r.priority==='P1'&&s.p80_h>T.p80?`Bring P80 cycle time from ${hh(s.p80_h)} toward &lt;${T.p80}h<br>`:''}${esc(r.impact)}</div></div>`).join(''):'<p class="hg-sub">No bottleneck over 24h: nothing to recommend.</p>'}</section>
  <section class="table-card hg-card">${secH(7,'Visibility Gaps')}<ul class="hg-gaps hg-warnlist">
   <li><b>${g.with_pr}</b> of ${g.work_items} work items resolved to a PR with the work-item number in the title.</li>
   <li><b>${g.no_pr}</b> work items had no matching PR (${g.non_code} look non-code; the rest are untagged or have no PR yet).</li>
   <li>PRs span multiple orgs and repositories (${sp.repos.length} repos here); only repos found through the work-item title search are counted.</li>
   <li>Abandoned or closed-unmerged PRs are excluded from cycle-time statistics.</li>
   <li>Core-on-Git PRs and change lists are not included, so the % Core PRs donut is n/a and counts are a lower bound versus the published report.</li>
   <li>First-review time comes from the PR reviews API, so reviews left as plain comments may be missed.</li>
   <li>CI-time breakdown is not available, so build and test waiting time is not separated from review time.</li></ul></section>`;
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
  const d=S.data,sps=sprintsOf(d),gen=generated(d,S.sprint),key=teamKey();
  const note=gen?'Generated by this dashboard from GUS and git.soma (no AI).':'Published Hourglass report numbers (headline metrics only).';
  el.innerHTML=`<div class="executive-heading"><div><h2>${icon('clock','amber')} Hourglass · PR cycle time</h2><p>How long pull requests take from open to merge, per team and sprint. Targets: median ≤ ${T.median}h, P80 ≤ ${T.p80}h, ≥ ${T.under}% merged within 24h.</p></div></div>
  <section class="table-card hg-card"><div class="filterbar hg-filter"><div class="hub-chips" aria-label="Sprint">${sps.map(s=>`<button class="hub-chip${s===S.sprint?' on':''}" data-sprint="${s}" aria-pressed="${s===S.sprint}">${s.replace('2026.','')}</button>`).join('')}</div><span class="hg-sub">${note} Data as of ${esc(d.generated||'')}.</span></div></section>
  <div id="hg-body">${key?teamView(key):!H.hasTeam()?allView():'<section class="table-card hg-card"><p class="hg-sub">Hourglass covers MAPS, MQ and VegaCache. Pick one of those teams in the team selector above.</p></section>'}</div>
  <section class="table-card hg-card hg-method"><h3>Method</h3><p class="hg-sub">Work items of each team's sprint (GUS) are matched to git.soma PRs by the <code>@W-</code> number in the PR title. Bots, forks and closed-unmerged PRs are excluded; PRs merged inside the sprint window count. Cycle time is created to merged. Root causes and recommendations are rule-based on review pickup, rework rounds, PR size, approval-to-merge delay and weekends. Counts are a lower bound: PRs that do not carry the work-item number are not found, and the published reports also use Core-on-Git change lists, which are not included here, so 10b and 11a PR counts and tails can differ from a published report for the same sprint (MAPS 09a check: median matched at 4.7h, PRs 38 vs 49). Source: <a href="https://git.soma.salesforce.com/pages/core-foundational-services/hourglass/" target="_blank" rel="noopener">core-foundational-services/hourglass</a>.</p></section>`;
    el.querySelectorAll('[data-sprint]').forEach(b=>b.onclick=()=>{S.sprint=b.dataset.sprint;draw(el);});
  el.querySelectorAll('[data-team]').forEach(r=>{const go=()=>{const tm=H.teams.find(x=>teamKey(x)===r.dataset.team);if(tm)H.setTeam(tm.Id);};r.onclick=go;r.onkeydown=e=>{if(e.key==='Enter')go();};});
  el.querySelectorAll('[data-sort]').forEach(h=>{const go=()=>{S.dir=S.sort===h.dataset.sort?-S.dir:1;S.sort=h.dataset.sort;draw(el);};h.onclick=go;h.onkeydown=e=>{if(e.key==='Enter')go();};});
}
H.register({id:'hourglass',label:'Hourglass',icon:'clock',tone:'amber',desc:'PR cycle-time metrics per team and sprint',needsTeam:false,
  stat:()=>({text:'PR cycle time · root causes and recommendations'}),
  render(el){el.innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading Hourglass metrics…</div>';
    load().then(d=>{const sps=sprintsOf(d);if(!sps.includes(S.sprint))S.sprint=sps[0];draw(el);}).catch(e=>{el.innerHTML=`<div class="empty-state hub-empty"><h3>Could not load Hourglass data</h3><p>${esc(e.message)}</p></div>`;});}});
})();
