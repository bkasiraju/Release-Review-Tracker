/* Sprint Action Log: per-work-item action capture (small modal), full-screen log, and a daily Slack thread summary. */
(function(){
'use strict';
const H=window.Hub,{esc,call}=H,$=id=>document.getElementById(id);
const PRI=['Critical','High','Medium','Low'],DOT={Critical:'🔴',High:'🟠',Medium:'🟡',Low:'🟢'};
const A={items:[],teamId:'',loaded:false,tab:'open',owner:'',summary:false,modal:null,full:null};
const ctx=()=>(window.SprintInsights&&window.SprintInsights.ctx)?window.SprintInsights.ctx():{teamId:'',members:[],mem:[],sprintName:'',sprintId:''};
const openFor=id=>A.items.filter(x=>x.workId===id&&x.status==='open').length;
const findItem=id=>{for(const m of ctx().members)for(const i of m.items)if(i.id===id)return {item:i,assignee:m.name};return null;};
const fmtD=d=>{const [y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});};
const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const overdue=x=>x.status==='open'&&x.eta<todayIso();
const order=(a,b)=>PRI.indexOf(a.priority)-PRI.indexOf(b.priority)||a.eta.localeCompare(b.eta);
const icon=()=>window.ReviewIcons?window.ReviewIcons.icon('notepad','amber'):'📝';

const iconOpen=()=>window.ReviewIcons?window.ReviewIcons.icon('notepad','rose'):'📝';
const btnLabel=i=>openFor(i.id)?`${openFor(i.id)} open action item(s) — hover to review`:'Add to Sprint Action Log';
A.btn=i=>{const n=openFor(i.id);return `<button type="button" class="sal-btn${n?' has':''}" data-sal-add="${esc(i.id)}" data-n="${n}"${n?'':' title="Add to Sprint Action Log"'} aria-label="${n?esc(n+' open action item(s) for '+i.name+' — click to add another'):'Add action item for '+esc(i.name)}">${n?iconOpen():icon()}${n>1?`<b class="sal-n">${n}</b>`:''}</button>`;};
function paint(){
  document.querySelectorAll('[data-sal-add]').forEach(b=>{const n=openFor(b.dataset.salAdd);
    if((b.dataset.n|0)!==n){b.classList.toggle('has',n>0);b.dataset.n=n;b.innerHTML=(n?iconOpen():icon())+(n>1?`<b class="sal-n">${n}</b>`:'');if(n)b.removeAttribute('title');else b.title='Add to Sprint Action Log';}});
  if(tip.el)drawTip();
  const n=A.items.filter(x=>x.status==='open').length,c=$('sal-count');if(c){c.textContent=n;c.hidden=!n;}
  if(A.full)drawFull();
}
// ── Hover card: open action items for a work item, with Resolve and ETA update ──
const tip={el:null,btn:null,t:0};
const openItems=id=>A.items.filter(x=>x.workId===id&&x.status==='open').sort(order);
function hideTip(now){clearTimeout(tip.t);const go=()=>{if(tip.el){tip.el.remove();tip.el=null;tip.btn=null;}};if(now)go();else tip.t=setTimeout(go,260);}
function drawTip(){
  if(!tip.el||!tip.btn||!tip.btn.isConnected)return hideTip(true);
  const list=openItems(tip.btn.dataset.salAdd);if(!list.length)return hideTip(true);
  tip.el.innerHTML=`<div class="sal-tip-h">${icon()} ${list.length} open action item${list.length>1?'s':''}<small>${esc(list[0].workName)}</small></div>`+list.map(x=>`<div class="sal-tip-i" data-id="${esc(x.id)}"><p class="sal-tip-d">${esc(x.details)}</p>
  <div class="sal-tip-m"><span class="sal-pri p-${x.priority.toLowerCase()}">${DOT[x.priority]} ${x.priority}</span><span class="sal-st${overdue(x)?' late':''}">${overdue(x)?'Open · overdue':'Open'}</span><span class="sal-tip-o">${esc(x.owner)}</span></div>
  ${x.pending?'<div class="sal-tip-a"><span class="sal-st">Saving…</span><span>ETA '+esc(fmtD(x.eta))+'</span>':`<div class="sal-tip-a"><label>ETA <input type="date" class="hub-inline" data-tip-eta="${esc(x.id)}" value="${esc(x.eta)}" min="${todayIso()}" max="${addDays(30)}"></label><button type="button" class="button small primary" data-tip-res="${esc(x.id)}">Resolve</button>`}</div></div>`).join('')+'<div class="sal-tip-msg" role="status"></div>';
  place();
}
function place(){const b=tip.btn.getBoundingClientRect(),e=tip.el,w=e.offsetWidth,h=e.offsetHeight;let l=Math.min(Math.max(8,b.left+b.width/2-w/2),innerWidth-w-8),t=b.bottom+6;if(t+h>innerHeight-8)t=Math.max(8,b.top-h-6);e.style.left=l+'px';e.style.top=t+'px';}
function showTip(btn){
  clearTimeout(tip.t);if(tip.btn===btn&&tip.el)return;if(!openItems(btn.dataset.salAdd).length)return;hideTip(true);
  const el=document.createElement('div');el.className='sal-tip';el.setAttribute('role','dialog');el.setAttribute('aria-label','Open action items');document.body.appendChild(el);tip.el=el;tip.btn=btn;
  el.addEventListener('mouseenter',()=>clearTimeout(tip.t));el.addEventListener('mouseleave',()=>hideTip());
  el.addEventListener('click',async e=>{const b=e.target.closest('[data-tip-res]');if(!b)return;b.disabled=true;
    try{const r=await call('sal-resolve',{teamId:ctx().teamId,id:b.dataset.tipRes,resolved:true});A.items=r.items;paint();window.toast?.('Action item resolved.');}catch(err){b.disabled=false;msg('Not resolved: '+err.message,true);}});
  el.addEventListener('change',async e=>{const i=e.target.closest('[data-tip-eta]');if(!i)return;const id=i.dataset.tipEta,v=i.value;if(!v)return;i.disabled=true;
    try{const r=await call('sal-eta',{teamId:ctx().teamId,id,eta:v});A.items=r.items;paint();msg('ETA updated to '+fmtD(v)+'.');}catch(err){i.disabled=false;msg('ETA not updated: '+err.message,true);}});
  drawTip();
}
function msg(t,err){if(!tip.el)return;const m=tip.el.querySelector('.sal-tip-msg');if(m){m.textContent=t;m.className='sal-tip-msg'+(err?' err':'');}}
document.addEventListener('mouseover',e=>{const b=e.target.closest&&e.target.closest('.sal-btn.has');if(b)showTip(b);});
document.addEventListener('mouseout',e=>{const b=e.target.closest&&e.target.closest('.sal-btn.has');if(b&&!(e.relatedTarget&&tip.el&&tip.el.contains(e.relatedTarget)))hideTip();});
document.addEventListener('focusin',e=>{const b=e.target.closest&&e.target.closest('.sal-btn.has');if(b&&!tip.mute&&b.matches(':focus-visible'))showTip(b);});
document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('.sal-btn')&&!(e.relatedTarget&&tip.el&&tip.el.contains(e.relatedTarget)))hideTip();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip(true);});
addEventListener('scroll',()=>hideTip(true),true);
A.load=async()=>{const c=ctx();if(!c.teamId)return;try{const r=await call('sal-list',{teamId:c.teamId});if(ctx().teamId===c.teamId){A.items=r.items||[];A.teamId=c.teamId;A.loaded=true;paint();}}catch(e){A.loaded=false;}};

