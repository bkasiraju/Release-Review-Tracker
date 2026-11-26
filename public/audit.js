/* Audit log: who changed what, per team. A hidden Hub page: it has no tab, tile or rail button and is reached only at #audit-log.
 * A summary dashboard first; double-click (or press Enter on) any tile, bar or day to open the matching changes. */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const PERIODS=[[7,'7 days'],[30,'30 days'],[90,'90 days'],[180,'180 days']];
const S={days:30,events:[],team:null,loading:false,error:'',seq:0,loadedAt:0,retention:180};
const SHARED='Release reviews (shared)';
const fmtDay=d=>new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(d);
const fmtFull=iso=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));
const dayKey=iso=>{const d=new Date(iso);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const ago=iso=>{const s=Math.max(0,(Date.now()-new Date(iso))/1000);return s<60?'just now':s<3600?Math.floor(s/60)+' min ago':s<86400?Math.floor(s/3600)+' h ago':s<172800?'yesterday':Math.floor(s/86400)+' days ago';};
const initials=n=>String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
const teamName=id=>{if(!id)return SHARED;const t=(H.teams||[]).find(x=>x.Id===id);return t?(t.short||t.Name):'Unknown team';};
const who=e=>(e.actor&&e.actor.name)||'Unknown user';
const AREA_TONE={'Release plan':'#176b91','Epics & workstreams':'#5b4bc4','GUS records':'#0b7a53','Release review':'#b45f06','Sprint actions':'#c0392b','Team settings':'#555f6b','Messaging':'#0d8da0'};
const tone=a=>AREA_TONE[a]||'#667085';

const count=(list,key)=>{const m=new Map();for(const e of list){const k=key(e);m.set(k,(m.get(k)||0)+(e.count||1));}return [...m].sort((a,b)=>b[1]-a[1]);};

/** Turns an event list into the dashboard numbers. A merged autosave event counts every save it stands for. */
function summarize(events){
  const n=events.reduce((t,e)=>t+(e.count||1),0);
  return {n,people:count(events,who),areas:count(events,e=>e.area),teams:count(events,e=>teamName(e.teamId)),last:events[0]};
}
/** Per-day (or per-week for long periods) activity, oldest first, with empty days filled in so gaps are visible. */
function series(events,days){
  const step=days>45?7:1,end=new Date();end.setHours(0,0,0,0);const out=[];
  const start=new Date(end);start.setDate(start.getDate()-(Math.ceil(days/step)*step-1));
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+step)){const a=new Date(d),b=new Date(d);b.setDate(b.getDate()+step-1);out.push({from:dayKey(a),to:dayKey(b),label:step>1?fmtDay(a)+' – '+fmtDay(b):fmtDay(a),n:0});}
  for(const e of events){const k=dayKey(e.ts),b=out.find(x=>k>=x.from&&k<=x.to);if(b)b.n+=e.count||1;}
  return out;
}

const bar=(kind,val,label,v,max,color,sub)=>`<div class="au-bar" role="button" tabindex="0" data-kind="${kind}" data-val="${esc(val)}" title="Double-click for the changes: ${esc(label)}"><span class="au-bl">${kind==='person'?`<i class="au-av">${esc(initials(label))}</i>`:`<i class="au-dot" style="background:${color||'#176b91'}"></i>`}<span>${esc(label)}</span></span><span class="au-bt"><span style="width:${Math.max(3,v/max*100).toFixed(1)}%;background:${color||'#176b91'}"></span></span><b>${v}</b></div>`;
const panel=(title,kind,body,hint)=>`<section class="au-card" data-kind="${kind}" data-val="" tabindex="0" role="group" aria-label="${esc(title)}"><header><h3>${esc(title)}</h3>${hint?`<small>${esc(hint)}</small>`:''}</header>${body}</section>`;
const tile=(label,big,sub,kind,val)=>`<div class="au-tile" role="button" tabindex="0" data-kind="${kind}" data-val="${esc(val||'')}" title="Double-click for details"><small>${esc(label)}</small><b>${big}</b><span>${esc(sub)}</span></div>`;

