/* Epic Review deck: a slide template that is written once and filled from data, so a review never needs a regenerated HTML file.
   EpicDeck.open(data) shows it full screen. data = {team, release, asOf, start, end, gusUrl, mode, epics:[{id,gusId,name,health,owner,points,theme,line,priority,project,goal,start,end,workItems:[{id,url,name,subject,status,assignee,days}]}]} */
(function(root){
 'use strict';
 let BUILD='';
 const SRC=(typeof document!=='undefined'&&document.currentScript&&document.currentScript.src)||'';
 try{if(typeof fetch==='function'&&typeof document!=='undefined'&&document.currentScript&&document.currentScript.src)fetch(new URL('build.json',document.currentScript.src)).then(r=>r.ok?r.json():null).then(j=>{if(j&&/^[0-9a-f]{7}\+?$/.test(String(j.commit||'')))BUILD=j.commit;}).catch(()=>{});}catch(_){}
 const CSS=`
#dk{--navy:#032d60;--blue:#0176d3;--sky:#e8f4fd;--ink:#181818;--muted:#5c6670;--line:#e1e5ea;--green:#2e844a;--amber:#dd7a01;--red:#ba0517;--grey:#8a939c;position:fixed;inset:0;z-index:100000;background:#1b1f24;color:var(--ink);font-family:"Salesforce Sans",Arial,sans-serif;overflow:hidden}
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
#dk .title-slide{background:#fff;color:#181818}#dk .title-slide::before{content:"";position:absolute;left:0;top:0;bottom:0;width:8px;background:var(--blue)}
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
#dk table.idx{width:100%!important;min-width:0!important;max-width:100%!important;border-collapse:collapse;font-size:13px;table-layout:fixed}
#dk table.idx th{text-align:left;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;padding:0 8px 6px;border-bottom:2px solid var(--line)}
#dk table.idx td{padding:0 8px;height:26px;border-bottom:1px solid #f0f2f4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dk table.idx td:last-child{overflow:visible}
#dk table.idx th::after,#dk table.ws th::after{content:none!important}#dk table th{cursor:default!important}#dk table.idx td.num,#dk table.idx th.num{text-align:right;font-variant-numeric:tabular-nums}
#dk table.idx tr.click{cursor:pointer}#dk table.idx tr.click:hover td{background:var(--sky)}
#dk .dot{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:8px;vertical-align:-1px}
#dk .epic-grid{display:grid;grid-template-columns:1.55fr 1fr;gap:32px;height:100%}
#dk .epic-title{font-size:27px;font-weight:800;line-height:1.2;margin-bottom:10px}
#dk .epic-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px;font-size:14px;color:var(--muted)}
#dk .project{font-size:13px;color:var(--muted);margin-bottom:10px}#dk .project b{color:var(--ink);font-weight:600}
#dk .goal{font-size:15px;line-height:1.5;color:#333;margin-bottom:12px;padding-left:14px;border-left:3px solid var(--blue);white-space:pre-line;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
#dk .goal.missing{color:var(--amber);border-left-color:var(--amber);font-style:italic}
#dk .outcome{border:1px solid var(--line);border-left:6px solid var(--blue);border-radius:8px;background:#f6f9fc;padding:10px 16px;margin:6px 0 10px}#dk .outcome .o-l{font-size:11px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase;color:var(--muted)}#dk .outcome .o-t{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;font-size:17px;font-weight:700;line-height:1.35;color:var(--ink);margin-top:2px}
#dk .months{display:grid;gap:12px;align-items:stretch}#dk .month{border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:0}#dk .month .m-more{font-size:11px;font-weight:700;margin-top:6px}#dk .month .m-l{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--blue);margin-bottom:6px}#dk .month .m-t{line-height:1.4;color:#222;overflow-wrap:anywhere}#dk .month .lbl{color:var(--navy)}
#dk .utabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:10px 0 8px}#dk .utab{all:unset;box-sizing:border-box;cursor:pointer;font-size:12px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);padding:6px 12px;border-bottom:3px solid transparent;margin-bottom:-1px}#dk .utab:hover{color:var(--navy)}#dk .utab.on{color:var(--navy);border-bottom-color:var(--blue)}#dk .utab:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
#dk .upanel[hidden]{display:none}#dk .aiu{overflow:auto}#dk .aiu-grid{display:grid;gap:12px;align-items:stretch}#dk .aiu-c{border:1px solid var(--line);border-radius:8px;padding:10px 14px;min-width:0}#dk .aiu-c h4{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:var(--blue);margin-bottom:6px}#dk .aiu-c ul{padding-left:16px;font-size:13.5px;line-height:1.4;color:#222}#dk .aiu-c li{margin-bottom:4px;overflow-wrap:anywhere}#dk .aiu-meta{display:flex;gap:10px;align-items:center;font-size:11px;color:var(--muted);margin-top:8px}#dk .aiu-meta button{all:unset;cursor:pointer;color:var(--blue);font-weight:700}#dk .aiu-meta button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}#dk .aiu-msg{font-size:13px;color:var(--muted);padding:10px 0}#dk .aiu-msg button{all:unset;cursor:pointer;color:var(--blue);font-weight:700;margin-left:8px}
#dk .section-label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin:10px 0 6px}
#dk table.ws{width:100%!important;min-width:0!important;border-collapse:collapse;font-size:13px;table-layout:fixed}#dk table.ws td:nth-child(2){white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dk table.ws.wrap td:nth-child(2){white-space:normal;line-height:1.3;overflow:hidden;max-height:2.6em}#dk table.ws.wrap td:nth-child(2) span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
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
#dk .dk-bar .cnt{background:#e6a817;color:#1b1f24;border-radius:999px;padding:0 6px;font-weight:700}
#dk .dk-flt{position:fixed;bottom:64px;left:50%;transform:translateX(-50%);width:min(300px,92vw);background:#fff;color:#1b1f24;border-radius:12px;padding:12px 14px;box-shadow:0 8px 30px rgba(0,0,0,.35);z-index:4;display:flex;flex-direction:column;gap:8px;font:13px system-ui,sans-serif}#dk .dk-flt[hidden]{display:none}#dk .dk-flt label{display:flex;flex-direction:column;gap:3px;font-weight:600}#dk .dk-flt select{font:inherit;padding:5px;border:1px solid #c9d1d9;border-radius:6px}#dk .dk-flt small{color:#5a6570}
#dk .dk-bar{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:6px;align-items:center;background:rgba(0,0,0,.6);padding:6px 10px;border-radius:999px;color:#fff;font-size:13px;z-index:2;opacity:.35;transition:opacity .2s}
#dk .dk-share{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:5;font:14px system-ui,sans-serif}#dk .dk-sh-box{background:#fff;color:#1b1f24;border-radius:12px;padding:18px 20px;width:min(560px,92vw);display:flex;flex-direction:column;gap:10px}#dk .dk-sh-box [hidden]{display:none}#dk .dk-sh-box h3{margin:0}#dk .dk-sh-box label{display:flex;flex-direction:column;gap:4px;font-weight:600}#dk .dk-sh-box select,#dk .dk-sh-box input,#dk .dk-sh-box textarea{font:13px system-ui,sans-serif;padding:6px 8px;border:1px solid #bbb;border-radius:6px}#dk .dk-sh-note{margin:0;font-size:12px;color:#555}#dk .dk-sh-err{margin:0;color:#b3261e;font-size:13px}#dk .dk-sh-act{display:flex;justify-content:flex-end;gap:8px}#dk .dk-sh-act button{background:#eee;color:#1b1f24;border:none;padding:7px 14px;border-radius:8px;cursor:pointer}#dk .dk-sh-act button.on{background:#0b5cab;color:#fff}#dk .dk-sh-act button:disabled{opacity:.5;cursor:default}
#dk .dk-bar .dk-rf{font-size:12px;opacity:.85;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#dk .dk-bar:hover,#dk .dk-bar:focus-within{opacity:1}
#dk .dk-bar #dk-count{white-space:nowrap}#dk .dk-bar button{white-space:nowrap;background:none;border:none;color:#fff;font-size:14px;cursor:pointer;padding:4px 10px;border-radius:999px}
#dk .dk-bar button:hover,#dk .dk-bar button.on{background:rgba(255,255,255,.2)}
#dk .dk-prog{position:fixed;top:0;left:0;height:3px;background:var(--blue);z-index:2;transition:width .3s}
#dk .note-t{font-size:14px;line-height:1.45;white-space:pre-line;color:#333}#dk .note-e{width:100%;min-height:90px;font:inherit;font-size:13px;border:1px solid #8a9db3;border-radius:6px;padding:8px;resize:vertical}
#dk .asks{display:grid;grid-template-columns:1fr 1fr;gap:16px}#dk .ask{border:1px solid var(--line);border-left:5px solid var(--blue);border-radius:8px;padding:12px 16px}#dk .ask.decision{border-left-color:var(--amber)}
#dk .ask .t{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted)}#dk .ask .q{font-size:16px;font-weight:700;margin:3px 0}#dk .ask .d{font-size:13px;color:#444;line-height:1.4}#dk .ask .who{font-size:12px;color:var(--muted);margin-top:6px}
#dk .ask input,#dk .ask textarea,#dk .ask select{width:100%;font:inherit;font-size:13px;border:1px solid #8a9db3;border-radius:6px;padding:5px 8px;margin:3px 0}
#dk .ask button{font-size:12px;border:1px solid var(--line);background:#fff;border-radius:6px;padding:3px 8px;cursor:pointer}
#dk .asks-add{margin-top:14px}#dk .asks-add button{font-size:13px;border:1px dashed var(--blue);background:var(--sky);color:var(--blue);border-radius:6px;padding:6px 12px;cursor:pointer}
@media print{#dk{position:static;background:#fff;overflow:visible}#dk .dk-stage{position:static;display:block}#dk .slide{position:relative;opacity:1;transform:none!important;scale:1!important;box-shadow:none;border-radius:0;break-after:page}#dk .dk-bar,#dk .dk-prog,#dk .dk-flt{display:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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

 const MONTHS=['january','february','march','april','may','june','july','august','september','october','november','december'];
 const plainTxt=t=>String(t||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/(p|div|li)>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\r/g,'');
 /** Splits Epic Health Comments into the Outcome and the dated monthly updates ("November Update:" / "October 2026 Update:"), newest first. */
 function parseUpdates(raw,asOf){
  const t=plainTxt(raw),re=/^[ \t\-–—_=*]*\b(January|February|March|April|May|June|July|August|September|October|November|December)(?:[ \t]+(\d{4}))?[ \t]+Update[ \t]*(?::[ \t]*)?$/gim,hits=[...t.matchAll(re)];
  const ref=new Date(String(asOf||'').slice(0,10)+'T00:00:00'),ry=isNaN(ref)?new Date().getFullYear():ref.getFullYear(),rm=isNaN(ref)?new Date().getMonth():ref.getMonth();
  const clean=x=>x.split('\n').filter(l=>!/^[\s\-–—_=*]{3,}$/.test(l)).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  const head=clean(hits.length?t.slice(0,hits[0].index):t),months=hits.map((h,i)=>{const m=MONTHS.indexOf(h[1].toLowerCase()),y=h[2]?Number(h[2]):(m>rm?ry-1:ry);
   return {key:y*12+m,label:h[1]+' '+y,text:clean(t.slice(h.index+h[0].length,i+1<hits.length?hits[i+1].index:t.length))};}).filter(x=>x.text).sort((a,b)=>b.key-a.key);
  let outcome='';const om=/^[ \t]*Outcome(?:[ \t]*\/[ \t]*Progress)?[ \t]*:[ \t]*([^\n]*)/im.exec(head);
  if(om&&om[1].trim()){outcome=om[1].trim();}
  else if(months[0]){const m=/^[ \t]*Outcome(?:[ \t]*\/[ \t]*Progress)?[ \t]*:[ \t]*([\s\S]*?)(?=\n\s*(?:Blockers?|Risks?|Next steps?|Next|Dependencies|Path to green)\b|$)/im.exec(months[0].text);if(m)outcome=m[1].trim();}
  return {outcome,head:clean(head.replace(/^\s*Outcome[^\n]*\n?/i,'')),months};
 }
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
  if(!live.length){if(!e.progress)add(false,'','No workstreams tracked in GUS for this epic');}
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
  const footer=()=>`<div class="slide-footer"><span>${esc(D.team)} · ${esc(D.release)} · ${mode==='review'?'Monthly review':'Epic review'} · Source: GUS, as of ${fmt(D.asOf)}${BUILD?' · Build '+esc(BUILD):''}</span><span class="pg"></span></div>`;
  const header=(t,c)=>`<div class="slide-header"><h2>${esc(t)}</h2><span class="crumb">${esc(c)}</span></div>`;
  const hbars=rows=>{const max=Math.max(1,...rows.map(r=>r[1]));return rows.map(([n,v,x,c])=>`<div class="hbar"><div class="nm" title="${esc(n)}">${c?`<span class="dot" style="background:${c}"></span>`:''}${esc(n)}</div><div class="track"><div class="fill" style="width:${(v/max*100).toFixed(1)}%;${c?`background:${c}`:''}"></div></div><div class="val"><b>${v}</b> d · ${x}</div></div>`).join('');};
  const group=(f,top)=>{const m={};E.forEach(e=>{const k=f(e)||'—';(m[k]=m[k]||{d:0,n:0}).d+=e.points||0;m[k].n++;});return Object.entries(m).sort((a,b)=>b[1].d-a[1].d).slice(0,top).map(([k,v])=>[k,Math.round(v.d*10)/10,v.n]);};
  const title=()=>`<section class="slide title-slide"><div class="inner"><div class="kicker">${esc(D.team)} · ${mode==='review'?'Monthly review':'Release planning'}</div><h1>${esc(D.release)}<br>${mode==='review'?'Epic status review':'Epic review'}</h1><div class="sub">${E.length} epic${E.length===1?'':'s'} · ${all.length?`${all.length} workstream${all.length===1?'':'s'}`:'workstreams not tracked in GUS'} · ${Math.round(totalPts)} planned days${all.length||!E.length?'':' (epic estimates)'}</div><div class="meta">${D.start?`<div><b>Window</b>${fmt(D.start)} – ${fmt(D.end)}</div>`:''}<div><b>Data as of</b>${fmt(D.asOf)}</div><div><b>Source</b>GUS epics and user stories</div></div></div></section>`;
  const glance=()=>{const c=t=>E.filter(e=>tone(e.health)===t).length,started=E.filter(e=>all.length&&e.workItems.some(w=>isDone(w.status)||isWip(w.status))).length,dn=all.filter(w=>isDone(w.status)).length;
   return `<section class="slide"><div class="accent-bar"></div>${header('At a Glance',D.release)}<div class="slide-body"><div class="kpis">
    <div class="kpi"><div class="v">${E.length}</div><div class="l">Epics</div></div>
    <div class="kpi g"><div class="v">${c('g')}</div><div class="l">On track / done</div></div>
    <div class="kpi a"><div class="v">${c('a')}</div><div class="l">Watch / at risk</div></div>
    <div class="kpi r"><div class="v">${c('r')}</div><div class="l">Blocked</div></div>
    <div class="kpi n"><div class="v">${mode==='review'?`${dn}<small> / ${all.length}</small>`:started+'<small> / '+E.length+'</small>'}</div><div class="l">${mode==='review'?'Workstreams done':'Epics started'}</div></div></div>
    <div class="panels"><div class="panel"><h3>Planned effort by theme · # epics</h3>${hbars(group(e=>e.theme||'No theme',7).map(r=>[...r,tcol(r[0])]))}</div>
    <div class="panel"><h3>Planned effort by epic owner · # epics</h3>${hbars(group(e=>e.owner||'Unassigned',7))}</div></div></div>${footer()}</section>`;};
  const PER=15,PAGES=Math.max(1,Math.ceil(E.length/PER)),index=pg=>`<section class="slide"><div class="accent-bar"></div>${header(PAGES>1?`Epics (${pg+1} of ${PAGES})`:'Epics',(mode==='review'?'Status · ':'Agenda · ')+'click to jump')}<div class="slide-body" style="padding-top:16px;overflow:hidden"><table class="idx nofit nosort nopage"><colgroup><col style="width:36px"><col><col style="width:170px"><col style="width:170px"><col style="width:56px"><col style="width:56px"><col style="width:130px"></colgroup><thead><tr><th class="num">#</th><th>Epic</th><th>Theme</th><th>Owner</th><th class="num">Days</th><th class="num">Done</th><th>Health</th></tr></thead><tbody>${E.slice(pg*PER,pg*PER+PER).map((e0,i0)=>{const e=e0,i=pg*PER+i0;const live=e.workItems.filter(w=>!isNever(w.status));return `<tr class="click" data-goto="${2+PAGES+i}"><td class="num">${i+1}</td><td><span class="dot" style="background:${tcol(e.theme)}"></span>${esc(e.name)}</td><td>${esc(e.theme||'—')}</td><td>${esc(e.owner||'—')}</td><td class="num">${Math.round(e.points*10)/10}</td><td class="num">${live.filter(w=>isDone(w.status)).length}/${live.length}</td><td>${badge(e.health)}</td></tr>`;}).join('')}</tbody></table></div>${footer()}</section>`;
  const notes=D.notes||(D.notes={}),asks=D.asks||(D.asks=[]);
  const noteCard=e=>D.edit?`<div class="card"><div class="section-label" style="margin-top:0">Presenter note</div><textarea class="note-e" data-note="${esc(e.id)}" maxlength="1200" placeholder="Update, decision or context to share on this epic">${esc(notes[e.id]||'')}</textarea></div>`:notes[e.id]?`<div class="card"><div class="section-label" style="margin-top:0">Note</div><div class="note-t">${esc(notes[e.id])}</div></div>`:'';
  const askSlide=()=>D.edit||asks.length?`<section class="slide"><div class="accent-bar"></div>${header('Asks & Decisions Needed','Wrap-up')}<div class="slide-body"><div class="asks">${asks.map((a,i)=>D.edit?`<div class="ask ${a.type==='Decision'?'decision':''}"><select data-ask="${i}" data-k="type" aria-label="Type"><option${a.type==='Ask'?' selected':''}>Ask</option><option${a.type==='Decision'?' selected':''}>Decision</option></select><input data-ask="${i}" data-k="q" maxlength="200" value="${esc(a.q)}" placeholder="What is needed" aria-label="Ask"><textarea data-ask="${i}" data-k="d" maxlength="600" rows="3" placeholder="Why / options" aria-label="Details">${esc(a.d)}</textarea><input data-ask="${i}" data-k="who" maxlength="100" value="${esc(a.who)}" placeholder="Who needs to act" aria-label="Owner of the ask"><button type="button" data-ask-del="${i}">Remove</button></div>`:`<div class="ask ${a.type==='Decision'?'decision':''}"><div class="t">${esc(a.type)}</div><div class="q">${esc(a.q)}</div><div class="d">${esc(a.d)}</div>${a.who?`<div class="who">→ ${esc(a.who)}</div>`:''}</div>`).join('')}</div>${D.edit&&asks.length<12?'<div class="asks-add"><button type="button" data-ask-add="1">+ Add an ask or decision</button></div>':''}</div>${footer()}</section>`:'';
  const fmtBody=t=>esc(t).replace(/^([ \t]*)(Outcome\s*\/\s*Progress|Outcome|Progress|Blockers?|Risks?|Next steps?|Next|Dependencies|Asks?|Path to green)\s*:/gim,'$1<b class="lbl">$2:</b>').replace(/\n/g,'<br>');
  const updatesHtml=(U,col,lk)=>{const hd=U.head&&U.head!==U.outcome?{label:'Status update',text:U.head}:null,shown=[...(hd?[hd]:[]),...U.months.slice(0,2)],n=shown.reduce((a,m)=>a+m.text.length,0)+(U.outcome||'').length,sz=n>1000?12.5:n>600?13.5:15,cont=lk?`<a href="${esc(lk)}" target="_blank" rel="noopener">Continues in the epic comments in GUS ↗</a>`:'Continues in the epic comments in GUS';
   return (U.outcome?`<div class="outcome" style="border-left-color:${col}"><div class="o-l">Outcome</div><div class="o-t">${esc(U.outcome)}</div></div>`:'')+(shown.length?`<div class="months" style="font-size:${sz}px;grid-template-columns:repeat(${shown.length},minmax(0,1fr))">${shown.map(m=>`<div class="month"><div class="m-l">${esc(m.label)}${m===hd?'':' review'}</div><div class="m-t" data-fit>${fmtBody(m.text)}</div><div class="m-more" hidden>${cont}</div></div>`).join('')}</div>${U.months.length>2?`<p class="more">+ ${U.months.length-2} earlier monthly update${U.months.length-2>1?'s':''} in GUS</p>`:''}`:'');};
  const PLAN_REL='268';
  const updateTabs=(e,gus)=>`<div data-uwrap="${esc(e.id)}"><div class="utabs" role="tablist" aria-label="Epic updates"><button type="button" class="utab on" role="tab" aria-selected="true" data-utab="gus">GUS Updates</button><button type="button" class="utab" role="tab" aria-selected="false" data-utab="ai">AI Summarised Updates</button></div><div class="upanel" role="tabpanel" data-upanel="gus">${gus}</div><div class="upanel aiu" role="tabpanel" data-upanel="ai" hidden></div></div>`;
  const epic=(e,i)=>{const col=tcol(e.theme),live=e.workItems.filter(w=>!isNever(w.status)),pg=e.progress,n=pg?(pg.total||1):(live.length||1),dn=pg?pg.done:live.filter(w=>isDone(w.status)).length,wp=pg?pg.wip:live.filter(w=>!isDone(w.status)&&isWip(w.status)).length,pct=pg&&pg.pct!=null?Math.round(pg.pct):Math.round(dn/n*100),unit=pg?pg.unit:'workstreams',tot=pg?pg.total:live.length,maxD=Math.max(1,...e.workItems.map(w=>w.days||0)),days=sum(e.workItems,w=>w.days);
   const U=mode==='review'&&e.comments?parseUpdates(e.comments,D.asOf):null,gusPane=U?updatesHtml(U,col,link('ADM_Epic__c',e.gusId)):e.comments?`<div class="goal" style="border-left-color:${col}">${esc(e.comments)}</div>`:'<div class="aiu-msg">No status updates are recorded in GUS for this epic.</div>',text=((e.comments||e.workItems.length)?updateTabs(e,gusPane):'')+(e.pathToGreen?`<div class="section-label">Path to green</div><div class="goal" style="border-left-color:var(--amber)">${esc(e.pathToGreen)}</div>`:''),shown=[...e.workItems].sort((a,b)=>isDone(a.status)-isDone(b.status)).slice(0,8),rows=shown.map(w=>`<tr><td class="wi">${w.url?`<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.id)}</a>`:esc(w.id)}</td><td title="${esc(w.subject)}"><span>${esc(w.subject)}</span></td><td class="who" title="${esc(w.assignee)}">${esc(w.assignee||'—')}</td><td class="eff">${w.days?`<span class="effbar" style="width:${Math.round(w.days/maxD*50)}px;background:${col}"></span>${w.days}d`:'<span style="color:var(--grey)">—</span>'}</td><td class="st">${esc(w.status||'—')}</td></tr>`).join('')||`<tr><td colspan="5" style="color:var(--amber)">No workstreams yet</td></tr>`;
   const flags=flagsFor(e,mode,D.asOf).map(f=>`<li class="${f.ok?'good':'bad'}${f.crit?' crit':''}">${esc(f.text)}</li>`).join('');
   return `<section class="slide"><div class="accent-bar" style="background:${col}"></div>${header(`Epic ${i+1} of ${E.length}`,e.theme||'')}<div class="slide-body"><div class="epic-grid"${U?' style="grid-template-columns:1.9fr 1fr"':''}><div style="min-width:0">
    <div class="epic-title">${esc(e.name)}</div><div class="epic-meta">${badge(e.health)}${e.priority!=null&&e.priority!==''?`<span class="pill">P${esc(e.priority)}</span>`:''}${e.line?`<span class="pill">${esc(e.line)}</span>`:''}<span>· Owner <b style="color:var(--ink)">${esc(e.owner||'Unassigned')}</b></span></div>
    ${e.project?`<div class="project">Project: <b>${esc(e.project)}</b></div>`:''}
    ${e.goal?`<div class="goal" style="border-left-color:${col}">${esc(e.goal)}</div>`:(e.progress?'':'<div class="goal missing">No SMART goal or description</div>')}
    ${text}${e.workItems.length||!text?`<div class="section-label">Workstreams</div><table class="ws nofit nosort nopage${shown.length<=5?' wrap':''}"><thead><tr><th>Story</th><th>Workstream</th><th>Owner</th><th>Effort</th><th style="text-align:right">Status</th></tr></thead><tbody>${rows}</tbody></table>`:''}${e.workItems.length>8?`<p class="more">+ ${e.workItems.length-8} more workstreams (open ones are listed first)</p>`:''}</div>
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
 /** Update text is never clipped silently: it is cut at the last line that fits, and the card then points to the epic comments in GUS for the rest. */
 function fitText(sl){
  const top=el=>{let y=0;for(let n=el;n&&n!==sl;n=n.offsetParent)y+=n.offsetTop;return y;};
  const ft=sl.querySelector('.slide-footer'),limit=ft?ft.offsetTop-26:sl.clientHeight-58;
  sl.querySelectorAll('[data-fit]').forEach(box=>{box.style.webkitLineClamp='';box.style.display='';box.classList.remove('cut');
   const more=box.parentElement.querySelector('.m-more');if(more)more.hidden=true;});
  const cards=[...sl.querySelectorAll('.months,.outcome')];if(!cards.length)return;
  // everything that follows the update cards in the column keeps its space
  const anchor=cards[0].closest('[data-uwrap]')||cards[cards.length-1],col=anchor.parentElement,after=[...col.children].filter(c=>c.offsetTop>anchor.offsetTop).reduce((n,c)=>n+c.offsetHeight+12,0);
  const room=limit-after;
  sl.querySelectorAll('.months').forEach(m=>{
   const t=[...m.querySelectorAll('[data-fit]')];if(!t.length)return;
   const fits=()=>top(m)+m.offsetHeight<=room;
   if(fits())return;
   const lh=parseFloat(getComputedStyle(t[0]).lineHeight)||18;
   t.forEach(b=>{b.style.display='-webkit-box';b.style.webkitBoxOrient='vertical';b.style.overflow='hidden';});
   let n=Math.max(3,Math.floor(Math.max(...t.map(b=>b.scrollHeight))/lh));
   for(;n>3;n--){t.forEach(b=>b.style.webkitLineClamp=n);if(fits())break;}
   t.forEach(b=>{b.style.webkitLineClamp=n;const cut=b.scrollHeight>b.clientHeight+1;b.parentElement.querySelector('.m-more').hidden=!cut;if(!cut){b.style.display='';b.style.webkitLineClamp='';}});
  });
 }

 /** AI Summarised Updates: executive bullets built from the engineer updates and the epic's work items. Generated once, saved
  *  to the shared cache under a fingerprint of that evidence, and regenerated only when the evidence changes. */
 const AI_VERSION='aiu1',AI_REL='268';
 const fpOf=e=>{const t=JSON.stringify([AI_VERSION,AI_REL,e.name,e.health,e.goal,e.comments,e.pathToGreen,(e.workItems||[]).map(w=>[w.id,w.subject,w.status,w.days,w.assignee])]);let a=0x811c9dc5,b=5381;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);a=Math.imul(a^c,16777619)>>>0;b=(Math.imul(b,33)+c)>>>0;}return a.toString(36).padStart(7,'0')+b.toString(36).padStart(7,'0');};
 const aiAvailable=()=>{try{return typeof window.AppletAI?.complete==='function'&&window.AppletAI.isAvailable()===true;}catch(_){return false;}};
 const AI_SYSTEM='You write executive epic updates for a senior engineering review. Use ONLY the evidence supplied. Never invent progress, dates, numbers or completion; closed or ready-for-review is not released; goals are not achievements. Return ONLY JSON: {"accomplishments":[],"learnings":[],"planForward":[]}. Each item is one crisp line of at most 18 words, executive level, third person, no work item ids, no names of individual engineers. accomplishments: up to 4 delivered outcomes. learnings: up to 3 lessons, risks or blockers that were actually reported. planForward: up to 3 items only if the evidence explicitly plans work for release '+AI_REL+'; otherwise an empty array. Use an empty array whenever the evidence does not support a section.';
 function aiEvidence(e){
  const w=(e.workItems||[]).slice(0,40).map(x=>`- ${x.subject||''} | ${x.status||'?'}${x.days?' | '+x.days+'d':''}`).join('\n');
  return `EPIC: ${e.name||''}\nHEALTH: ${e.health||'n/a'}\nGOAL: ${String(e.goal||'n/a').slice(0,600)}\nENGINEER UPDATES (GUS epic comments):\n${plainTxt(e.comments||'').slice(0,6000)||'none'}\nPATH TO GREEN: ${plainTxt(e.pathToGreen||'')||'none'}\nWORK ITEMS UNDER THE EPIC (${(e.workItems||[]).length}):\n${w||'none'}`;
 }
 function aiParse(out,evidence){
  const raw=String(out&&(out.text||out.answer||out.message)||out||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let v;try{v=JSON.parse(raw);}catch(_){const m=/\{[\s\S]*\}/.exec(raw);try{v=m&&JSON.parse(m[0]);}catch(__){}}
  if(!v||typeof v!=='object')throw Error('The AI response could not be read.');
  const known=new Set(evidence.match(/\d+(?:[.,]\d+)*/g)||[]),cap={accomplishments:4,learnings:3,planForward:3},o={};let n=0;
  for(const k of Object.keys(cap)){o[k]=(Array.isArray(v[k])?v[k]:[]).map(x=>String(x||'').replace(/^[\s\-*•]+/,'').replace(/\s+/g,' ').trim()).filter(x=>x&&x.split(/\s+/).length<=30&&!(x.match(/\d+(?:[.,]\d+)*/g)||[]).some(t=>!known.has(t)&&t!==AI_REL)).slice(0,cap[k]);n+=o[k].length;}
  if(!n)throw Error('No executive-level updates could be drawn from the evidence.');
  return o;
 }
 function aiRender(el,r,e){
  const cols=[['Accomplishments',r.summary.accomplishments],['Learnings',r.summary.learnings],['Plan forward · '+AI_REL,r.summary.planForward]].filter(c=>c[1]&&c[1].length);
  el.innerHTML=`<div class="aiu-grid" style="grid-template-columns:repeat(${cols.length},minmax(0,1fr))">${cols.map(([h,l])=>`<div class="aiu-c"><h4>${esc(h)}</h4><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div><div class="aiu-meta"><span>AI summary${r.at?' · '+esc(fmt(r.at)):''}. Built from engineer updates and work items; review before sharing.</span>${state.api&&aiAvailable()?'<button type="button" data-aiu-re>Refresh</button>':''}</div>`;
 }
 const aiBusy=new Set();
 async function aiLoad(e,el,force){
  const fp=fpOf(e),id=e.gusId||'',cache=state.aiu||(state.aiu={});
  if(!force&&cache[e.id]&&cache[e.id].fp===fp)return aiRender(el,cache[e.id],e);
  if(aiBusy.has(e.id))return;aiBusy.add(e.id);
  const msg=(t,retry)=>{el.innerHTML=`<div class="aiu-msg">${esc(t)}${retry?'<button type="button" data-aiu-re>Try again</button>':''}</div>`;};
  try{
   if(!force&&state.api&&id){msg('Checking for a saved summary…');try{const r=await state.api('epic-summary-get',{epicId:id,fingerprint:fp});if(r&&r.summary){cache[e.id]={fp,summary:r.summary,at:r.generatedAt};return aiRender(el,cache[e.id],e);}}catch(_){/* generate instead */}}
   if(!state.api||!aiAvailable())return msg(state.api?'AI is unavailable right now, so no summary could be generated.':'No AI summary was saved for this epic. Open this review in ReleaseIQ to generate one.',!!state.api);
   msg('Summarising the updates and work items…');
   const ev=aiEvidence(e),out=await window.AppletAI.complete('release-summary',{message:'Summarise this epic for the executive review.\n\n'+ev,systemPromptOverride:AI_SYSTEM}),summary=aiParse(out,ev),at=new Date().toISOString();
   cache[e.id]={fp,summary,at};
   if(id){try{await state.api('epic-summary-save',{epicId:id,fingerprint:fp,summary});}catch(_){/* kept for this session */}}
   aiRender(el,cache[e.id],e);
  }catch(x){msg((x&&x.message||'The summary could not be generated.').slice(0,160),true);}
  finally{aiBusy.delete(e.id);}
 }
 /** Tab clicks on the epic slides. The AI panel keeps the height of the GUS updates so nothing below it moves. */
 function wireTabs(st){
  st.addEventListener('click',ev=>{
   const t=ev.target.closest('[data-utab]'),re=ev.target.closest('[data-aiu-re]'),w=ev.target.closest('[data-uwrap]');if(!w)return;
   const e=state.epics.find(x=>String(x.id)===w.dataset.uwrap);if(!e)return;
   const ai=w.querySelector('[data-upanel=ai]'),gus=w.querySelector('[data-upanel=gus]');
   if(re)return aiLoad(e,ai,true);
   if(!t)return;const which=t.dataset.utab;
   if(which==='ai'&&ai.hidden){const h=gus.offsetHeight;ai.style.minHeight=Math.max(150,h)+'px';ai.style.maxHeight=Math.max(150,h)+'px';}
   w.querySelectorAll('[data-utab]').forEach(b=>{const on=b.dataset.utab===which;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
   gus.hidden=which!=='gus';ai.hidden=which!=='ai';
   if(which==='ai'&&!ai.dataset.ready){ai.dataset.ready='1';aiLoad(e,ai,false);}
  });
 }
 /** Re-reads the latest data through the host (state.refresh) and redraws in place: same slide, same view, and your notes and asks are kept. */
 async function refresh(btn){
  const note=document.getElementById('dk-rf');if(!state.refresh||btn.disabled)return;
  btn.disabled=true;btn.textContent='Refreshing…';if(note)note.textContent='';
  try{const nd=await state.refresh();
   if(nd&&nd.epics){const keep={mode:state.mode,edit:state.edit,notes:state.notes,asks:state.asks,api:state.api,refresh:state.refresh,onChange:state.onChange,standalone:state.standalone,prevOverflow:state.prevOverflow};
    const n=nd.epics.length,was=state.epics.length;
    Object.assign(state,nd,keep,{asOf:new Date().toISOString().slice(0,10)});
    paint();
    if(note)note.textContent='Updated '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+(n!==was?` · ${n} epics`:'');}
   else if(note)note.textContent='Nothing to update';}
  catch(x){if(note)note.textContent='Refresh failed: '+((x&&x.message)||'try again').slice(0,80);}
  finally{btn.disabled=false;btn.textContent='Refresh';}
 }
 const FK=['health','owner','theme'],fval=(e,k)=>k==='health'?(e.health||'No status'):k==='owner'?(e.owner||'Unassigned'):(e.theme||'No theme');
 function filterActive(){const f=state&&state.flt;return !!f&&FK.some(k=>f[k]);}
 function view(){const f=state.flt||{};if(!filterActive())return state;const ep=state.epics.filter(e=>FK.every(k=>!f[k]||fval(e,k)===f[k]));if(!ep.length){state.flt={health:'',owner:'',theme:''};return state;}return Object.assign({},state,{epics:ep});}
 function setFilter(k,v){const f=state.flt=Object.assign({health:'',owner:'',theme:''},state.flt,{[k]:v});
  if(filterActive()&&!state.epics.some(e=>FK.every(x=>!f[x]||fval(e,x)===f[x]))){f[k]='';}
  cur=0;paint();}
 function clearFilters(){state.flt={health:'',owner:'',theme:''};cur=0;paint();}
 function toggleFilter(force){const p=document.getElementById('dk-flt'),b=document.getElementById('dk-fbtn');if(!p)return;const on=force!=null?force:p.hidden;p.hidden=!on;b.classList.toggle('on',on);b.setAttribute('aria-expanded',String(on));}
 /** Option lists narrow to what the other filters still allow, so a combination can never match nothing. */
 function syncFilterUi(){const p=document.getElementById('dk-flt');if(!p)return;const f=state.flt||{},open=!p.hidden,names={health:'Status',owner:'Owner',theme:'Theme'};
  p.innerHTML=FK.map(k=>{const pool=state.epics.filter(e=>FK.every(x=>x===k||!f[x]||fval(e,x)===f[x]));const vals=[...new Set(pool.map(e=>fval(e,k)))].sort();if(f[k]&&!vals.includes(f[k]))vals.push(f[k]);
   return `<label>${names[k]}<select data-f="${k}"><option value="">All</option>${vals.map(v=>`<option value="${esc(v)}"${f[k]===v?' selected':''}>${esc(v)}</option>`).join('')}</select></label>`;}).join('')+`<small>${filterActive()?`Showing ${view().epics.length} of ${state.epics.length} epics. `:''}Esc clears filters.</small>`;
  p.hidden=!open;const n=FK.filter(k=>f[k]).length,c=document.getElementById('dk-fcnt'),x=document.getElementById('dk-fclr');c.hidden=!n;c.textContent=n;x.hidden=!n;}
 function paint(){const st=document.querySelector('#dk .dk-stage'),b=build(view());st.innerHTML=b.html;slides=[...st.querySelectorAll('.slide')];
  slides.forEach(fitText);
  slides.forEach((s,i)=>{const pg=s.querySelector('.pg');if(pg)pg.textContent=`${i+1} / ${slides.length}`;});
  st.querySelectorAll('[data-goto]').forEach(r=>r.addEventListener('click',()=>go(Number(r.dataset.goto))));
  document.querySelectorAll('#dk [data-mode]').forEach(x=>x.classList.toggle('on',x.dataset.mode===(state.mode==='review'?'review':'planning')));
  syncFilterUi();slides.forEach(s=>s.style.transition='none');fit();go(cur);requestAnimationFrame(()=>requestAnimationFrame(()=>slides.forEach(s=>s.style.transition='')));}
 function close(){const d=document.getElementById('dk');if(d)d.remove();const s=document.getElementById('dk-css');if(s)s.remove();
  removeEventListener('keydown',onKey,true);removeEventListener('resize',onResize);if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});document.body.style.overflow=state&&state.prevOverflow||'';}
 /** Tells the host (planner or review page) that notes or asks changed so it can save them. */
 function changed(){if(typeof state.onChange==='function')state.onChange({notes:state.notes||{},asks:(state.asks||[]).filter(a=>String(a.q).trim())});}
 function open(data,opts){
  close();state=Object.assign({mode:'planning',gusUrl:'https://gus.lightning.force.com/lightning/r/',asOf:new Date().toISOString().slice(0,10)},data,opts||{});state.prevOverflow=document.body.style.overflow;
  const st=document.createElement('style');st.id='dk-css';st.textContent=CSS;document.head.appendChild(st);
  const d=document.createElement('div');d.id='dk';d.setAttribute('data-nocf','');d.setAttribute('role','dialog');d.setAttribute('aria-label','Epic review presentation');
  d.innerHTML=(state.standalone?'':'')+'<div class="dk-prog" id="dk-prog"></div><div class="dk-stage"></div><div class="dk-flt" id="dk-flt" hidden></div><div class="dk-bar"><button type="button" data-a="prev" title="Previous (←)" aria-label="Previous slide">◀</button><span id="dk-count"></span><button type="button" data-a="next" title="Next (→)" aria-label="Next slide">▶</button><button type="button" data-a="home" title="Go to the first slide (Home)">⌂ Home</button><button type="button" data-a="index" title="Go to the epic list">☰ Epics</button><button type="button" data-a="filter" id="dk-fbtn" title="Show only some epics: by status, owner or theme" aria-expanded="false">⏷ Filter<span class="cnt" id="dk-fcnt" hidden></span></button><button type="button" data-a="clearf" id="dk-fclr" title="Clear all filters (Esc)" hidden>✕ Clear filters</button><button type="button" data-mode="planning" title="Planning view">Planning</button><button type="button" data-mode="review" title="Monthly review view: progress and risks">Monthly review</button>'+(state.standalone?'':'<button type="button" data-a="edit" title="Add presenter notes and asks">Edit notes</button>')+'<button type="button" data-a="print" title="Print or save as PDF">Print</button>'+(state.standalone?'':'<button type="button" data-a="save" title="Download this deck as an HTML file">Download</button>')+(!state.standalone&&state.refresh?'<button type="button" data-a="refresh" title="Re-read the latest data from GUS">Refresh</button><span id="dk-rf" class="dk-rf" role="status"></span>':'')+(!state.standalone&&state.api?'<button type="button" data-a="share" title="Post a summary to Slack (you pick the channel)">Share to Slack</button>':'')+'<button type="button" data-a="full" title="Fullscreen (F)" aria-label="Fullscreen">⛶</button>'+(state.standalone?'':'<button type="button" data-a="close" title="Close (Esc)" aria-label="Close presentation">✕</button>')+'</div>';
  document.body.appendChild(d);document.body.style.overflow='hidden';cur=0;wireTabs(d.querySelector('.dk-stage'));
  d.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const a=b.dataset.a;
   if(a==='home')go(0);else if(a==='index')go(2);else if(a==='filter')toggleFilter();else if(a==='clearf')clearFilters();else if(a==='prev')go(cur-1);else if(a==='next')go(cur+1);else if(a==='close')close();else if(a==='edit'){state.edit=!state.edit;b.classList.toggle('on',state.edit);paint();}else if(a==='print')print();else if(a==='share')share();else if(a==='refresh')refresh(b);else if(b.dataset.askAdd){state.asks.push({type:'Ask',q:'',d:'',who:''});changed();paint();}else if(b.dataset.askDel!=null){state.asks.splice(Number(b.dataset.askDel),1);changed();paint();}else if(a==='save'){b.disabled=true;download(state).catch(err=>alert(err.message)).finally(()=>b.disabled=false);}
   else if(a==='full')document.fullscreenElement?document.exitFullscreen():d.requestFullscreen&&d.requestFullscreen();
   else if(b.dataset.mode){state.mode=b.dataset.mode;paint();}});
  d.addEventListener('input',e=>{const t=e.target;if(t.dataset.note!=null){(state.notes||(state.notes={}))[t.dataset.note]=t.value;changed();}else if(t.dataset.ask!=null){state.asks[Number(t.dataset.ask)][t.dataset.k]=t.value;changed();}});
  d.addEventListener('change',e=>{const t=e.target;if(t.dataset.f){setFilter(t.dataset.f,t.value);return;}if(t.dataset.ask!=null&&t.dataset.k==='type'){paint();}});
  onKey=e=>{if(e.key==='Escape'&&filterActive()){e.preventDefault();e.stopImmediatePropagation();clearFilters();return;}if(e.target&&(/INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName)||(e.target.closest&&e.target.closest('.dk-share')))){if(e.key==='Escape'&&e.target.closest&&e.target.closest('#dk')){e.stopImmediatePropagation();if(e.target.closest('.dk-share')){const sh=e.target.closest('.dk-share');sh.remove();}else if(e.target.blur)e.target.blur();}return;}const k=e.key;
   if(['ArrowRight','PageDown',' ','Enter'].includes(k)){e.preventDefault();e.stopImmediatePropagation();go(cur+1);}
   else if(['ArrowLeft','PageUp','Backspace'].includes(k)){e.preventDefault();e.stopImmediatePropagation();go(cur-1);}
   else if(k==='Home')go(0);else if(k==='End')go(slides.length-1);
   else if(k==='Escape'){if(!document.fullscreenElement&&!state.standalone){e.preventDefault();e.stopImmediatePropagation();close();}}
   else if(k.toLowerCase()==='f')d.requestFullscreen&&(document.fullscreenElement?document.exitFullscreen():d.requestFullscreen());};
  onResize=fit;addEventListener('keydown',onKey,true);addEventListener('resize',onResize);paint();
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
  if(data&&data.flt){data=Object.assign({},data);delete data.flt;}
  let src='';try{src=SRC?await (await fetch(SRC)).text():'';}catch(_){}
  if(!src)throw new Error('The presentation template could not be loaded.');
  const d=Object.assign({mode:'planning'},data,opts||{},{aiu:(state&&state.aiu)||(data&&data.aiu)||{}},{edit:false,onChange:undefined,prevOverflow:undefined}),json=JSON.stringify(d).replace(/</g,'\\u003c');
  const html='<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(d.team+' — '+d.release+' epic review')+'</title></head><body style="margin:0;background:#1b1f24"><script>'+src.replace(/<\/script/gi,'<\\/script')+'<\/script><script>EpicDeck.open('+json+',{standalone:true});<\/script></body></html>';
  const name=(d.team+'-'+d.release+'-'+(d.mode==='review'?'monthly-review':'epic-review')).replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()+'.html';
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);return name;
 }
 root.EpicDeck={open,close,download,build,flagsFor,summaryText,parseUpdates};
})(typeof window!=='undefined'?window:globalThis);
