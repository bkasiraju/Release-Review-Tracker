/* Nudge modal: Slack (default) and GUS Chatter tabs, with an @user search over the MAPS / MQ / VegaCache members. */
(function(){
'use strict';
const H=window.Hub,{esc,call}=H;
const rec=o=>`data-nudge="${esc(o.id)}" data-name="${esc(o.name||'')}" data-subject="${esc((o.subject||'').slice(0,200))}" data-who="${esc(o.assignee||'')}"`;
H.nudgeBtn=o=>o&&o.id?`<button type="button" class="nudge-btn" ${rec(o)} title="Nudge ${esc(o.assignee||'someone')} about ${esc(o.name||'this item')} on Slack or GUS Chatter" aria-label="Nudge about ${esc(o.name||'this item')}">Nudge</button>`:'';
let S=null;
const link=id=>`${H.GUS}${/^a3Q|^a0/.test(id)?'ADM_Epic__c':'ADM_Work__c'}/${id}/view`;
const draft=(s,u)=>`Hi ${(u?u.name:s.who||'there').split(' ')[0]}, quick nudge on ${s.name}${s.subject&&s.subject!==s.name?' — '+s.subject:''}. Could you share an update?\n${link(s.id)}`;
function close(){if(S){S.el.remove();document.removeEventListener('keydown',S.key);S.opener&&S.opener.focus&&S.opener.focus();S=null;}}
function msg(t,kind){const n=S.el.querySelector('#nd-msg');n.className='nd-msg '+(kind||'');n.textContent=t||'';}
function draw(){
  const s=S,tab=s.tab;
  s.el.querySelector('#nd-tabs').innerHTML=['slack','chatter'].map(t=>`<button type="button" role="tab" class="nd-tab${t===tab?' on':''}" data-tab="${t}" aria-selected="${t===tab}">${t==='slack'?'Slack (default)':'GUS Chatter'}</button>`).join('');
  const u=s.user;
  s.el.querySelector('#nd-chosen').innerHTML=u?`<span class="nd-chip">@${esc(u.name)}<button type="button" data-clear aria-label="Remove ${esc(u.name)}">×</button></span>`:'';
  const act=s.el.querySelector('#nd-actions');
  if(tab==='chatter')act.innerHTML=`<button type="button" class="button primary" data-send ${u&&!s.busy?'':'disabled'}>${s.busy?'Posting…':'Post to Chatter'}</button>`;
  else act.innerHTML=`<button type="button" class="button primary" data-copy ${u?'':'disabled'}>Copy message</button>${s.slack&&s.slack.dmUrl?`<a class="button" href="${esc(s.slack.dmUrl)}">Open Slack DM</a>`:''}`;
  s.el.querySelector('#nd-hint').textContent=tab==='chatter'?`Posts on the record's Chatter feed in GUS and @mentions ${u?u.name:'the user'}.`:(s.slack?s.slack.notice:'Pick a user to look up their Slack account.');
}
async function pickSlack(){const s=S;s.slack=null;draw();if(!s.user)return;const id=s.user.id;try{const r=await call('post-slack',{userId:id});if(S===s&&s.user&&s.user.id===id){s.slack=r;draw();}}catch(e){if(S===s){s.slack={notice:'Slack lookup failed: '+e.message};draw();}}}
function choose(u){S.user=u;S.el.querySelector('#nd-q').value='';S.el.querySelector('#nd-list').innerHTML='';const t=S.el.querySelector('#nd-text');if(!S.edited)t.value=draft(S,u);msg('');draw();pickSlack();}
let timer=0;
async function search(term,auto){
  const s=S,list=s.el.querySelector('#nd-list'),my=++s.seq;list.innerHTML='<li class="nd-note">Searching…</li>';
  try{const r=await call('post-users',{q:term});if(S!==s||my!==s.seq)return;
    if(auto&&r.users.length===1){choose(r.users[0]);return;}
    list.innerHTML=r.users.length?r.users.map(u=>`<li><button type="button" data-user="${esc(u.id)}"><b>${esc(u.name)}</b><span>${esc(u.title)}</span></button></li>`).join(''):'<li class="nd-note">No matching MAPS / MQ / VegaCache member.</li>';
    s.users=r.users;
  }catch(e){if(S===s&&my===s.seq)list.innerHTML=`<li class="nd-note">${esc(e.message)}</li>`;}
}
function open(btn){
  close();
  const d=btn.dataset;S={id:d.nudge,name:d.name,subject:d.subject,who:d.who,tab:'slack',user:null,slack:null,busy:false,edited:false,seq:0,users:[],opener:btn};
  const el=document.createElement('div');el.className='nd-overlay';
  el.innerHTML=`<div class="nd-modal" role="dialog" aria-modal="true" aria-labelledby="nd-title"><div class="nd-head"><h2 id="nd-title">Nudge · ${esc(d.name)}</h2><button type="button" class="nd-x" data-close aria-label="Close">×</button></div>
  <div id="nd-tabs" class="nd-tabs" role="tablist"></div>
  <label class="nd-lab" for="nd-q">To (@user)</label><div id="nd-chosen"></div><input id="nd-q" class="hub-inline" autocomplete="off" placeholder="Search MAPS, MQ and VegaCache members" role="combobox" aria-controls="nd-list"><ul id="nd-list" class="nd-list" role="listbox"></ul>
  <label class="nd-lab" for="nd-text">Message</label><textarea id="nd-text" rows="5" maxlength="4000"></textarea>
  <p id="nd-hint" class="note"></p><div id="nd-msg" class="nd-msg" role="status"></div><div id="nd-actions" class="nd-actions"></div></div>`;
  document.body.appendChild(el);S.el=el;
  S.key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',S.key);
  el.querySelector('#nd-text').value=draft(S,null);
  el.querySelector('#nd-text').oninput=()=>{S.edited=true;};
  el.querySelector('#nd-q').oninput=e=>{clearTimeout(timer);const v=e.target.value;timer=setTimeout(()=>search(v,false),250);};
  el.querySelector('#nd-q').onfocus=e=>{if(!e.target.value&&!S.users.length)search('',false);};
  el.addEventListener('click',async e=>{
    const t=e.target.closest('button,a');if(e.target===el||(t&&t.matches('[data-close]')))return close();
    if(!t)return;
    if(t.dataset.tab){S.tab=t.dataset.tab;msg('');draw();}
    else if(t.dataset.user){choose(S.users.find(u=>u.id===t.dataset.user));}
    else if('clear' in t.dataset){S.user=null;S.slack=null;draw();}
    else if('copy' in t.dataset){const txt=el.querySelector('#nd-text').value;try{await navigator.clipboard.writeText(`<@${S.slack&&S.slack.slackUserId||S.user.name}> ${txt}`.replace(/^<@([^>]*)>/,(m,x)=>S.slack&&S.slack.slackUserId?m:'@'+x));msg('Copied. Paste it into the Slack DM.','ok');}catch(_){msg('Copy failed — select the message text and copy it manually.','err');}}
    else if('send' in t.dataset){const text=el.querySelector('#nd-text').value,s=S;s.busy=true;msg('');draw();
      try{const r=await call('post-chatter',{recordId:s.id,userId:s.user.id,text});if(S===s){s.busy=false;draw();msg('Posted to GUS Chatter'+(r.id?' ('+r.id+')':'')+'.','ok');}}
      catch(err){if(S===s){s.busy=false;draw();msg('Not posted: '+err.message,'err');}}}
  });
  draw();el.querySelector('#nd-q').focus();
  if(d.who)search(d.who,true);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-nudge]');if(b){e.preventDefault();e.stopPropagation();open(b);}},true);
})();