function dashboard(){
  const ev=S.events,sm=summarize(ev),max=a=>Math.max(1,...a.map(x=>x[1]));
  if(!ev.length)return `<div class="au-tiles">${tile('Changes',0,'in the last '+S.days+' days','all')}${tile('People',0,'','people')}${tile('Areas touched','0 / 7','','areas')}${tile('Latest change','–','','latest')}</div>`;
  const ser=series(ev,S.days),smax=Math.max(1,...ser.map(x=>x.n));
  const tiles=`<div class="au-tiles">${tile('Changes',sm.n,'in the last '+S.days+' days','all')}${tile('People',sm.people.length,sm.people[0]?'most active: '+sm.people[0][0]:'','people')}${tile('Areas touched',sm.areas.length+' / 7',sm.areas[0]?'most: '+sm.areas[0][0]:'','areas')}${tile('Latest change',esc(ago(sm.last.ts)),who(sm.last)+' · '+sm.last.area,'latest')}</div>`;
  const areas=panel('By area','area',sm.areas.map(([k,v])=>bar('area',k,k,v,max(sm.areas),tone(k))).join(''),'Double-click a bar');
  const people=panel('By person','person',sm.people.slice(0,6).map(([k,v])=>bar('person',k,k,v,max(sm.people))).join('')+(sm.people.length>6?`<button type="button" class="au-more" data-kind="people" data-val="">+${sm.people.length-6} more…</button>`:''),'Double-click a person');
  const days=panel(S.days>45?'Activity by week':'Activity by day','day',`<div class="au-cols" role="list">${ser.map(d=>`<span class="au-col${d.n?'':' z'}" role="listitem" tabindex="${d.n?0:-1}" data-kind="day" data-val="${d.from}|${d.to}" title="${esc(d.label)}: ${d.n} change${d.n===1?'':'s'}${d.n?' · double-click for details':''}"><i style="height:${d.n?Math.max(6,d.n/smax*100).toFixed(1):2}%"></i></span>`).join('')}</div><div class="au-axis"><span>${esc(ser[0].label)}</span><span>${esc(ser[ser.length-1].label)}</span></div>`,'Double-click a column');
  const teams=H.team.Id==='all'?panel('By team','team',sm.teams.slice(0,6).map(([k,v])=>bar('team',k,k,v,max(sm.teams))).join(''),'Double-click a team'):'';
  const recent=`<section class="au-card au-recent" data-kind="all" data-val="" tabindex="0" role="group" aria-label="Latest changes"><header><h3>Latest changes</h3><small>Double-click for the full log</small></header><ul>${ev.slice(0,8).map(e=>`<li data-kind="event" data-val="${esc(e.id)}" tabindex="0"><i class="au-av">${esc(initials(who(e)))}</i><span class="au-what"><b>${esc(who(e))}</b> ${esc(e.summary)}${e.count>1?` <em>×${e.count}</em>`:''}<small>${esc(H.team.Id==='all'?teamName(e.teamId)+' · ':'')}${esc(e.area)}${e.release?' · '+esc(e.release):''}</small></span><time title="${esc(fmtFull(e.ts))}">${esc(ago(e.ts))}</time></li>`).join('')}</ul></section>`;
  return tiles+`<div class="au-grid">${areas}${people}${days}${teams}</div>`+recent;
}

function draw(el){
  const chips=PERIODS.map(([d,l])=>`<button type="button" class="hub-chip${d===S.days?' on':''}" data-days="${d}" aria-pressed="${d===S.days}">${l}</button>`).join('');
  el.innerHTML=`<div class="executive-heading"><div><h2>${icon('notepad','violet')} Audit log</h2><p>Who changed what${H.team.Id==='all'?' across all teams':' for '+esc(H.team.Name)}. Double-click any card, bar or day for the details.</p></div><div class="heading-actions"><div class="hub-chips" role="group" aria-label="Period">${chips}</div><button type="button" class="button primary" data-refresh title="Reload the log">Refresh</button></div></div>`+
   `<div class="au-body" id="au-body">${S.loading&&!S.events.length?'<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading the audit log…</div>':S.error?`<div class="empty-state hub-empty"><h3>Could not load the audit log</h3><p>${esc(S.error)}</p></div>`:dashboard()}</div>`+
   `<p class="au-foot">Changes are kept for ${S.retention} days${S.truncated?' (busy records show only the most recent changes)':''}. Merged autosaves show a ×count.</p>`;
}

async function load(el,force){
  const my=++S.seq,id=H.team.Id;S.team=id;S.loading=true;S.error='';if(force)S.events=[];draw(el);
  try{const r=await call('audit-log',{teamId:id,days:S.days});if(my!==S.seq)return;S.truncated=!!r.truncated;S.events=r.events||[];S.retention=r.retentionDays||180;S.loadedAt=Date.now();}
  catch(e){if(my!==S.seq)return;S.error=e.message||String(e);}
  S.loading=false;if(el.isConnected&&H.current==='audit')draw(el);
}

// ── drill-down ──────────────────────────────────────────────────────────────
const matches=(e,kind,val)=>kind==='area'?e.area===val:kind==='person'?who(e)===val:kind==='team'?teamName(e.teamId)===val:kind==='day'?(k=>k>=val.split('|')[0]&&k<=val.split('|')[1])(dayKey(e.ts)):kind==='event'?e.id===val:true;
const titleFor=(kind,val)=>kind==='area'?val:kind==='person'?val:kind==='team'?val+' · all changes':kind==='day'?(v=>v[0]===v[1]?fmtDay(new Date(v[0]+'T00:00')):fmtDay(new Date(v[0]+'T00:00'))+' – '+fmtDay(new Date(v[1]+'T00:00')))(val.split('|')):kind==='latest'?'Latest change':kind==='people'?'People':kind==='areas'?'Areas':'All changes';

