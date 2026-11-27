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
function form(t){const e=t||{key:'',group:'',gus:'',short:'',theme:'',tag:'',leaders:[]};
 return `<form id="tm-form" class="tm-form" autocomplete="off"><h3>${t?'Edit '+esc(t.group):'Add a team'}</h3>
 <div class="tm-field"><label for="tm-q">Find the GUS scrum team</label><div class="tm-search"><input id="tm-q" placeholder="Start typing the scrum team name…" ${t?'disabled':''}><span id="tm-hits" class="tm-hits" role="listbox"></span></div><small>The scrum team must be active in GUS. Planned releases filed on it appear in Release Review.</small></div>
 <div class="tm-grid">
 <div class="tm-field"><label for="tm-gus">GUS scrum team name</label><input id="tm-gus" maxlength="81" value="${esc(e.gus)}"><small>Exact name; end with % to match every team starting with it.</small></div>
 <div class="tm-field"><label for="tm-group">Display name</label><input id="tm-group" maxlength="60" value="${esc(e.group)}"></div>
 <div class="tm-field"><label for="tm-short">Short name</label><input id="tm-short" maxlength="12" value="${esc(e.short)}"></div>
 <div class="tm-field"><label for="tm-key">Team key</label><input id="tm-key" maxlength="31" value="${esc(e.key)}" ${t?'disabled':''}></div>
 <div class="tm-field"><label for="tm-theme">Workstream theme</label><input id="tm-theme" maxlength="12" value="${esc(e.theme)}"></div>
 <div class="tm-field"><label for="tm-tag">Default product tag <em>(optional)</em></label><input id="tm-tag" maxlength="80" value="${esc(e.tag)}"><span id="tm-tags" class="tm-tags"></span><small>Active product tags of the GUS scrum team appear here to pick from.</small></div></div>
${t?'':'<label class="tm-check"><input type="checkbox" id="tm-nosp"><span><b>Start without the shared HRP projects</b><small>Import this team\'s own projects instead. You can also remove them later from the planner.</small></span></label>'}
 <details class="tm-more" ${(e.chronicle||e.hourglass||e.pagerduty||e.program)?'open':''}><summary>More page settings <em>(optional)</em></summary><div class="tm-grid">
 <div class="tm-field"><label for="tm-prog">GUS program for new projects</label><input id="tm-prog" maxlength="80" placeholder="e.g. GBDS-268 or a1f… id" value="${esc(e.program)}"><small>Projects created from the dashboard go in this program. Leave empty to use "&lt;short name&gt; - 268". Imported projects keep the program GUS has them in.</small></div>
 <div class="tm-field"><label for="tm-chron">Daily Chronicle page</label><input id="tm-chron" maxlength="200" placeholder="https://git.soma.salesforce.com/pages/…" value="${esc(e.chronicle)}"><small>Enables the Daily Chronicle button for this team.</small></div>
 <div class="tm-field"><label for="tm-hg">Hourglass team key</label><input id="tm-hg" maxlength="24" value="${esc(e.hourglass)}"><small>Only works when the Hourglass data file already includes this team (today MAPS, MQ, VegaCache).</small></div>
 <div class="tm-field"><label for="tm-pdid">PagerDuty Slack channel id</label><input id="tm-pdid" maxlength="15" placeholder="C09ABCDEF12" value="${esc((e.pagerduty||{}).id)}"><small>Trust Champion alerts are read from this channel; the Slack bot must be a member.</small></div>
 <div class="tm-field"><label for="tm-pdname">PagerDuty channel name</label><input id="tm-pdname" maxlength="80" placeholder="#team-pagerduty" value="${esc((e.pagerduty||{}).name)}"></div></div></details>
 <div class="tm-field"><label>Leaders</label><div id="tm-leaders" class="tm-leaders" aria-live="polite"><em>Pick the GUS scrum team to see its Scrum Lead, Engineering Manager and Architect.</em></div></div>
 <div id="tm-err" class="tm-err" role="alert"></div>
 <div class="tm-actions"><button type="button" class="button" id="tm-cancel">Cancel</button><button type="submit" class="button primary" id="tm-save">${t?'Save changes':'Add team'}</button></div></form>`;}
