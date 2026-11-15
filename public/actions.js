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

A.btn=i=>`<button type="button" class="sal-btn${openFor(i.id)?' has':''}" data-sal-add="${esc(i.id)}" title="${openFor(i.id)?openFor(i.id)+' open action item(s) · ':''}Add to Sprint Action Log" aria-label="Add action item for ${esc(i.name)}">${icon()}</button>`;
function paint(){
  document.querySelectorAll('[data-sal-add]').forEach(b=>b.classList.toggle('has',openFor(b.dataset.salAdd)>0));
  const n=A.items.filter(x=>x.status==='open').length,c=$('sal-count');if(c){c.textContent=n;c.hidden=!n;}
  if(A.full)drawFull();
}
A.load=async()=>{const c=ctx();if(!c.teamId)return;try{const r=await call('sal-list',{teamId:c.teamId});if(ctx().teamId===c.teamId){A.items=r.items||[];A.teamId=c.teamId;A.loaded=true;paint();}}catch(e){A.loaded=false;}};

// ── Small modal: add an action item ──
function closeModal(){if(A.modal){A.modal.el.remove();document.removeEventListener('keydown',A.modal.key);A.modal.opener&&A.modal.opener.focus&&A.modal.opener.focus();A.modal=null;}}
function openAdd(btn){
  const f=findItem(btn.dataset.salAdd);if(!f)return;closeModal();
  const c=ctx(),mem=c.mem||[],i=f.item,owner=mem.find(m=>m.id===i.assigneeId);
  const el=document.createElement('div');el.className='nd-overlay sal-ov';
  el.innerHTML=`<div class="nd-modal sal-modal" role="dialog" aria-modal="true" aria-labelledby="sal-t"><div class="nd-head"><h2 id="sal-t">Add action item · ${esc(i.name)}</h2><button type="button" class="nd-x" data-x aria-label="Close">×</button></div>
  <p class="sal-sub" title="${esc(i.subject)}">${esc(i.subject)}</p>
  <div class="sal-grid"><div><label class="nd-lab">W-ID</label><div class="sal-ro">${esc(i.name)}</div></div><div><label class="nd-lab">Assignee</label><div class="sal-ro">${esc(f.assignee)}</div></div>
  <div><label class="nd-lab" for="sal-own">Action owner</label><select id="sal-own" class="hub-inline">${mem.map(m=>`<option value="${esc(m.id)}"${owner&&m.id===owner.id?' selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
  <div><label class="nd-lab" for="sal-pri">Priority</label><select id="sal-pri" class="hub-inline">${PRI.map(p=>`<option${p==='Medium'?' selected':''}>${p}</option>`).join('')}</select></div>
  <div><label class="nd-lab" for="sal-eta">ETA</label><input id="sal-eta" class="hub-inline" type="date" value="${addDays(1)}" min="${todayIso()}" max="${addDays(30)}"></div></div>
  <label class="nd-lab" for="sal-det">Action item details</label><textarea id="sal-det" rows="4" maxlength="1000" placeholder="What needs to happen?"></textarea>
  <div id="sal-msg" class="nd-msg" role="status"></div><div class="nd-actions"><button type="button" class="button primary" data-save>Add to log</button><button type="button" class="button" data-x>Cancel</button></div></div>`;
  document.body.appendChild(el);A.modal={el,opener:btn,key:e=>{if(e.key==='Escape'&&!document.querySelector('.nd-overlay:not(.sal-ov)'))closeModal();}};document.addEventListener('keydown',A.modal.key);
  if(!mem.length)el.querySelector('#sal-msg').textContent='Team members are still loading — close and try again in a moment.';
  el.querySelector('#sal-det').focus();
  el.addEventListener('click',async e=>{
    if(e.target===el||e.target.closest('[data-x]'))return closeModal();
    if(!e.target.closest('[data-save]'))return;
    const msg=el.querySelector('#sal-msg'),det=el.querySelector('#sal-det').value.trim(),btn2=e.target.closest('[data-save]');
    if(!det){msg.className='nd-msg err';msg.textContent='Describe the action item.';return;}
    btn2.disabled=true;msg.className='nd-msg';msg.textContent='Saving…';
    try{const r=await call('sal-save',{teamId:c.teamId,workId:i.id,workName:i.name,subject:i.subject,assignee:f.assignee,assigneeId:i.assigneeId,ownerId:el.querySelector('#sal-own').value,details:det,eta:el.querySelector('#sal-eta').value,priority:el.querySelector('#sal-pri').value,sprintId:c.sprintId,sprintName:c.sprintName});
      A.items=r.items;paint();closeModal();window.toast?.('Action item added to the Sprint Action Log.');}
    catch(err){btn2.disabled=false;msg.className='nd-msg err';msg.textContent='Not saved: '+err.message;}
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
  ok:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.500"/></svg>',
  undo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 0 8"/></svg>',
  slack:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 10h8M8 13h5"/></svg>'};
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
  ${rows.length?`<div class="table-scroll"><table class="sal-table"><thead><tr><th>W-ID</th><th>Subject</th><th>Assignee</th><th>Action owner</th><th>Action item</th><th>ETA</th><th>Priority</th><th>Actions</th></tr></thead><tbody>${rows.map(x=>`<tr class="${x.status==='resolved'?'sal-done':''}"><td><a href="${H.GUS}ADM_Work__c/${esc(x.workId)}/view" target="_blank" rel="noopener noreferrer">${esc(x.workName)}</a></td><td class="sal-subj" title="${esc(x.subject)}">${esc(x.subject)}</td><td>${esc(x.assignee)}</td><td><span class="sal-who">${H.avatarHtml?H.avatarHtml(x.ownerId,x.owner,22):''}${esc(x.owner)}</span></td><td class="sal-det">${esc(x.details)}</td><td class="${overdue(x)?'sal-late':''}">${esc(fmtD(x.eta))}${overdue(x)?' <small>overdue</small>':''}</td><td><span class="sal-pri p-${x.priority.toLowerCase()}">${DOT[x.priority]} ${x.priority}</span></td><td class="sal-acts"><button type="button" class="sal-ic ok" data-res="${esc(x.id)}" data-on="${x.status==='open'}" title="${x.status==='open'?'Mark resolved':'Reopen'}" aria-label="${x.status==='open'?'Mark resolved':'Reopen'} ${esc(x.workName)}">${x.status==='open'?ic.ok:ic.undo}</button>${x.status==='open'?`<button type="button" class="sal-ic" data-nudge="${esc(x.workId)}" data-name="${esc(x.workName)}" data-subject="${esc('Action item: '+x.details.slice(0,150)+' (ETA '+fmtD(x.eta)+', '+x.priority+')')}" data-who="${esc(x.owner)}" title="Slack follow-up with ${esc(x.owner)}" aria-label="Slack follow-up on ${esc(x.workName)}">${ic.slack}</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state sp-empty"><h3>${all.length?'No matching action items':'No action items yet'}</h3><p>${all.length?'Change the filter to see more.':'Use the notepad icon next to a W-ID to add one.'}</p></div>`}`;
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
    else if(t.dataset.res){t.disabled=true;try{const r=await call('sal-resolve',{teamId:ctx().teamId,id:t.dataset.res,resolved:t.dataset.on==='true'});A.items=r.items;paint();}catch(err){t.disabled=false;window.toast?.('Not updated: '+err.message,true);}}
  });
  el.addEventListener('change',e=>{if(e.target.id==='sal-fown'){A.owner=e.target.value;drawFull();}});
  drawFull();(A.loaded?Promise.resolve():A.load()).then(()=>{});A.load();el.querySelector('[data-x]').focus();
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-sal-add]');if(a){e.preventDefault();e.stopPropagation();openAdd(a);return;}const o=e.target.closest('#sal-open');if(o)openFull(o);});
window.SAL=A;
})();