function openDetails(kind,val){
  closeDetails();
  let base=S.events.filter(e=>kind==='latest'?e.id===S.events[0].id:matches(e,kind,val));
  if(kind==='event'){const e=S.events.find(x=>x.id===val);if(e)base=[e];}
  const f={q:'',area:'',who:''},opener=document.activeElement;
  const ov=document.createElement('div');ov.className='au-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label',titleFor(kind,val));
  const rows=()=>{const q=f.q.toLowerCase();return base.filter(e=>(!f.area||e.area===f.area)&&(!f.who||who(e)===f.who)&&(!q||(who(e)+' '+e.summary+' '+e.area+' '+teamName(e.teamId)+' '+(e.release||'')+' '+(e.detail||[]).join(' ')).toLowerCase().includes(q)));};
  const opts=(list,sel)=>'<option value="">All</option>'+list.map(x=>`<option${x===sel?' selected':''}>${esc(x)}</option>`).join('');
  const body=()=>{const r=rows();return `<div class="au-sub">${r.length} of ${base.length} change${base.length===1?'':'s'}</div>`+(r.length?`<div class="au-scroll"><table class="au-table nofit nosort nopage"><thead><tr><th>When</th><th>Who</th>${H.team.Id==='all'?'<th>Team</th>':''}<th>Area</th><th>Change</th></tr></thead><tbody>${r.map(e=>`<tr><td title="${esc(fmtFull(e.ts))}"><b>${esc(fmtFull(e.ts))}</b><small>${esc(ago(e.ts))}</small></td><td><span class="au-p"><i class="au-av">${esc(initials(who(e)))}</i>${esc(who(e))}</span></td>${H.team.Id==='all'?`<td>${esc(teamName(e.teamId))}</td>`:''}<td><span class="au-tag" style="--c:${tone(e.area)}">${esc(e.area)}</span></td><td>${esc(e.summary)}${e.count>1?` <em>×${e.count}</em>`:''}${e.release?`<small>${esc(e.release)}</small>`:''}${(e.detail||[]).length?`<ul class="au-det">${e.detail.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="au-none">No changes match.</p>');};
  const people=[...new Set(base.map(who))].sort(),areas=[...new Set(base.map(e=>e.area))].sort();
  ov.innerHTML=`<div class="au-dlg"><header><h3>${esc(titleFor(kind,val))}</h3><button type="button" class="au-x" data-close aria-label="Close">✕</button></header><div class="au-flt"><label>Search<input type="search" data-f="q" placeholder="Person, area or change"></label><label>Area<select data-f="area">${opts(areas)}</select></label><label>Person<select data-f="who">${opts(people)}</select></label></div><div id="au-res">${body()}</div></div>`;
  document.body.appendChild(ov);
  const res=ov.querySelector('#au-res');
  ov.addEventListener('input',e=>{const k=e.target.dataset.f;if(!k)return;f[k]=e.target.value;res.innerHTML=body();});
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-close]'))closeDetails();});
  ov._key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeDetails();}else if(e.key==='Tab'){const els=[...ov.querySelectorAll('button,input,select')];if(!els.length)return;const a=els[0],z=els[els.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}};
  window.addEventListener('keydown',ov._key,true);ov._opener=opener;
  ov.querySelector('[data-f=q]').focus();
}
function closeDetails(){const ov=document.querySelector('.au-ov');if(!ov)return;window.removeEventListener('keydown',ov._key,true);ov.remove();try{ov._opener&&ov._opener.focus&&ov._opener.focus();}catch(_){/* gone */}}

// ── page ────────────────────────────────────────────────────────────────────
function wire(el){
  el.onclick=e=>{
    if(H.current!=='audit')return;
    const d=e.target.closest('[data-days]');if(d){S.days=+d.dataset.days;return load(el,true);}
    if(e.target.closest('[data-refresh]'))return load(el,true);
    const m=e.target.closest('.au-more');if(m)return openDetails('people','');
  };
  const open=t=>{const x=t.closest('[data-kind]');if(!x||!x.dataset.kind)return false;const k=x.dataset.kind;if(k==='day'&&x.classList.contains('z'))return true;
    // a card opens the whole group; a bar, tile, day or row opens just its own slice
    if(!S.events.length)return true;openDetails(k==='person'||k==='area'||k==='team'||k==='day'?(x.dataset.val?k:'all'):k,x.dataset.val);return true;};
  el.ondblclick=e=>{if(H.current!=='audit'||e.target.closest('button,a,input,select'))return;if(open(e.target))e.preventDefault();};
  el.onkeydown=e=>{if(H.current!=='audit'||e.key!=='Enter'||e.target.closest('input,select'))return;const b=e.target.closest('button');if(b&&!b.classList.contains('au-more'))return;if(open(e.target))e.preventDefault();};
}

H.register({id:'audit',label:'Audit log',icon:'notepad',tone:'violet',desc:'Who changed what, per team',needsTeam:false,
  render(el){wire(el);if(S.team!==H.team.Id||Date.now()-S.loadedAt>60000||!S.events.length)load(el,S.team!==H.team.Id);else draw(el);}});
H.__audit={summarize,series,matches};
})();
