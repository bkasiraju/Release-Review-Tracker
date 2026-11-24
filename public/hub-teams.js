/* Teams dialog: onboard a team from the UI. Teams saved here are stored in the shared GUS Apps store and appear in the team picker, Release Review and the hub for everyone. */
(function(){
'use strict';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=s=>String(s||'').toLowerCase().replace(/\(.*?\)/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30);
const initials=s=>String(s||'').replace(/\(.*?\)/g,'').split(/\s+/).filter(Boolean).map(w=>w[0]).join('').toUpperCase().slice(0,6);
let cfg=null,editing=null,box=null;
const api=(a,d)=>window.api(a,d||{});
function close(){if(box){box.remove();box=null;}document.removeEventListener('keydown',onKey);}
const onKey=e=>{if(e.key==='Escape')close();};
async function load(){cfg=await api('teams-config');draw();}
function form(t){const e=t||{key:'',group:'',gus:'',short:'',theme:'',tag:'',leaders:['AMIT','JAYANT']};
 return `<form id="tm-form" class="tm-form" autocomplete="off"><h3>${t?'Edit '+esc(t.group):'Add a team'}</h3>
 <div class="tm-field"><label for="tm-q">Find the GUS scrum team</label><div class="tm-search"><input id="tm-q" placeholder="Start typing the scrum team name…" ${t?'disabled':''}><span id="tm-hits" class="tm-hits" role="listbox"></span></div><small>The scrum team must be active in GUS. Planned releases filed on it appear in Release Review.</small></div>
 <div class="tm-grid">
 <div class="tm-field"><label for="tm-gus">GUS scrum team name</label><input id="tm-gus" maxlength="81" value="${esc(e.gus)}"><small>Exact name; end with % to match every team starting with it.</small></div>
 <div class="tm-field"><label for="tm-group">Display name</label><input id="tm-group" maxlength="60" value="${esc(e.group)}"></div>
 <div class="tm-field"><label for="tm-short">Short name</label><input id="tm-short" maxlength="12" value="${esc(e.short)}"></div>
 <div class="tm-field"><label for="tm-key">Team key</label><input id="tm-key" maxlength="31" value="${esc(e.key)}" ${t?'disabled':''}></div>
 <div class="tm-field"><label for="tm-theme">Workstream theme</label><input id="tm-theme" maxlength="12" value="${esc(e.theme)}"></div>
 <div class="tm-field"><label for="tm-tag">Default product tag <em>(optional)</em></label><input id="tm-tag" maxlength="80" value="${esc(e.tag)}"></div></div>
 <div class="tm-field"><label>Leaders</label><div class="tm-leaders">${cfg.leaders.map(n=>{const on=(e.leaders||[]).includes(n),lock=n==='AMIT'||n==='JAYANT';return `<label class="tm-chip"><input type="checkbox" data-leader="${n}" ${on||lock?'checked':''} ${lock?'disabled':''}>${n[0]+n.slice(1).toLowerCase()}</label>`;}).join('')}</div><small>Amit and Jayant lead every team.</small></div>
 <div id="tm-err" class="tm-err" role="alert"></div>
 <div class="tm-actions"><button type="button" class="button" id="tm-cancel">Cancel</button><button type="submit" class="button primary" id="tm-save">${t?'Save changes':'Add team'}</button></div></form>`;}
function draw(){
 if(!box){box=document.createElement('div');box.className='tm-overlay';document.body.append(box);document.addEventListener('keydown',onKey);box.addEventListener('mousedown',e=>{if(e.target===box)close();});}
 const rows=cfg.teams.map(t=>`<div class="tm-row"><div><strong>${esc(t.group)}</strong><small>${esc(t.gus)} · ${esc(t.short||'—')}</small></div><span class="tm-badge ${t.builtIn?'':'tm-custom'}">${t.builtIn?'Built in':'Added in app'}</span>${t.builtIn?'':`<button type="button" class="button small" data-edit="${esc(t.key)}">Edit</button><button type="button" class="button small danger" data-del="${esc(t.key)}">Remove</button>`}</div>`).join('');
 box.innerHTML=`<div class="tm-dialog" role="dialog" aria-modal="true" aria-label="Teams"><header><h2>Teams</h2><button type="button" class="icon-button" id="tm-x" aria-label="Close">×</button></header>
 <div class="tm-body"><div class="tm-list">${rows}</div>${editing===null?'<button type="button" class="button primary" id="tm-add">＋ Add a team</button>':form(editing===true?null:cfg.teams.find(t=>t.key===editing))}</div></div>`;
 $('tm-x').onclick=close;
 if($('tm-add'))$('tm-add').onclick=()=>{editing=true;draw();$('tm-q').focus();};
 box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;draw();});
 box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const t=cfg.teams.find(x=>x.key===b.dataset.del);if(!window.confirm('Remove '+t.group+' from ReleaseIQ? Its GUS team and releases are not touched.'))return;b.disabled=true;try{cfg=await api('teams-config');cfg=await api('delete-team',{key:t.key});await window.Hub.refreshTeams();window.toast?.(t.group+' removed.');draw();}catch(e){window.toast?.(e.message||String(e),true);b.disabled=false;}});
 if($('tm-form')){
  $('tm-cancel').onclick=()=>{editing=null;draw();};
  let timer=0;const q=$('tm-q');
  if(q)q.oninput=()=>{clearTimeout(timer);const v=q.value.trim(),hits=$('tm-hits');if(v.length<2){hits.innerHTML='';return;}timer=setTimeout(async()=>{try{const r=await api('team-lookup',{q:v});hits.innerHTML=r.teams.length?r.teams.map(t=>`<button type="button" role="option" data-name="${esc(t.name)}">${esc(t.name)}</button>`).join(''):'<em>No active scrum team matches.</em>';hits.querySelectorAll('button').forEach(b=>b.onclick=()=>{const n=b.dataset.name;$('tm-gus').value=n;if(!$('tm-group').value)$('tm-group').value=n.replace(/\s*\(.*\)/,'');if(!$('tm-short').value)$('tm-short').value=initials(n);if(!$('tm-key').value)$('tm-key').value=slug(n);if(!$('tm-theme').value)$('tm-theme').value=initials(n);hits.innerHTML='';q.value=n;});}catch(e){hits.innerHTML='<em>'+esc(e.message||e)+'</em>';}},250);};
  $('tm-form').onsubmit=async ev=>{ev.preventDefault();const btn=$('tm-save');btn.disabled=true;$('tm-err').textContent='';
   try{const body={originalKey:editing===true?undefined:editing,gus:$('tm-gus').value,group:$('tm-group').value,short:$('tm-short').value,key:$('tm-key').value||slug($('tm-group').value),theme:$('tm-theme').value,tag:$('tm-tag').value,leaders:[...box.querySelectorAll('[data-leader]:checked')].map(i=>i.dataset.leader)};
    cfg=await api('save-team',body);
    await window.Hub.refreshTeams();const saved=window.Hub.teams.find(t=>t.key===body.key);
    window.toast?.(saved?(body.group+' saved. It is now in the team list.'):(body.group+' saved, but no active GUS scrum team matches “'+body.gus+'”.'),!saved);
    editing=null;draw();if(saved&&editing===null&&!body.originalKey)window.Hub.setTeam(saved.Id);
   }catch(e){$('tm-err').textContent=e.message||String(e);btn.disabled=false;}};
 }
}
async function open(){editing=null;try{await load();}catch(e){window.toast?.('Teams unavailable: '+(e.message||e),true);}}
window.openTeamsDialog=open;
function addButton(){const l=document.querySelector('label.hub-team');if(!l||l.querySelector('.tm-open'))return;const b=document.createElement('button');b.type='button';b.className='tm-open';b.title='Manage teams — add a team';b.setAttribute('aria-label','Manage teams');b.textContent='⚙';b.onclick=open;l.append(b);}
window.addEventListener('hub:team',addButton);document.addEventListener('DOMContentLoaded',()=>setTimeout(addButton,300));
})();
