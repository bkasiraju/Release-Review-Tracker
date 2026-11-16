/* Nudge modal: Slack (default) and GUS Chatter tabs, with an @user search over the MAPS / MQ / VegaCache members. */
(function(){
'use strict';
const H=window.Hub,{esc,call}=H;
const rec=o=>`data-nudge="${esc(o.id)}" data-name="${esc(o.name||'')}" data-subject="${esc((o.subject||'').slice(0,300))}" data-who="${esc(o.assignee||'')}"`;
H.nudgeBtn=o=>o&&o.id?`<button type="button" class="nudge-btn" ${rec(o)} title="Nudge ${esc(o.assignee||'someone')} about ${esc(o.name||'this item')} on Slack or GUS Chatter" aria-label="Nudge about ${esc(o.name||'this item')}">Nudge</button>`:'';
let S=null;
const link=id=>`${H.GUS}${/^a3Q/.test(id)?'ADM_Epic__c':'ADM_Work__c'}/${id}/view`;
const KINDS={update:['Status update','Could you share an update?'],eta:['ETA check','Could you confirm the ETA?'],block:['Blocked?','Is anything blocking this, and how can I help?']};
const one=t=>String(t||'').replace(/\s+/g,' ').trim();
const draft=(s,u,k)=>`Hi ${(u?u.name:s.who||'there').split(' ')[0]},\n\nQuick nudge on ${s.name}${s.subject&&s.subject!==s.name?' — '+one(s.subject):''}.\n${KINDS[k||s.kind||'update'][1]}\n\n${link(s.id)}`;
const ICO={slack:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3 7 21M17 3l-2 18M4 8h17M3 16h17"/></svg>',chatter:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/></svg>',copy:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',send:'<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-11 11M22 2l-7 20-4-9-9-4z"/></svg>',bell:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>',info:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>'};
function close(){if(S){S.el.remove();document.removeEventListener('keydown',S.key);S.opener&&S.opener.focus&&S.opener.focus();S=null;}}
function msg(t,kind){const n=S.el.querySelector('#nd-msg');n.className='nd-msg '+(kind||'');n.textContent=t||'';}
function draw(){
  const s=S,tab=s.tab,u=s.user;
  s.el.querySelector('#nd-tabs').innerHTML=['slack','chatter'].map(t=>`<button type="button" role="tab" class="nd-tab${t===tab?' on':''}" data-tab="${t}" aria-selected="${t===tab}">${ICO[t]}<span>${t==='slack'?'Slack':'GUS Chatter'}</span>${t==='slack'?'<em>default</em>':''}</button>`).join('');
  s.el.querySelector('#nd-chosen').innerHTML=u?`<span class="nd-chip">${H.avatarHtml?H.avatarHtml(u.id,u.name,22):''}<b>${esc(u.name)}</b><button type="button" data-clear aria-label="Remove ${esc(u.name)}">×</button></span>`:'';
  s.el.querySelector('#nd-q').placeholder=u?'Change recipient…':'Search a teammate…';
  s.el.querySelector('#nd-kinds').innerHTML=Object.entries(KINDS).map(([k,v])=>`<button type="button" class="nd-kind${k===s.kind?' on':''}" data-kind="${k}">${esc(v[0])}</button>`).join('');
  s.el.querySelector('#nd-count').textContent=s.el.querySelector('#nd-text').value.length+' / 4000';
  const act=s.el.querySelector('#nd-actions'),cancel='<button type="button" class="button nd-cancel" data-close>Cancel</button>';
  s.el.querySelector('#nd-chan').hidden=tab==='chatter';
  if(tab==='chatter')act.innerHTML=`${cancel}<button type="button" class="button primary nd-go" data-send ${u&&!s.busy?'':'disabled'}>${ICO.send}${s.busy?'Posting…':'Post to Chatter'}</button>`;
  else{const can=!!(s.slack&&s.slack.canSend),chs=(s.slack&&s.slack.channels)||[],cur=chs.find(c=>c.teamId===s.chanTeam)||chs[0];if(cur)s.chanTeam=cur.teamId;
    s.el.querySelector('#nd-chan').innerHTML=`<label class="nd-lab" for="nd-chsel">Post to channel</label><div class="nd-chanrow">${chs.length?`<div class="nd-chwrap"><span class="nd-chhash" aria-hidden="true">#</span><select id="nd-chsel" class="nd-chsel" aria-label="Slack channel">${chs.map(c=>`<option value="${esc(c.teamId)}"${cur&&c.teamId===cur.teamId?' selected':''}>${esc(chName(c))}</option>`).join('')}</select></div>`:'<span class="muted">No channel set up yet.</span>'}<button type="button" class="button nd-chcfg" data-chcfg>${chs.length?'Manage channels':'Set up channels'}</button></div>`;
    act.innerHTML=`${cancel}${s.slack&&s.slack.dmUrl?`<a class="button" href="${esc(s.slack.dmUrl)}">Open Slack DM</a>`:''}<button type="button" class="button${can?'':' primary nd-go'}" data-copy ${u?'':'disabled'}>${ICO.copy}Copy message</button>${can?`<button type="button" class="button primary nd-go" data-slack-send ${u&&!s.busy?'':'disabled'}>${ICO.send}${s.busy?'Sending…':'Send to '+esc(cur?chName(cur):'Slack')}</button>`:''}`;}
  const hint=tab==='chatter'?`Posts on the record's Chatter feed in GUS and @mentions ${u?u.name:'the user'}.`:(s.slack?(s.slack.canSend?`${u.name} matched in Slack. Send posts in the selected channel and @mentions them, or copy the message.`:s.slack.notice):'Pick a user to look up their Slack account.');
  const h=s.el.querySelector('#nd-hint');h.innerHTML=hint?`${ICO.info}<span>${esc(hint)}</span>`:'';h.className='nd-hint'+(tab==='slack'&&s.slack&&!s.slack.dmUrl&&!s.slack.canSend&&u?' warn':'');
}
async function pickSlack(){const s=S;s.slack=null;draw();if(!s.user)return;const id=s.user.id;try{const r=await call('post-slack',{userId:id});if(S===s&&s.user&&s.user.id===id){s.slack=r;draw();}}catch(e){if(S===s){s.slack={notice:'Slack lookup failed: '+e.message};draw();}}}
function choose(u){S.user=u;S.el.querySelector('#nd-q').value='';S.el.querySelector('#nd-list').innerHTML='';const t=S.el.querySelector('#nd-text');if(!S.edited)t.value=draft(S,u);msg('');draw();pickSlack();}
let timer=0;
async function search(term,auto){
  const s=S,list=s.el.querySelector('#nd-list'),my=++s.seq;list.innerHTML='<li class="nd-note">Searching…</li>';
  try{const r=await call('post-users',{q:term});if(S!==s||my!==s.seq)return;
    if(auto&&r.users.length===1){choose(r.users[0]);return;}
    list.innerHTML=r.users.length?r.users.map(u=>`<li><button type="button" data-user="${esc(u.id)}">${H.avatarHtml?H.avatarHtml(u.id,u.name,28):''}<div><b>${esc(u.name)}</b><span>${esc(u.title||'')}</span></div></button></li>`).join(''):'<li class="nd-note">No matching MAPS / MQ / VegaCache member.</li>';
    s.users=r.users;
  }catch(e){if(S===s&&my===s.seq)list.innerHTML=`<li class="nd-note">${esc(e.message)}</li>`;}
}
function open(btn){
  close();
  const d=btn.dataset;S={kind:'update',id:d.nudge,name:d.name,subject:d.subject,who:d.who,tab:'slack',user:null,slack:null,busy:false,edited:false,seq:0,users:[],opener:btn};
  const el=document.createElement('div');el.className='nd-overlay';
  el.innerHTML=`<div class="nd-modal nd2" role="dialog" aria-modal="true" aria-labelledby="nd-title"><div class="nd-head"><span class="nd-badge">${ICO.bell}</span><div class="nd-ttl"><h2 id="nd-title">Nudge</h2><p><b>${esc(d.name)}</b>${d.subject&&d.subject!==d.name?' · '+esc(d.subject):''}</p></div><button type="button" class="nd-x" data-close aria-label="Close">×</button></div>
  <div id="nd-tabs" class="nd-tabs" role="tablist"></div>
  <label class="nd-lab" for="nd-q">To</label><div class="nd-to"><span id="nd-chosen"></span><input id="nd-q" autocomplete="off" role="combobox" aria-controls="nd-list"></div><ul id="nd-list" class="nd-list" role="listbox"></ul>
  <div class="nd-row"><label class="nd-lab" for="nd-text">Message</label><span id="nd-count" class="nd-count"></span></div><div id="nd-kinds" class="nd-kinds"></div><textarea id="nd-text" rows="5" maxlength="4000"></textarea>
  <div id="nd-chan" class="nd-chan"></div><div id="nd-hint" class="nd-hint"></div><div id="nd-msg" class="nd-msg" role="status"></div><div id="nd-actions" class="nd-actions"></div></div>`;
  document.body.appendChild(el);S.el=el;
  S.key=e=>{if(e.key==='Escape')close();};document.addEventListener('keydown',S.key);
  el.querySelector('#nd-text').value=draft(S,null);
  el.querySelector('#nd-text').oninput=()=>{S.edited=true;draw();};
  el.addEventListener('change',e=>{if(e.target.id==='nd-chsel'){S.chanTeam=e.target.value;draw();}});
  el.querySelector('#nd-q').oninput=e=>{clearTimeout(timer);const v=e.target.value;timer=setTimeout(()=>search(v,false),250);};
  el.querySelector('#nd-q').onfocus=e=>{if(!e.target.value&&!S.users.length)search('',false);};
  el.addEventListener('click',async e=>{
    const t=e.target.closest('button,a');if(e.target===el||(t&&t.matches('[data-close]')))return close();
    if(!t)return;
    if(t.dataset.kind){S.kind=t.dataset.kind;S.edited=false;el.querySelector('#nd-text').value=draft(S,S.user);draw();}
    else if('chcfg' in t.dataset){openChannels();}
    else if(t.dataset.tab){S.tab=t.dataset.tab;msg('');draw();}
    else if(t.dataset.user){choose(S.users.find(u=>u.id===t.dataset.user));}
    else if('clear' in t.dataset){S.user=null;S.slack=null;draw();}
    else if('copy' in t.dataset){const txt=el.querySelector('#nd-text').value;try{await navigator.clipboard.writeText(txt);msg('Copied. Paste it into the Slack DM.','ok');}catch(_){msg('Copy failed — select the message text and copy it manually.','err');}}
    else if('slackSend' in t.dataset){const text=el.querySelector('#nd-text').value,s=S;s.busy=true;msg('');draw();
      try{const cc=(s.slack.channels||[]).find(c=>c.teamId===s.chanTeam);if(!cc||!await H.confirm({title:'Post to Slack?',message:`Post this message in ${cc.name} (${cc.team}) and @mention ${s.user.name}?`,ok:'Post'})){s.busy=false;draw();return;}const r=await call('post-slack-send',{userId:s.user.id,teamId:s.chanTeam,text});if(S===s){s.busy=false;draw();msg('Posted in '+(r.channel||'the channel')+' and mentioned '+(r.to||'the recipient')+'.','ok');}}
      catch(err){if(S===s){s.busy=false;draw();msg('Not sent: '+err.message+' You can still copy the message.','err');}}}
    else if('send' in t.dataset){const text=el.querySelector('#nd-text').value,s=S;s.busy=true;msg('');draw();
      try{const r=await call('post-chatter',{recordId:s.id,userId:s.user.id,text});if(S===s){s.busy=false;draw();msg('Posted to GUS Chatter'+(r.id?' ('+r.id+')':'')+'.','ok');}}
      catch(err){if(S===s){s.busy=false;draw();msg('Not posted: '+err.message,'err');}}}
  });
  draw();el.querySelector('#nd-q').focus();
  if(d.who)search(d.who,true);
}
/** Slack channel settings: one channel per team, shared with everyone using the dashboard. */
const chName=c=>/^[CG][A-Z0-9]{7,}$/.test(c.name||'')||!c.name?(c.team||'team')+' channel':c.name.replace(/^#/,'');
async function openChannels(){
  const ov=document.createElement('div');ov.className='nd-overlay nd-overlay2';
  ov.innerHTML='<div class="nd-modal nd2 nd-cfg" role="dialog" aria-modal="true" aria-labelledby="nc-title"><div class="nd-head"><div class="nd-ttl"><h2 id="nc-title">Slack channels</h2><p>Nudges post in the team’s channel and @mention the engineer. Invite <b>@GUS MIYO</b> to each channel first. Paste a channel link or ID.</p></div><button type="button" class="nd-x" data-ncx aria-label="Close">×</button></div><div id="nc-body"><div class="hub-loading" role="status">Loading…</div></div></div>';
  document.body.appendChild(ov);
  const done=()=>{ov.remove();document.removeEventListener('keydown',kd,true);if(S&&S.user)pickSlack();};
  const kd=e=>{if(e.key==='Escape'){e.stopPropagation();done();}};document.addEventListener('keydown',kd,true);
  ov.addEventListener('click',async e=>{
    if(e.target===ov||e.target.closest('[data-ncx]'))return done();
    const b=e.target.closest('[data-nsave]');if(!b)return;
    const row=b.closest('[data-nteam]'),inp=row.querySelector('input'),st=row.querySelector('.nc-st');b.disabled=true;st.textContent='Saving…';st.className='nc-st';
    try{const r=await call('slack-channels-save',{teamId:row.dataset.nteam,channel:inp.value});
      inp.value=r.channel?r.channel.id:'';st.className='nc-st ok';st.textContent=r.channel?(r.channel.verified?`Saved · ${r.channel.name}`:'Saved (channel name could not be checked; make sure @GUS MIYO is invited)'):'Cleared';}
    catch(err){st.className='nc-st err';st.textContent=err.message;}finally{b.disabled=false;}
  });
  try{const r=await call('slack-channels');
    ov.querySelector('#nc-body').innerHTML=`<div class="nc-list">${r.teams.map(t=>`<div class="nc-row" data-nteam="${esc(t.teamId)}"><label class="nc-name" for="nc-in-${esc(t.teamId)}">${esc(t.name)}</label><div class="nc-field"><span class="nc-hash" aria-hidden="true">#</span><input id="nc-in-${esc(t.teamId)}" type="text" value="${esc(t.channel?t.channel.id:'')}" placeholder="Paste channel link or ID" aria-label="Slack channel for ${esc(t.name)}" autocomplete="off"></div><button type="button" class="button primary nc-save" data-nsave>Save</button><div class="nc-st${t.channel&&t.channel.name?' ok':''}" role="status">${t.channel&&t.channel.name?esc(t.channel.name):''}</div></div>`).join('')}</div>`;
    ov.querySelector('input')&&ov.querySelector('input').focus();}
  catch(e){ov.querySelector('#nc-body').innerHTML=`<p class="nd-msg err">Could not load teams: ${esc(e.message)}</p>`;}
}
H.openSlackChannels=openChannels;
document.addEventListener('click',e=>{const b=e.target.closest('[data-nudge]');if(b){e.preventDefault();e.stopPropagation();open(b);}},true);
})();
