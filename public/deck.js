/* Epic Review deck: a slide template that is written once and filled from data, so a review never needs a regenerated HTML file.
   EpicDeck.open(data) shows it full screen. data = {team, release, asOf, start, end, gusUrl, mode, epics:[{id,gusId,name,health,owner,points,theme,line,priority,project,goal,start,end,workItems:[{id,url,name,subject,status,assignee,days}]}]} */
(function(root){
 'use strict';
 const SRC=(typeof document!=='undefined'&&document.currentScript&&document.currentScript.src)||'';
 const CSS=`
#dk{--navy:#032d60;--blue:#0176d3;--sky:#e8f4fd;--ink:#181818;--muted:#5c6670;--line:#e1e5ea;--green:#2e844a;--amber:#dd7a01;--red:#ba0517;--grey:#8a939c;position:fixed;inset:0;z-index:100000;background:#1b1f24;color:var(--ink);font-family:-apple-system,"Salesforce Sans","Segoe UI",Helvetica,Arial,sans-serif;overflow:hidden}
#dk *{box-sizing:border-box;margin:0;padding:0}
#dk .dk-stage{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
#dk .slide{position:absolute;width:1280px;height:720px;background:#fff;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden;opacity:0;pointer-events:none;transition:opacity .3s,transform .3s;transform:translateX(40px)}
#dk .slide.active{opacity:1;pointer-events:auto;transform:none}#dk .slide.prev{transform:translateX(-40px)}
#dk .slide-header{height:84px;padding:0 56px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}
#dk .slide-header h2{font-size:30px;font-weight:700;color:var(--navy);letter-spacing:-.3px}
#dk .crumb{font-size:14px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px}
#dk .slide-body{padding:28px 56px;height:calc(100% - 84px - 44px)}
#dk .slide-footer{position:absolute;bottom:0;left:0;right:0;height:44px;padding:0 56px;display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--grey);border-top:1px solid var(--line)}
#dk .accent-bar{position:absolute;top:0;left:0;width:8px;height:100%;background:var(--blue)}
#dk .title-slide{background:#fbf9f4;color:#181818}#dk .title-slide::before{content:"";position:absolute;left:0;top:0;bottom:0;width:14px;background:var(--blue)}
#dk .title-slide .inner{padding:120px 96px;height:100%;display:flex;flex-direction:column}
#dk .kicker{font-size:16px;letter-spacing:3px;text-transform:uppercase;color:#5c6670;font-weight:600}
#dk .title-slide h1{color:#181818;font-size:60px;font-weight:800;margin:18px 0 12px;letter-spacing:-1px;line-height:1.1}
#dk .title-slide .sub{font-size:22px;color:#3e4650}
#dk .title-slide .meta{margin-top:auto;display:flex;gap:48px;font-size:16px;color:#181818}
#dk .title-slide .meta b{display:block;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5c6670;margin-bottom:4px;font-weight:600}
#dk .badge{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:700;color:#fff;background:var(--grey)}
#dk .badge::before{content:"";width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.85)}
#dk .badge.g{background:var(--green)}#dk .badge.a{background:var(--amber)}#dk .badge.r{background:var(--red)}
#dk .pill{display:inline-block;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700;background:var(--sky);color:var(--blue)}
#dk .pill.warn{background:#fdf1e0;color:#8a4b00}
#dk .kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:16px;margin-bottom:24px}
#dk .kpi{border:1px solid var(--line);border-radius:8px;padding:14px 18px;border-top:4px solid var(--blue)}
#dk .kpi .v{font-size:38px;font-weight:800;color:var(--navy);line-height:1.1}#dk .kpi .v small{font-size:18px;color:var(--muted);font-weight:600}
#dk .kpi .l{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px}
#dk .kpi.g{border-top-color:var(--green)}#dk .kpi.a{border-top-color:var(--amber)}#dk .kpi.r{border-top-color:var(--red)}#dk .kpi.n{border-top-color:var(--grey)}
#dk .panels{display:grid;grid-template-columns:1fr 1fr;gap:24px}
#dk .panel{border:1px solid var(--line);border-radius:8px;padding:16px 20px}
#dk .panel h3{font-size:13px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
#dk .hbar{display:grid;grid-template-columns:190px 1fr 80px;align-items:center;gap:10px;height:30px;font-size:13px}
#dk .hbar .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dk .hbar .track{height:14px;background:#f3f5f7;border-radius:3px}#dk .hbar .fill{height:100%;border-radius:3px;background:var(--blue)}
#dk .hbar .val{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums}#dk .hbar .val b{color:var(--ink)}
#dk table.idx{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
#dk table.idx th{text-align:left;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;padding:0 8px 6px;border-bottom:2px solid var(--line)}
#dk table.idx td{padding:0 8px;height:26px;border-bottom:1px solid #f0f2f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dk table.idx td:last-child{overflow:visible}
#dk table.idx td.num,#dk table.idx th.num{text-align:right;font-variant-numeric:tabular-nums}
#dk table.idx tr.click{cursor:pointer}#dk table.idx tr.click:hover td{background:var(--sky)}
#dk .dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;vertical-align:-1px}
#dk .epic-grid{display:grid;grid-template-columns:1.55fr 1fr;gap:32px;height:100%}
#dk .epic-title{font-size:27px;font-weight:800;line-height:1.2;margin-bottom:10px}
#dk .epic-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;font-size:14px;color:var(--muted)}
#dk .project{font-size:13px;color:var(--muted);margin-bottom:10px}#dk .project b{color:var(--ink);font-weight:600}
#dk .goal{font-size:15px;line-height:1.5;color:#333;margin-bottom:12px;padding-left:14px;border-left:3px solid var(--blue);white-space:pre-line;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
#dk .goal.missing{color:var(--amber);border-left-color:var(--amber);font-style:italic}
#dk .section-label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin:10px 0 6px}
#dk table.ws{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}#dk table.ws td:nth-child(2){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dk table.ws.wrap td:nth-child(2){white-space:normal;display:table-cell;line-height:1.3}
#dk table.ws th{text-align:left;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;padding:0 6px 4px;border-bottom:1px solid var(--line);font-weight:600}
#dk table.ws td{padding:5px 6px;border-bottom:1px solid #f0f2f4;vertical-align:middle}
#dk table.ws td.wi{white-space:nowrap;font-weight:600;width:96px}#dk table.ws th:nth-child(1){width:96px}#dk table.ws th:nth-child(3){width:140px}#dk table.ws th:nth-child(4){width:100px}#dk table.ws th:nth-child(5){width:84px}
#dk table.ws td.who{white-space:nowrap;color:var(--muted);width:140px;max-width:140px;overflow:hidden;text-overflow:ellipsis}
#dk table.ws td.eff{width:100px;white-space:nowrap}#dk table.ws td.st{width:84px;text-align:right;color:var(--muted);white-space:nowrap}
#dk .effbar{display:inline-block;height:8px;border-radius:2px;margin-right:6px}
#dk .more{font-size:12px;color:var(--muted);padding:6px}
#dk .card{border:1px solid var(--line);border-radius:8px;padding:14px 20px;margin-bottom:12px}
#dk .bignum{display:flex;align-items:baseline;gap:10px}#dk .bignum .v{font-size:38px;font-weight:800;color:var(--navy);line-height:1}#dk .bignum .u{font-size:14px;color:var(--muted)}
#dk .stack{height:12px;border-radius:6px;overflow:hidden;display:flex;background:#eef1f4;margin:10px 0 6px}
#dk .legend{display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:var(--muted)}#dk .legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
#dk ul.flags{list-style:none;font-size:13px}#dk ul.flags li{padding:4px 0 4px 24px;position:relative;line-height:1.35}
#dk ul.flags li::before{position:absolute;left:2px;font-weight:700}
#dk ul.flags li.bad::before{content:"!";color:#fff;background:var(--amber);width:15px;height:15px;border-radius:50%;font-size:11px;text-align:center;line-height:15px;top:5px}
#dk ul.flags li.crit::before{background:var(--red)}#dk ul.flags li.good::before{content:"✓";color:var(--green)}
#dk a{color:var(--blue);text-decoration:none}#dk .gus-link{font-size:13px;font-weight:600}
#dk .hyg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
#dk .hyg .h{border:1px solid var(--line);border-left:5px solid var(--amber);border-radius:8px;padding:14px 18px}#dk .hyg .h.good{border-left-color:var(--green)}
#dk .hyg .n{font-size:32px;font-weight:800;color:var(--navy)}#dk .hyg .n small{font-size:16px;color:var(--muted);font-weight:600}
#dk .hyg .t{font-size:15px;font-weight:700;margin:2px 0 6px}#dk .hyg .d{font-size:12px;color:var(--muted);line-height:1.45}
#dk .hyg .d div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dk .hyg .d div::before{content:"• "}
#dk .dk-bar{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;background:rgba(0,0,0,.6);padding:6px 10px;border-radius:999px;color:#fff;font-size:13px;z-index:2;opacity:.35;transition:opacity .2s}
#dk .dk-share{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:5;font:14px system-ui,sans-serif}#dk .dk-sh-box{background:#fff;color:#1b1f24;border-radius:12px;padding:18px 20px;width:min(560px,92vw);display:flex;flex-direction:column;gap:10px}#dk .dk-sh-box [hidden]{display:none}#dk .dk-sh-box h3{margin:0}#dk .dk-sh-box label{display:flex;flex-direction:column;gap:4px;font-weight:600}#dk .dk-sh-box select,#dk .dk-sh-box input,#dk .dk-sh-box textarea{font:13px system-ui,sans-serif;padding:6px 8px;border:1px solid #bbb;border-radius:6px}#dk .dk-sh-note{margin:0;font-size:12px;color:#555}#dk .dk-sh-err{margin:0;color:#b3261e;font-size:13px}#dk .dk-sh-act{display:flex;justify-content:flex-end;gap:8px}#dk .dk-sh-act button{background:#eee;color:#1b1f24;border:none;padding:7px 14px;border-radius:8px;cursor:pointer}#dk .dk-sh-act button.on{background:#0b5cab;color:#fff}#dk .dk-sh-act button:disabled{opacity:.5;cursor:default}
#dk .dk-bar:hover,#dk .dk-bar:focus-within{opacity:1}
#dk .dk-bar button{background:none;border:none;color:#fff;font-size:14px;cursor:pointer;padding:4px 10px;border-radius:999px}
#dk .dk-bar button:hover,#dk .dk-bar button.on{background:rgba(255,255,255,.2)}
#dk .dk-prog{position:fixed;top:0;left:0;height:3px;background:var(--blue);z-index:2;transition:width .3s}
#dk .note-t{font-size:14px;line-height:1.45;white-space:pre-line;color:#333}#dk .note-e{width:100%;min-height:90px;font:inherit;font-size:13px;border:1px solid #8a9db3;border-radius:6px;padding:8px;resize:vertical}
#dk .asks{display:grid;grid-template-columns:1fr 1fr;gap:16px}#dk .ask{border:1px solid var(--line);border-left:5px solid var(--blue);border-radius:8px;padding:12px 16px}#dk .ask.decision{border-left-color:var(--amber)}
#dk .ask .t{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}#dk .ask .q{font-size:16px;font-weight:700;margin:3px 0}#dk .ask .d{font-size:13px;color:#444;line-height:1.4}#dk .ask .who{font-size:12px;color:var(--muted);margin-top:6px}
#dk .ask input,#dk .ask textarea,#dk .ask select{width:100%;font:inherit;font-size:13px;border:1px solid #8a9db3;border-radius:6px;padding:5px 8px;margin:3px 0}
#dk .ask button{font-size:12px;border:1px solid var(--line);background:#fff;border-radius:6px;padding:3px 8px;cursor:pointer}
#dk .asks-add{margin-top:14px}#dk .asks-add button{font-size:13px;border:1px dashed var(--blue);background:var(--sky);color:var(--blue);border-radius:6px;padding:6px 12px;cursor:pointer}
@media print{#dk{position:static;background:#fff;overflow:visible}#dk .dk-stage{position:static;display:block}#dk .slide{position:relative;opacity:1;transform:none!important;scale:1!important;box-shadow:none;border-radius:0;break-after:page}#dk .dk-bar,#dk .dk-prog{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
@page{size:1280px 720px;margin:0}`;
 const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const fmt=d=>d?new Date(String(d).slice(0,10)+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
 const sum=(a,f)=>a.reduce((n,x)=>n+(f(x)||0),0);
 const THEMES=['#0176d3','#2e844a','#dd7a01','#8a4fff','#ba0517','#0b827c','#c23934','#5b7fa6','#a86403','#3a49da'];
 /** Health tone: g (on track/completed), a (watch/at risk), r (blocked/off track), '' (not started / unknown). */
 const tone=h=>{h=String(h||'').toLowerCase();return /on track|complete|closed|done/.test(h)?'g':/watch|risk|hold/.test(h)?'a':/block|off track|late|red/.test(h)?'r':'';};
 const TONE_COLOR={g:'var(--green)',a:'var(--amber)',r:'var(--red)','':'var(--grey)'};
 const badge=h=>`<span class="badge ${tone(h)}">${esc(h||'Not Started')}</span>`;
 const isDone=s=>/complete|closed|fixed|done/i.test(s||''),isWip=s=>/progress|review|qa|waiting|hold/i.test(s||''),isNever=s=>/never|duplicate|cancel/i.test(s||'');

 /** What still needs attention on an epic: [text, severity]. Used by the planning checklist and the monthly risks slide. */
 function flagsFor(e,mode,asOf){
  const live=e.workItems.filter(w=>!isNever(w.status)),out=[];
  const add=(ok,good,bad,crit)=>out.push({ok:!!ok,text:ok?good:bad,crit:!ok&&!!crit});
  if(mode==='review'){
   add(tone(e.health)!=='r'&&tone(e.health)!=='a',`Health: ${e.health||'On track'}`,`Health is ${e.health||'not set'}`,tone(e.health)==='r');
   const late=e.end&&String(e.end)<String(asOf)&&!(live.length&&live.every(w=>isDone(w.status)));
   add(!late,'On schedule',`Planned end ${fmt(e.end)} has passed`,true);
   const hold=live.filter(w=>/hold|waiting/i.test(w.status));
   add(!hold.length,'No workstream on hold',`${hold.length} workstream${hold.length===1?'':'s'} on hold or waiting`);
  }
  if(!e.progress){add(e.start&&e.end,'Planned dates set','No planned start / end dates');add(e.goal,'SMART goal / description set','No SMART goal or description');}
  add(e.project,'Linked to a project','No project');
  if(!live.length){if(!e.progress)add(false,'','No workstreams yet');}
  else{
   add(live.every(w=>w.assignee),'Every workstream has an owner',`${live.filter(w=>!w.assignee).length} of ${live.length} workstreams have no owner`);
   add(live.every(w=>w.days),'Effort estimated per workstream',`${live.filter(w=>!w.days).length} of ${live.length} workstreams have no estimate`);
  }
  return out;
 }

 function build(D){
  const E=D.epics,mode=D.mode==='review'?'review':'planning',all=E.flatMap(e=>e.workItems),totalPts=sum(E,e=>e.points);
  const themes=[...new Set(E.map(e=>e.theme||'No theme'))],tcol=t=>THEMES[themes.indexOf(t||'No theme')%THEMES.length];
  const link=(path,id)=>id?`${D.gusUrl}${path}/${id}/view`:'';
  const footer=()=>`<div class="slide-footer"><span>${esc(D.team)} · ${esc(D.release)} · ${mode==='review'?'Monthly review':'Epic review'} · Source: GUS, as of ${fmt(D.asOf)}</span><span class="pg"></span></div>`;
  const header=(t,c)=>`<div class="slide-header"><h2>${esc(t)}</h2><span class="crumb">${esc(c)}</span></div>`;
  const hbars=rows=>{const max=Math.max(1,...rows.map(r=>r[1]));return rows.map(([n,v,x,c])=>`<div class="hbar"><div class="nm" title="${esc(n)}">${c?`<span class="dot" style="background:${c}"></span>`:''}${esc(n)}</div><div class="track"><div class="fill" style="width:${(v/max*100).toFixed(1)}%;${c?`background:${c}`:''}"></div></div><div class="val"><b>${v}</b> d · ${x}</div></div>`).join('');};
  const group=(f,top)=>{const m={};E.forEach(e=>{const k=f(e)||'—';(m[k]=m[k]||{d:0,n:0}).d+=e.points||0;m[k].n++;});return Object.entries(m).sort((a,b)=>b[1].d-a[1].d).slice(0,top).map(([k,v])=>[k,Math.round(v.d*10)/10,v.n]);};
  const title=()=>`<section class="slide title-slide"><div class="inner"><div class="kicker">${esc(D.team)} · ${mode==='review'?'Monthly review':'Release planning'}</div><h1>${esc(D.release)}<br>${mode==='review'?'Epic status review':'Epic review'}</h1><div class="sub">${E.length} epics · ${all.length} workstreams · ${Math.round(totalPts)} planned days</div><div class="meta">${D.start?`<div><b>Window</b>${fmt(D.start)} – ${fmt(D.end)}</div>`:''}<div><b>Data as of</b>${fmt(D.asOf)}</div><div><b>Source</b>GUS epics and user stories</div></div></div></section>`;
  const glance=()=>{const c=t=>E.filter(e=>tone(e.health)===t).length,started=E.filter(e=>all.length&&e.workItems.some(w=>isDone(w.status)||isWip(w.status))).length,dn=all.filter(w=>isDone(w.status)).length;
   return `<section class="slide"><div class="accent-bar"></div>${header('At a Glance',D.release)}<div class="slide-body"><div class="kpis">
    <div class="kpi"><div class="v">${E.length}</div><div class="l">Epics</div></div>
    <div class="kpi g"><div class="v">${c('g')}</div><div class="l">On track / done</div></div>
    <div class="kpi a"><div class="v">${c('a')}</div><div class="l">Watch / at risk</div></div>
    <div class="kpi r"><div class="v">${c('r')}</div><div class="l">Blocked</div></div>
    <div class="kpi n"><div class="v">${mode==='review'?`${dn}<small> / ${all.length}</small>`:started+'<small> / '+E.length+'</small>'}</div><div class="l">${mode==='review'?'Workstreams done':'Epics started'}</div></div></div>
    <div class="panels"><div class="panel"><h3>Planned effort by theme · # epics</h3>${hbars(group(e=>e.theme||'No theme',7).map(r=>[...r,tcol(r[0])]))}</div>
    <div class="panel"><h3>Planned effort by epic owner · # epics</h3>${hbars(group(e=>e.owner||'Unassigned',7))}</div></div></div>${footer()}</section>`;};
  const PER=15,PAGES=Math.max(1,Math.ceil(E.length/PER)),index=pg=>`<section class="slide"><div class="accent-bar"></div>${header(PAGES>1?`Epics (${pg+1} of ${PAGES})`:'Epics',(mode==='review'?'Status · ':'Agenda · ')+'click to jump')}<div class="slide-body" style="padding-top:16px;overflow:hidden"><table class="idx"><colgroup><col style="width:36px"><col><col style="width:170px"><col style="width:170px"><col style="width:56px"><col style="width:56px"><col style="width:130px"></colgroup><thead><tr><th class="num">#</th><th>Epic</th><th>Theme</th><th>Owner</th><th class="num">Days</th><th class="num">Done</th><th>Health</th></tr></thead><tbody>${E.slice(pg*PER,pg*PER+PER).map((e0,i0)=>{const e=e0,i=pg*PER+i0;const live=e.workItems.filter(w=>!isNever(w.status));return `<tr class="click" data-goto="${2+PAGES+i}"><td class="num">${i+1}</td><td><span class="dot" style="background:${tcol(e.theme)}"></span>${esc(e.name)}</td><td>${esc(e.theme||'—')}</td><td>${esc(e.owner||'—')}</td><td class="num">${Math.round(e.points*10)/10}</td><td class="num">${live.filter(w=>isDone(w.status)).length}/${live.length}</td><td>${badge(e.health)}</td></tr>`;}).join('')}</tbody></table></div>${footer()}</section>`;
  const notes=D.notes||(D.notes={}),asks=D.asks||(D.asks=[]);
  const noteCard=e=>D.edit?`<div class="card"><div class="section-label" style="margin-top:0">Presenter note</div><textarea class="note-e" data-note="${esc(e.id)}" maxlength="1200" placeholder="Update, decision or context to share on this epic">${esc(notes[e.id]||'')}</textarea></div>`:notes[e.id]?`<div class="card"><div class="section-label" style="margin-top:0">Note</div><div class="note-t">${esc(notes[e.id])}</div></div>`:'';
  const askSlide=()=>D.edit||asks.length?`<section class="slide"><div class="accent-bar"></div>${header('Asks & Decisions Needed','Wrap-up')}<div class="slide-body"><div class="asks">${asks.map((a,i)=>D.edit?`<div class="ask ${a.type==='Decision'?'decision':''}"><select data-ask="${i}" data-k="type" aria-label="Type"><option${a.type==='Ask'?' selected':''}>Ask</option><option${a.type==='Decision'?' selected':''}>Decision</option></select><input data-ask="${i}" data-k="q" maxlength="200" value="${esc(a.q)}" placeholder="What is needed" aria-label="Ask"><textarea data-ask="${i}" data-k="d" maxlength="600" rows="3" placeholder="Why / options" aria-label="Details">${esc(a.d)}</textarea><input data-ask="${i}" data-k="who" maxlength="100" value="${esc(a.who)}" placeholder="Who needs to act" aria-label="Owner of the ask"><button type="button" data-ask-del="${i}">Remove</button></div>`:`<div class="ask ${a.type==='Decision'?'decision':''}"><div class="t">${esc(a.type)}</div><div class="q">${esc(a.q)}</div><div class="d">${esc(a.d)}</div>${a.who?`<div class="who">→ ${esc(a.who)}</div>`:''}</div>`).join('')}</div>${D.edit&&asks.length<12?'<div class="asks-add"><button type="button" data-ask-add="1">+ Add an ask or decision</button></div>':''}</div>${footer()}</section>`:'';
  const epic=(e,i)=>{const col=tcol(e.theme),live=e.workItems.filter(w=>!isNever(w.status)),pg=e.progress,n=pg?(pg.total||1):(live.length||1),dn=pg?pg.done:live.filter(w=>isDone(w.status)).length,wp=pg?pg.wip:live.filter(w=>!isDone(w.status)&&isWip(w.status)).length,pct=pg&&pg.pct!=null?Math.round(pg.pct):Math.round(dn/n*100),unit=pg?pg.unit:'workstreams',tot=pg?pg.total:live.length,maxD=Math.max(1,...e.workItems.map(w=>w.days||0)),days=sum(e.workItems,w=>w.days);
   const text=(e.comments?`<div class="section-label">Status update</div><div class="goal" style="border-left-color:${col}">${esc(e.comments)}</div>`:'')+(e.pathToGreen?`<div class="section-label">Path to green</div><div class="goal" style="border-left-color:var(--amber)">${esc(e.pathToGreen)}</div>`:''),shown=[...e.workItems].sort((a,b)=>isDone(a.status)-isDone(b.status)).slice(0,8),rows=shown.map(w=>`<tr><td class="wi">${w.url?`<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.id)}</a>`:esc(w.id)}</td><td title="${esc(w.subject)}">${esc(w.subject)}</td><td class="who" title="${esc(w.assignee)}">${esc(w.assignee||'—')}</td><td class="eff">${w.days?`<span class="effbar" style="width:${Math.round(w.days/maxD*50)}px;background:${col}"></span>${w.days}d`:'<span style="color:var(--grey)">—</span>'}</td><td class="st">${esc(w.status||'—')}</td></tr>`).join('')||`<tr><td colspan="5" style="color:var(--amber)">No workstreams yet</td></tr>`;
   const flags=flagsFor(e,mode,D.asOf).map(f=>`<li class="${f.ok?'good':'bad'}${f.crit?' crit':''}">${esc(f.text)}</li>`).join('');
   return `<section class="slide"><div class="accent-bar" style="background:${col}"></div>${header(`Epic ${i+1} of ${E.length}`,e.theme||'')}<div class="slide-body"><div class="epic-grid"><div style="min-width:0">
    <div class="epic-title">${esc(e.name)}</div><div class="epic-meta">${badge(e.health)}${e.priority!=null&&e.priority!==''?`<span class="pill">P${esc(e.priority)}</span>`:''}${e.line?`<span class="pill">${esc(e.line)}</span>`:''}<span>· Owner <b style="color:var(--ink)">${esc(e.owner||'Unassigned')}</b></span></div>
    ${e.project?`<div class="project">Project: <b>${esc(e.project)}</b></div>`:''}
    ${e.goal?`<div class="goal" style="border-left-color:${col}">${esc(e.goal)}</div>`:(e.progress?'':'<div class="goal missing">No SMART goal or description</div>')}
    ${text}${e.workItems.length||!text?`<div class="section-label">Workstreams</div><table class="ws${shown.length<=5?' wrap':''}"><thead><tr><th>Story</th><th>Workstream</th><th>Owner</th><th>Effort</th><th style="text-align:right">Status</th></tr></thead><tbody>${rows}</tbody></table>`:''}${e.workItems.length>8?`<p class="more">+ ${e.workItems.length-8} more workstreams (open ones are listed first)</p>`:''}</div>
    <div><div class="card"><div class="section-label" style="margin-top:0">${mode==='review'?'Progress':'Planned effort'}</div><div class="bignum"><span class="v">${mode==='review'?pct+'%':Math.round(e.points*10)/10}</span><span class="u">${mode==='review'?`${dn} / ${tot} ${unit} done`:`days${days?` · ${live.length} workstreams`:''}`}</span></div>
    <div class="stack"><div style="width:${dn/n*100}%;background:var(--green)"></div><div style="width:${wp/n*100}%;background:var(--blue)"></div></div>
    <div class="legend"><span><i style="background:var(--green)"></i>Done ${dn}</span><span><i style="background:var(--blue)"></i>In progress ${wp}</span><span><i style="background:#eef1f4"></i>Planned ${Math.max(0,tot-dn-wp)}</span></div></div>
    ${noteCard(e)}<div class="card"><div class="section-label" style="margin-top:0">${mode==='review'?'Risks &amp; blockers':'Planning checklist'}</div><ul class="flags">${flags}</ul></div>
    ${e.start||e.end?`<div class="card"><div class="section-label" style="margin-top:0">Dates</div><div style="font-size:14px">${fmt(e.start)} → ${fmt(e.end)}</div></div>`:''}
    ${link('ADM_Epic__c',e.gusId)?`<a class="gus-link" href="${esc(link('ADM_Epic__c',e.gusId))}" target="_blank" rel="noopener">Open epic in GUS ↗</a>`:''}</div></div></div>${footer()}</section>`;};
  const gaps=()=>{const live=all.filter(w=>!isNever(w.status)),names=a=>a.slice(0,5).map(e=>`<div title="${esc(e.name)}">${esc(e.name)}</div>`).join('');
   const card=(n,t,ti,d)=>`<div class="h ${n?'':'good'}"><div class="n">${n}<small> / ${t}</small></div><div class="t">${ti}</div><div class="d">${d}</div></div>`;
   const noDates=E.filter(e=>!(e.start&&e.end)),noGoal=E.filter(e=>!e.goal),noOwner=live.filter(w=>!w.assignee),noEst=live.filter(w=>!w.days),risk=E.filter(e=>tone(e.health)==='r'||tone(e.health)==='a'),noProj=E.filter(e=>!e.project);
   return `<section class="slide"><div class="accent-bar" style="background:var(--amber)"></div>${header(mode==='review'?'Risks, Blockers & Hygiene':'Planning Gaps to Close','Wrap-up')}<div class="slide-body"><div class="hyg">
    ${mode==='review'?card(risk.length,E.length,'Epics at risk or blocked',names(risk)||'None.'):card(noOwner.length,live.length,'Workstreams without an owner','Assign an engineer to each workstream.')}
    ${card(noEst.length,live.length,'Workstreams without an estimate','Add days to every workstream.')}
    ${card(noDates.length,E.length,'Epics without planned dates',names(noDates)||'All epics are dated.')}
    ${card(noGoal.length,E.length,'Epics without a SMART goal',names(noGoal)||'All epics have a goal.')}
    ${card(noProj.length,E.length,'Epics without a project',names(noProj)||'All epics are linked to a project.')}
    ${mode==='review'?card(noOwner.length,live.length,'Workstreams without an owner','Assign an engineer to each workstream.'):card(risk.length,E.length,'Epics at risk or blocked',names(risk)||'None.')}
   </div></div>${footer()}</section>`;};
  return {html:[title(),glance(),...Array.from({length:PAGES},(_,k)=>index(k)),...E.map(epic),gaps(),askSlide()].join(''),first:3};
 }

 let cur=0,slides=[],state=null,onKey=null,onResize=null;
 function go(n){cur=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,i)=>{s.classList.toggle('active',i===cur);s.classList.toggle('prev',i<cur);});
  const c=document.getElementById('dk-count'),p=document.getElementById('dk-prog');if(c)c.textContent=`${cur+1} / ${slides.length}`;if(p)p.style.width=((cur+1)/slides.length*100)+'%';}
 function fit(){const s=Math.min(innerWidth/1280,innerHeight/720)*.94;slides.forEach(sl=>sl.style.scale=s);}
 function paint(){const st=document.querySelector('#dk .dk-stage'),b=build(state);st.innerHTML=b.html;slides=[...st.querySelectorAll('.slide')];
  slides.forEach((s,i)=>{const pg=s.querySelector('.pg');if(pg)pg.textContent=`${i+1} / ${slides.length}`;});
  st.querySelectorAll('[data-goto]').forEach(r=>r.addEventListener('click',()=>go(Number(r.dataset.goto))));
  document.querySelectorAll('#dk [data-mode]').forEach(x=>x.classList.toggle('on',x.dataset.mode===(state.mode==='review'?'review':'planning')));
  slides.forEach(s=>s.style.transition='none');fit();go(cur);requestAnimationFrame(()=>requestAnimationFrame(()=>slides.forEach(s=>s.style.transition='')));}
 function close(){const d=document.getElementById('dk');if(d)d.remove();const s=document.getElementById('dk-css');if(s)s.remove();
  document.removeEventListener('keydown',onKey,true);removeEventListener('resize',onResize);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});document.body.style.overflow=state&&state.prevOverflow||'';}
 /** Tells the host (planner or review page) that notes or asks changed so it can save them. */
 function changed(){if(typeof state.onChange==='function')state.onChange({notes:state.notes||{},asks:(state.asks||[]).filter(a=>String(a.q).trim())});}
 function open(data,opts){
  close();state=Object.assign({mode:'planning',gusUrl:'https://gus.lightning.force.com/lightning/r/',asOf:new Date().toISOString().slice(0,10)},data,opts||{});state.prevOverflow=document.body.style.overflow;
  const st=document.createElement('style');st.id='dk-css';st.textContent=CSS;document.head.appendChild(st);
  const d=document.createElement('div');d.id='dk';d.setAttribute('data-nocf','');d.setAttribute('role','dialog');d.setAttribute('aria-label','Epic review presentation');
  d.innerHTML=(state.standalone?'':'')+'<div class="dk-prog" id="dk-prog"></div><div class="dk-stage"></div><div class="dk-bar"><button type="button" data-a="prev" title="Previous (←)" aria-label="Previous slide">◀</button><span id="dk-count"></span><button type="button" data-a="next" title="Next (→)" aria-label="Next slide">▶</button><button type="button" data-mode="planning" title="Planning view">Planning</button><button type="button" data-mode="review" title="Monthly review view: progress and risks">Monthly review</button>'+(state.standalone?'':'<button type="button" data-a="edit" title="Add presenter notes and asks">Edit notes</button>')+'<button type="button" data-a="print" title="Print or save as PDF">Print</button>'+(state.standalone?'':'<button type="button" data-a="save" title="Download this deck as an HTML file">Download</button>')+(!state.standalone&&state.api?'<button type="button" data-a="share" title="Post a summary to Slack (you pick the channel)">Share to Slack</button>':'')+'<button type="button" data-a="full" title="Fullscreen (F)" aria-label="Fullscreen">⛶</button>'+(state.standalone?'':'<button type="button" data-a="close" title="Close (Esc)" aria-label="Close presentation">✕</button>')+'</div>';
  document.body.appendChild(d);document.body.style.overflow='hidden';cur=0;
  d.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
   if(a==='prev')go(cur-1);else if(a==='next')go(cur+1);else if(a==='close')close();else if(a==='edit'){state.edit=!state.edit;b.classList.toggle('on',state.edit);paint();}else if(a==='print')print();else if(a==='share')share();else if(b.dataset.askAdd){state.asks.push({type:'Ask',q:'',d:'',who:''});changed();paint();}else if(b.dataset.askDel!=null){state.asks.splice(Number(b.dataset.askDel),1);changed();paint();}else if(a==='save'){b.disabled=true;download(state).catch(err=>alert(err.message)).finally(()=>b.disabled=false);}
   else if(a==='full')document.fullscreenElement?document.exitFullscreen():d.requestFullscreen&&d.requestFullscreen();
   else if(b.dataset.mode){state.mode=b.dataset.mode;paint();}});
  d.addEventListener('input',e=>{const t=e.target;if(t.dataset.note!=null){(state.notes||(state.notes={}))[t.dataset.note]=t.value;changed();}else if(t.dataset.ask!=null){state.asks[Number(t.dataset.ask)][t.dataset.k]=t.value;changed();}});
  d.addEventListener('change',e=>{const t=e.target;if(t.dataset.ask!=null&&t.dataset.k==='type'){paint();}});
  onKey=e=>{if(e.target&&(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||(e.target.closest&&e.target.closest('.dk-share'))))return;const k=e.key;
   if(['ArrowRight','PageDown',' ','Enter'].includes(k)){e.preventDefault();e.stopPropagation();go(cur+1);}
   else if(['ArrowLeft','PageUp','Backspace'].includes(k)){e.preventDefault();e.stopPropagation();go(cur-1);}
   else if(k==='Home')go(0);else if(k==='End')go(slides.length-1);
   else if(k==='Escape'){if(!document.fullscreenElement&&!state.standalone)close();}
   else if(k.toLowerCase()==='f')d.requestFullscreen&&(document.fullscreenElement?document.exitFullscreen():d.requestFullscreen());};
  onResize=fit;document.addEventListener('keydown',onKey,true);addEventListener('resize',onResize);paint();
 }
 /** Plain-text Slack summary of the deck: health counts, one line per epic, and the asks. */
 function summaryText(D){
  const E=D.epics||[],cnt={g:0,a:0,r:0,n:0};E.forEach(e=>cnt[tone(e.health)||'n']++);
  const dot={g:':large_green_circle:',a:':large_yellow_circle:',r:':red_circle:',n:':white_circle:'};
  const L=[`*${D.team} — ${D.release}* ${D.mode==='review'?'monthly review':'epic review'} (${D.asOf})`,`${E.length} epics: ${cnt.g} on track, ${cnt.a} watch, ${cnt.r} at risk${cnt.n?`, ${cnt.n} not set`:''}`,''];
  E.slice(0,40).forEach(e=>{const pr=e.progress&&e.progress.pct!=null?` — ${Math.round(e.progress.pct)}%`:'',lk=e.gusId?`[${String(e.name).replace(/[\[\]]/g,'')}](${D.gusUrl}ADM_Epic__c/${e.gusId}/view)`:String(e.name);
   L.push(`${dot[tone(e.health)||'n']} ${lk}${e.owner?' ('+e.owner+')':''}${pr}`);});
  if(E.length>40)L.push(`…and ${E.length-40} more`);
  const asks=(D.asks||[]).filter(x=>x.q);
  if(asks.length){L.push('','*Asks & decisions*');asks.forEach(x=>L.push(`• ${x.type||'Ask'}: ${x.q}${x.who?' — '+x.who:''}`));}
  return L.join('\n').slice(0,3900);
 }
 /** Share to Slack: the channel is chosen in this dialog on every use (a configured team channel or a pasted link/ID) and the post only happens on the explicit Post click. */
 async function share(){
  const api=state.api;if(!api)return;
  const dk=document.getElementById('dk');if(!dk||dk.querySelector('.dk-share'))return;
  const o=document.createElement('div');o.className='dk-share';o.innerHTML='<div class="dk-sh-box" role="dialog" aria-label="Share to Slack"><h3>Share to Slack</h3><label>Channel<select id="dk-sh-ch"><option value="">Loading channels…</option></select></label><label id="dk-sh-oth" hidden>Channel link or ID<input id="dk-sh-in" placeholder="https://…/archives/C0123ABCD"></label><label>Message<textarea id="dk-sh-tx" rows="10"></textarea></label><p class="dk-sh-note">The summary is posted through GUS MIYO, which must be invited to the channel. The HTML file itself is not attached; use Download to share it.</p><p id="dk-sh-err" class="dk-sh-err" role="alert"></p><div class="dk-sh-act"><button type="button" data-sh="cancel">Cancel</button><button type="button" data-sh="send" class="on" disabled>Post</button></div></div>';
  dk.appendChild(o);
  const $=i=>o.querySelector('#'+i),sel=$('dk-sh-ch'),oth=$('dk-sh-oth'),inp=$('dk-sh-in'),tx=$('dk-sh-tx'),err=$('dk-sh-err'),send=o.querySelector('[data-sh=send]');
  tx.value=summaryText(state);
  const label=()=>sel.value==='__other'?'the pasted channel':(sel.selectedOptions[0]||{}).textContent||'';
  const upd=()=>{oth.hidden=sel.value!=='__other';send.disabled=!(sel.value&&(sel.value!=='__other'||inp.value.trim())&&tx.value.trim());send.textContent=sel.value?'Post to '+(sel.value==='__other'?'channel':(sel.selectedOptions[0].dataset.nm||'channel')):'Post';};
  sel.onchange=upd;inp.oninput=upd;tx.oninput=upd;
  o.addEventListener('click',async e=>{const b=e.target.closest('[data-sh]');if(!b){if(e.target===o)o.remove();return;}
   if(b.dataset.sh==='cancel')return o.remove();
   if(!confirm('Post this summary to '+label()+'?'))return;
   send.disabled=true;err.textContent='';
   try{const body={text:tx.value};if(sel.value==='__other')body.channel=inp.value.trim();else body.teamId=sel.value;
    const r=await api('deck-slack-send',body);o.remove();if(window.toast)window.toast('Posted to '+(r.channel||'Slack'),false);}
   catch(x){err.textContent=(x&&x.message)||'Could not post.';upd();}});
  try{const r=await api('slack-channels'),T=(r.teams||[]).filter(t=>t.channel);
   sel.innerHTML='<option value="">Choose a channel…</option>'+T.map(t=>`<option value="${esc(t.teamId)}" data-nm="${esc(t.channel.name||t.channel.id)}">${esc((t.channel.name||t.channel.id)+' ('+t.name+')')}</option>`).join('')+'<option value="__other">Another channel (paste link or ID)…</option>';}
  catch(x){sel.innerHTML='<option value="">Choose a channel…</option><option value="__other">Another channel (paste link or ID)…</option>';}
  upd();sel.focus();
 }
 /** Saves the deck as one self-contained HTML file: the same template, with this data filled in. It opens offline with no ReleaseIQ session. */
 async function download(data,opts){
  let src='';try{src=SRC?await (await fetch(SRC)).text():'';}catch(_){}
  if(!src)throw new Error('The presentation template could not be loaded.');
  const d=Object.assign({mode:'planning'},data,opts||{},{edit:false,onChange:undefined,prevOverflow:undefined}),json=JSON.stringify(d).replace(/</g,'\\u003c');
  const html='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(d.team+' — '+d.release+' epic review')+'</title></head><body style="margin:0;background:#1b1f24"><script>'+src.replace(/<\/script/gi,'<\\/script')+'<\/script><script>EpicDeck.open('+json+',{standalone:true});<\/script></body></html>';
  const name=(d.team+'-'+d.release+'-'+(d.mode==='review'?'monthly-review':'epic-review')).replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()+'.html';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);return name;
 }
 root.EpicDeck={open,close,download,build,flagsFor,summaryText};
})(typeof window!=='undefined'?window:globalThis);