// ── Small modal: add an action item ──
function closeModal(){if(A.modal){A.modal.el.remove();document.removeEventListener('keydown',A.modal.key);if(A.modal.opener&&A.modal.opener.focus){tip.mute=true;A.modal.opener.focus({preventScroll:true});setTimeout(()=>{tip.mute=false;},0);}A.modal=null;}}
function openAdd(btn,ed){
  const f=ed?{item:{id:ed.workId,name:ed.workName,subject:ed.subject,assigneeId:ed.assigneeId},assignee:ed.assignee}:findItem(btn.dataset.salAdd);if(!f)return;closeModal();
  const c=ctx(),mem=c.mem||[],i=f.item,owner=mem.find(m=>m.id===(ed?ed.ownerId:i.assigneeId));
  const el=document.createElement('div');el.className='nd-overlay sal-ov';
  el.innerHTML=`<div class="nd-modal sal-modal" role="dialog" aria-modal="true" aria-labelledby="sal-t"><div class="nd-head"><h2 id="sal-t">${ed?'Edit':'Add'} action item · ${esc(i.name)}</h2><button type="button" class="nd-x" data-x aria-label="Close">×</button></div>
  <p class="sal-sub" title="${esc(i.subject)}">${esc(i.subject)}</p>
  <div class="sal-grid"><div><label class="nd-lab">W-ID</label><div class="sal-ro">${esc(i.name)}</div></div><div><label class="nd-lab">Assignee</label><div class="sal-ro">${esc(f.assignee)}</div></div>
  <div><label class="nd-lab" for="sal-own">Action owner</label><select id="sal-own" class="hub-inline">${mem.map(m=>`<option value="${esc(m.id)}"${owner&&m.id===owner.id?' selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
  <div><label class="nd-lab" for="sal-pri">Priority</label><select id="sal-pri" class="hub-inline">${PRI.map(p=>`<option${p===(ed?ed.priority:'Medium')?' selected':''}>${p}</option>`).join('')}</select></div>
  <div><label class="nd-lab" for="sal-eta">ETA</label><input id="sal-eta" class="hub-inline" type="date" value="${ed?esc(ed.eta):addDays(1)}" min="${ed&&ed.eta<todayIso()?esc(ed.eta):todayIso()}" max="${addDays(30)}"></div></div>
  <label class="nd-lab" for="sal-det">Action item details</label><textarea id="sal-det" rows="4" maxlength="1000" placeholder="What needs to happen?">${ed?esc(ed.details):''}</textarea>
  <div id="sal-msg" class="nd-msg" role="status"></div><div class="nd-actions"><button type="button" class="button primary" data-save>${ed?'Save changes':'Add to log'}</button><button type="button" class="button" data-x>Cancel</button></div></div>`;
  document.body.appendChild(el);A.modal={el,opener:btn,key:e=>{if(e.key==='Escape'&&!document.querySelector('.nd-overlay:not(.sal-ov)'))closeModal();}};document.addEventListener('keydown',A.modal.key);
  if(!mem.length)el.querySelector('#sal-msg').textContent='Team members are still loading — close and try again in a moment.';
  el.querySelector('#sal-det').focus();
  el.addEventListener('click',async e=>{
    if(e.target===el||e.target.closest('[data-x]'))return closeModal();
    if(!e.target.closest('[data-save]'))return;
    const msg=el.querySelector('#sal-msg'),det=el.querySelector('#sal-det').value.trim(),btn2=e.target.closest('[data-save]');
    if(!det){msg.className='nd-msg err';msg.textContent='Describe the action item.';return;}
    if(ed){const upd={teamId:c.teamId,id:ed.id,ownerId:el.querySelector('#sal-own').value,details:det,eta:el.querySelector('#sal-eta').value,priority:el.querySelector('#sal-pri').value},o2=mem.find(m=>m.id===upd.ownerId),prev=A.items;
      A.items=A.items.map(x=>x.id===ed.id?{...x,details:det,eta:upd.eta,priority:upd.priority,ownerId:upd.ownerId,owner:o2?o2.name:x.owner}:x);paint();closeModal();window.toast?.('Saving changes…');
      call('sal-edit',upd).then(r=>{A.items=r.items;paint();window.toast?.('Action item updated.');}).catch(err=>{A.items=prev;paint();window.toast?.('Changes not saved: '+err.message,true);});return;}
    const own=mem.find(m=>m.id===el.querySelector('#sal-own').value),payload={teamId:c.teamId,workId:i.id,workName:i.name,subject:i.subject,assignee:f.assignee,assigneeId:i.assigneeId,ownerId:el.querySelector('#sal-own').value,details:det,eta:el.querySelector('#sal-eta').value,priority:el.querySelector('#sal-pri').value,sprintId:c.sprintId,sprintName:c.sprintName};
    // Save in the background: show the item at once, close the popup, and roll back with a message if the save fails.
    const temp={id:'tmp-'+Date.now(),workId:i.id,workName:i.name,subject:i.subject,assignee:f.assignee,assigneeId:i.assigneeId,ownerId:payload.ownerId,owner:own?own.name:'',details:det,eta:payload.eta,priority:payload.priority,status:'open',createdAt:new Date().toISOString(),resolvedAt:null,pending:true};
    A.items=[...A.items,temp];paint();closeModal();window.toast?.('Saving action item…');
    call('sal-save',payload).then(r=>{A.items=r.items;paint();window.toast?.('Action item added to the Sprint Action Log.');})
      .catch(err=>{A.items=A.items.filter(x=>x.id!==temp.id);paint();window.toast?.('Action item not saved: '+err.message,true);});
  });
}

// ── Daily summary (Slack thread) ──
function summary(){
  const c=ctx(),open=A.items.filter(x=>x.status==='open'),team=(H.team&&H.team.Name)||'Team',sp=String(c.sprintName||'Sprint').split(' - ')[0],date=fmtD(todayIso());
  const head=`🧵 ${team} - ${sp} - Action Items Summary - ${date}`;
  if(!open.length)return {head,body:'No open action items.',n:0};
  const by=new Map();open.forEach(x=>{if(!by.has(x.owner))by.set(x.owner,[]);by.get(x.owner).push(x);});
  const cnt=PRI.map(p=>[p,open.filter(x=>x.priority===p).length]).filter(a=>a[1]).map(a=>`${DOT[a[0]]} ${a[1]} ${a[0]}`).join(' · ');
  const lines=[`*${open.length} open action item${open.length>1?'s':''}* — ${cnt}${open.some(overdue)?` · ⚠ ${open.filter(overdue).length} overdue`:''}`];
  [...by.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([o,l])=>{lines.push('',`*${o}* (${l.length})`);l.sort(order).forEach(x=>lines.push(`• <${H.GUS}ADM_Work__c/${x.workId}/view|${x.workName}> — ${x.details.replace(/\s+/g,' ')} — ETA ${fmtD(x.eta)}${overdue(x)?' ⚠ overdue':''} — ${DOT[x.priority]} ${x.priority}`));});
  return {head,body:lines.join('\n'),n:open.length};
}
async function copy(t,label){try{await navigator.clipboard.writeText(t);window.toast?.(label+' copied. Paste it into Slack.');}catch(_){window.toast?.('Could not copy — select the text and copy it manually.',true);}}

// ── Full-screen log ──
function closeFull(){if(A.full){A.full.remove();A.full=null;document.removeEventListener('keydown',A.fullKey);A.opener&&A.opener.focus&&A.opener.focus();}}
const ic={
  edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4ZM13.500 6.500l4 4"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>',
  ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.500"/></svg>',
  undo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 8"/></svg>',
  slack:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></svg>'};
/** One clean line for the nudge: "Action item: <details, cut at a word> (ETA 17 Nov 2026, Medium)". */
function nudgeSubject(x){let d=x.details.replace(/\s+/g,' ').trim();if(d.length>140){d=d.slice(0,140).replace(/\s+\S*$/,'')+'…';}return `Action item: ${d} (ETA ${fmtD(x.eta)}, ${x.priority})`;}
function drawFull(){
  const el=A.full;if(!el)return;const c=ctx(),mem=c.mem||[];
  const all=A.items,openN=all.filter(x=>x.status==='open').length,resN=all.length-openN;
  let rows=all.filter(x=>A.tab==='all'||x.status===(A.tab==='open'?'open':'resolved'));if(A.owner)rows=rows.filter(x=>x.ownerId===A.owner);
  rows=[...rows].sort((a,b)=>(a.status==='open'?0:1)-(b.status==='open'?0:1)||order(a,b));
  const sm=A.summary?summary():null;
  el.querySelector('.sal-body').innerHTML=`<div class="sal-tools"><div class="sp-typechips" role="group" aria-label="Filter by status">${[['open','Open',openN],['resolved','Resolved',resN],['all','All',all.length]].map(([k,l,n])=>`<button type="button" class="sp-tchip${A.tab===k?' on':''}" data-tab="${k}" aria-pressed="${A.tab===k}">${l} <b>${n}</b></button>`).join('')}</div>
  <label class="sal-own-l">Owner <select id="sal-fown" class="hub-inline"><option value="">All team members</option>${mem.map(m=>`<option value="${esc(m.id)}"${A.owner===m.id?' selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
  <span class="sal-grow"></span><button type="button" class="button primary" data-sum aria-pressed="${A.summary}">${A.summary?'Hide':'Daily'} Slack summary</button></div>
  ${sm?`<section class="sal-sum"><h3>Slack thread · ${sm.n} open item${sm.n===1?'':'s'}</h3><p class="note">Action items are kept for 30 days, then deleted. Slack channel posting isn't available from this app, so copy the header as the thread starter, then paste the replies inside the thread.</p>
   <label class="nd-lab">Thread header</label><pre class="sal-pre" id="sal-h">${esc(sm.head)}</pre><label class="nd-lab">Thread reply</label><pre class="sal-pre" id="sal-b">${esc(sm.body)}</pre>
   <div class="nd-actions"><button type="button" class="button primary" data-cp="h">Copy header</button><button type="button" class="button primary" data-cp="b">Copy reply</button><button type="button" class="button" data-cp="a">Copy both</button></div></section>`:''}
  ${rows.length?`<div class="table-scroll"><table class="sal-table"><colgroup><col class="c-wid"><col class="c-sub"><col class="c-asg"><col class="c-own"><col class="c-det"><col class="c-eta"><col class="c-pri"><col class="c-act"></colgroup><thead><tr><th>W-ID</th><th>Subject</th><th>Assignee</th><th>Action owner</th><th>Action item</th><th>ETA</th><th>Priority</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr class="${x.status==='resolved'?'sal-done':''}"><td><a href="${H.GUS}ADM_Work__c/${esc(x.workId)}/view" target="_blank" rel="noopener noreferrer">${esc(x.workName)}</a></td><td class="sal-subj" title="${esc(x.subject)}">${esc(x.subject)}</td><td>${esc(x.assignee)}</td><td><span class="sal-who">${H.avatarHtml?H.avatarHtml(x.ownerId,x.owner,22):''}${esc(x.owner)}</span></td><td class="sal-det">${esc(x.details)}</td><td class="${overdue(x)?'sal-late':''}">${esc(fmtD(x.eta))}${overdue(x)?' <small>overdue</small>':''}</td><td><span class="sal-pri p-${x.priority.toLowerCase()}">${DOT[x.priority]} ${x.priority}</span></td><td class="sal-acts"><div class="sal-actbox"><button type="button" class="sal-ic ok" data-res="${esc(x.id)}" data-on="${x.status==='open'}" title="${x.status==='open'?'Mark resolved':'Reopen'}" aria-label="${x.status==='open'?'Mark resolved':'Reopen'} ${esc(x.workName)}">${x.status==='open'?ic.ok:ic.undo}</button>${x.status==='open'?`<button type="button" class="sal-ic" data-nudge="${esc(x.workId)}" data-name="${esc(x.workName)}" data-subject="${esc(nudgeSubject(x))}" data-who="${esc(x.owner)}" title="Slack follow-up with ${esc(x.owner)}" aria-label="Slack follow-up on ${esc(x.workName)}">${ic.slack}</button>`:''}<button type="button" class="sal-ic" data-edit="${esc(x.id)}" title="Edit action item" aria-label="Edit action item on ${esc(x.workName)}">${ic.edit}</button><button type="button" class="sal-ic del" data-del="${esc(x.id)}" title="Delete action item" aria-label="Delete action item on ${esc(x.workName)}">${ic.trash}</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state sp-empty"><h3>${all.length?'No matching action items':'No action items yet'}</h3><p>${all.length?'Change the filter to see more.':'Use the notepad icon next to a W-ID to add one.'}</p></div>`}`;
}
function openFull(btn){
  if(A.full)return;A.opener=btn;
  const el=document.createElement('div');el.className='sal-full';
  el.innerHTML=`<div class="sal-card" role="dialog" aria-modal="true" aria-label="Sprint Action Log"><div class="sal-head"><h2>${icon()} Sprint Action Log <small>${esc((H.team&&H.team.Name)||'')}</small></h2><button type="button" class="button small" data-x>Close ✕</button></div><div class="sal-body"></div></div>`;
  document.body.appendChild(el);A.full=el;A.tab='open';A.owner='';A.summary=false;
  A.fullKey=e=>{if(e.key==='Escape'&&!document.querySelector('.nd-overlay'))closeFull();};document.addEventListener('keydown',A.fullKey);
  el.addEventListener('click',async e=>{
    const t=e.target.closest('button');if(e.target===el||(t&&t.matches('[data-x]')))return closeFull();if(!t)return;
    if(t.dataset.tab){A.tab=t.dataset.tab;drawFull();}
    else if('sum' in t.dataset){A.summary=!A.summary;drawFull();}
    else if(t.dataset.cp){const s=summary(),h=s.head,b=s.body;copy(t.dataset.cp==='h'?h:t.dataset.cp==='b'?b:h+'\n\n'+b,t.dataset.cp==='h'?'Header':t.dataset.cp==='b'?'Reply':'Thread');}
    else if(t.dataset.edit){const x=A.items.find(i=>i.id===t.dataset.edit);if(x&&!x.pending)openAdd(t,x);}
    else if(t.dataset.del){
      if(!t.classList.contains('arm')){t.classList.add('arm');t.title='Click again to delete';t.setAttribute('aria-label','Confirm delete');setTimeout(()=>{if(t.isConnected){t.classList.remove('arm');t.title='Delete action item';}},4000);return;}
      t.disabled=true;try{const r=await call('sal-delete',{teamId:ctx().teamId,id:t.dataset.del});A.items=r.items;paint();window.toast?.('Action item deleted');}catch(err){t.disabled=false;t.classList.remove('arm');window.toast?.('Not deleted: '+err.message,true);}}
    else if(t.dataset.res){t.disabled=true;try{const r=await call('sal-resolve',{teamId:ctx().teamId,id:t.dataset.res,resolved:t.dataset.on==='true'});A.items=r.items;paint();}catch(err){t.disabled=false;window.toast?.('Not updated: '+err.message,true);}}
  });
  el.addEventListener('change',e=>{if(e.target.id==='sal-fown'){A.owner=e.target.value;drawFull();}});
  drawFull();(A.loaded?Promise.resolve():A.load()).then(()=>{});A.load();el.querySelector('[data-x]').focus();
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-sal-add]');if(a){e.preventDefault();e.stopPropagation();openAdd(a);return;}const o=e.target.closest('#sal-open');if(o)openFull(o);});
window.SAL=A;
})();