let picked=null,seq=0;
function showTags(tags){const box_=$('tm-tags'),inp=$('tm-tag');if(!box_||!inp)return;
 if(tags.length===1&&!inp.value&&editing===true)inp.value=tags[0];
 box_.innerHTML=tags.map(t=>`<button type="button" class="tm-tagpick${inp.value===t?' on':''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
 box_.querySelectorAll('button').forEach(b=>b.onclick=()=>{inp.value=inp.value===b.dataset.tag?'':b.dataset.tag;box_.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.tag===inp.value));});}
async function loadLeaders(reset){const box_=$('tm-leaders');if(!box_)return;const my=++seq;if(reset){box_.innerHTML='';picked=new Set();if($('tm-tags'))$('tm-tags').innerHTML='';}const name=$('tm-gus').value.trim();
 if(picked===null)picked=new Set(editing&&editing!==true?((cfg.teams.find(t=>t.key===editing)||{}).leaders||[]):[]);
 else box_.querySelectorAll('[data-leader]').forEach(i=>i.checked?picked.add(i.dataset.leader):picked.delete(i.dataset.leader));
 if(!name){box_.innerHTML='<em>Pick the GUS scrum team to see its Scrum Lead, Engineering Manager and Architect.</em>';return;}
 box_.innerHTML='<em>Loading leaders from GUS…</em>';
 try{const r=await api('team-leaders',{name,ids:[...picked]});if(my!==seq)return;
  if(!r.team){box_.innerHTML='<em>No active GUS scrum team matches “'+esc(name)+'”.</em>';return;}
  showTags(r.tags||[]);
  const fresh=!picked.size&&!(editing&&editing!==true);if(fresh)r.people.forEach(p=>{if(p.lead)picked.add(p.id);});
  const key=p=>p.lead||picked.has(p.id)||p.roles.some(x=>/Product Owner|Program Manager/.test(x));
  const chip=p=>`<label class="tm-chip"><input type="checkbox" data-leader="${esc(p.id)}" ${picked.has(p.id)?'checked':''}>${esc(p.name)}${p.roles.length?` <em>${esc(p.roles.join(', '))}</em>`:''}</label>`;
  const main=r.people.filter(key),more=r.people.filter(p=>!key(p));
  box_.innerHTML=(main.map(chip).join('')||'<em>This GUS team lists no Scrum Lead, Engineering Manager or Architect.</em>')+(more.length?`<button type="button" class="button small" id="tm-more">Show all ${more.length} other members</button>`:'');
  if(more.length)$('tm-more').onclick=()=>{box_.querySelectorAll('[data-leader]').forEach(i=>i.checked?picked.add(i.dataset.leader):picked.delete(i.dataset.leader));$('tm-more').remove();box_.insertAdjacentHTML('beforeend',more.map(chip).join(''));};
 }catch(e){box_.innerHTML='<em>'+esc(e.message||e)+'</em>';}}
function draw(){
 if(!box){box=document.createElement('div');box.className='tm-overlay';document.body.append(box);document.addEventListener('keydown',onKey);box.addEventListener('mousedown',e=>{if(e.target===box)close();});}
 const chips=cfg.teams.some(t=>t.builtIn)?`<div class="tm-built"><span>Built-in teams</span>${cfg.teams.filter(t=>t.builtIn).map(t=>`<em class="tm-bchip" title="${esc(t.gus.replace(/%$/,''))}">${esc(t.group.replace(/ Team$/,''))}</em>`).join('')}</div>`:'';
 const rows=cfg.teams.filter(t=>!t.builtIn).map(t=>`<div class="tm-row"><div><strong>${esc(t.group)}</strong><small>${esc(t.gus.replace(/%$/,''))}${t.short?' · '+esc(t.short):''}</small></div><span class="tm-badge ${t.builtIn?'':'tm-custom'}">${t.builtIn?'Built in':'Added in app'}</span>${t.builtIn?'':`<button type="button" class="button small" data-edit="${esc(t.key)}">Edit</button><button type="button" class="button small danger" data-del="${esc(t.key)}">Remove</button>`}</div>`).join('');
 box.innerHTML=`<div class="tm-dialog" role="dialog" aria-modal="true" aria-label="Teams"><header><h2>Teams</h2><button type="button" class="icon-button" id="tm-x" aria-label="Close">×</button></header>
 <div class="tm-body">${chips}${rows?`<div class="tm-list">${rows}</div>`:''}${editing===null?'<button type="button" class="button primary" id="tm-add">＋ Add a team</button>':form(editing===true?null:cfg.teams.find(t=>t.key===editing))}</div></div>`;
 $('tm-x').onclick=close;
 if($('tm-add'))$('tm-add').onclick=()=>{editing=true;picked=null;draw();$('tm-q').focus();};
 box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing=b.dataset.edit;picked=null;draw();});
 box.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{const t=cfg.teams.find(x=>x.key===b.dataset.del);if(!await window.Hub.confirm({title:'Remove team?',message:'Remove '+t.group+' from ReleaseIQ? Its GUS team and releases are not touched.',ok:'Remove',cancel:'Cancel',danger:true}))return;b.disabled=true;try{cfg=await api('teams-config');cfg=await api('delete-team',{key:t.key});await window.Hub.refreshTeams();window.toast?.(t.group+' removed.');draw();}catch(e){window.toast?.(e.message||String(e),true);b.disabled=false;}});
 if($('tm-form')){
  loadLeaders();
  $('tm-gus').onchange=()=>loadLeaders(editing===true);
  $('tm-cancel').onclick=()=>{editing=null;picked=null;draw();};
  let timer=0;const q=$('tm-q');
  if(q)q.oninput=()=>{clearTimeout(timer);const v=q.value.trim(),hits=$('tm-hits');if(v.length<2){hits.innerHTML='';return;}timer=setTimeout(async()=>{try{const r=await api('team-lookup',{q:v});hits.innerHTML=r.teams.length?r.teams.map(t=>`<button type="button" role="option" data-name="${esc(t.name)}">${esc(t.name)}</button>`).join(''):'<em>No active scrum team matches.</em>';hits.querySelectorAll('button').forEach(b=>b.onclick=()=>{const n=b.dataset.name;$('tm-gus').value=n;if(!$('tm-group').value)$('tm-group').value=n.replace(/\s*\(.*\)/,'');if(!$('tm-short').value)$('tm-short').value=initials(n);if(!$('tm-key').value)$('tm-key').value=slug(n);if(!$('tm-theme').value)$('tm-theme').value=initials(n);hits.innerHTML='';q.value=n;loadLeaders(true);});}catch(e){hits.innerHTML='<em>'+esc(e.message||e)+'</em>';}},250);};
  $('tm-form').onsubmit=async ev=>{ev.preventDefault();const btn=$('tm-save');btn.disabled=true;$('tm-err').textContent='';
   try{const body={originalKey:editing===true?undefined:editing,gus:$('tm-gus').value,group:$('tm-group').value,short:$('tm-short').value,key:$('tm-key').value||slug($('tm-group').value),theme:$('tm-theme').value,tag:$('tm-tag').value,program:$('tm-prog').value,chronicle:$('tm-chron').value,hourglass:$('tm-hg').value,pagerduty:{id:$('tm-pdid').value,name:$('tm-pdname').value},noSharedProjects:!!($('tm-nosp')&&$('tm-nosp').checked),leaders:[...box.querySelectorAll('[data-leader]:checked')].map(i=>i.dataset.leader).concat([...(picked||[])].filter(id=>!box.querySelector('[data-leader="'+id+'"]')))};
    cfg=await api('save-team',body);
    await window.Hub.refreshTeams();const saved=window.Hub.teams.find(t=>t.key===body.key);
    window.toast?.(saved?(body.group+' saved. It is now in the team list.'):(body.group+' saved, but no active GUS scrum team matches “'+body.gus+'”.'),!saved);
    editing=null;draw();if(saved&&editing===null&&!body.originalKey)window.Hub.setTeam(saved.Id);
   }catch(e){$('tm-err').textContent=e.message||String(e);btn.disabled=false;}};
 }
}
async function open(){editing=null;try{await load();}catch(e){window.toast?.('Teams unavailable: '+(e.message||e),true);}}
window.openTeamsDialog=open;
/* The ⚙ Teams button is the last control of the page bar (after Refresh), drawn as the same 3D tile as the page icons. */
let tmBtn=null;
function addButton(){const bar=document.getElementById('dashboard-controls');if(!bar||!document.querySelector('label.hub-team'))return;
 if(!tmBtn){tmBtn=document.createElement('button');tmBtn.type='button';tmBtn.className='tm-open';tmBtn.title='Manage teams — add a team';tmBtn.setAttribute('aria-label','Manage teams');tmBtn.innerHTML=window.ReviewIcons?window.ReviewIcons.icon('settings','blue'):'⚙';tmBtn.onclick=open;}
 const tb=bar.querySelector('.release-toolbar'),host=tb&&tb.getClientRects().length?tb:bar;
 if(tmBtn.parentNode!==host||host.lastElementChild!==tmBtn)host.append(tmBtn);}
window.addEventListener('hub:team',addButton);window.addEventListener('hashchange',()=>setTimeout(addButton,50));document.addEventListener('DOMContentLoaded',()=>{setTimeout(addButton,300);const bar=document.getElementById('dashboard-controls');if(bar)new MutationObserver(addButton).observe(bar,{childList:true,subtree:true});});
})();
