/* Release Planning: engineers plan projects, epics and workstreams (effort in days), mark epics above/below the line (ABL/BTL),
 * and the dashboard derives planned vs available capacity live. The draft saves to GUS Apps; only ABL epics are written to GUS on confirm.
 * Every interpolated value in the templates below goes through esc() or is a number from fmt(). */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const P={plan:null,rev:null,refs:{releases:[],programs:[],projects:[],sprints:[]},members:[],seq:0,timer:0,state:'idle',stateAt:'',inflight:null,el:null};
P.open={theme:false,eng:false,exec:false,kpis:false};P.sumBy='theme';
P.mOpen=new Set(); // projects whose V2MOM method is expanded on the project row (session only)
P.view={q:'',tok:[],release:[],line:[],eng:[],theme:[],group:'project',flag:'',kpi:'',col:{}};
const MF=['release','line','eng','theme'],FKEY='pl-filters-';
const filtersOn=V=>!!(V.q||V.flag||Object.values(V.col||{}).some(v=>v&&v.trim())||(V.tok&&V.tok.length)||MF.some(k=>V[k].length));
/** Saved filter selections per team: kept in memory for the session and in localStorage when the frame allows it. */
const memFilters={};
function restoreFilters(){const t=H.team&&H.team.Id;if(!t||P.view._team===t)return;P.view._team=t;let v=memFilters[t];if(!v){try{v=JSON.parse(localStorage.getItem(FKEY+t));}catch(_){}}MF.forEach(k=>{P.view[k]=v&&Array.isArray(v[k])?v[k].slice():[];});}
function saveFilters(){P.view.flag='';P.view.kpi='';const t=H.team&&H.team.Id;if(!t)return;const v={};MF.forEach(k=>{v[k]=P.view[k].slice();});memFilters[t]=v;try{localStorage.setItem(FKEY+t,JSON.stringify(v));}catch(_){}}
// Grid columns: chooser order = default order; the first GDEF are shown until the user picks their own (saved in this browser).
const GCOL={project:'Project',name:'Epic Name',ws:'Workstream',owners:'Epic Owner',engs:'Workstream Owner(s)',estimate:'Epic Est',days:'WS Est',line:'ATL/BTL',sprint:'Sprint',priority:'Priority',status:'Status',release:'Release',theme:'Theme',wstatus:'WS status',doc:'Doc',gus:'GUS',hrp:'HRP V2MOM method',v2mom:'CFS V2MOM',pmethod:'V2MOM method (project)'};
const GW={project:112,name:230,ws:200,owners:120,priority:84,estimate:84,status:116,engs:170,days:72,sprint:120,release:150,line:104,theme:130,wstatus:116,doc:150,gus:84,hrp:130,v2mom:130,pmethod:240,act:92};
const GDEF=['project','name','ws','owners','engs','days','estimate','line','priority','theme'],GKEY='pl-grid-cols';
let memCols; // in-memory source of truth: localStorage can be blocked inside the GUS Apps frame, so the session always works and storage is best-effort persistence
const gridCols=()=>{let v=memCols;if(v===undefined){try{v=JSON.parse(localStorage.getItem(GKEY));}catch(_){}}const keep=Array.isArray(v)?v.filter(k=>GCOL[k]):null;if(keep&&keep.length&&!keep.includes('priority')&&!memCols&&!localStorage.getItem(GKEY+'-pri')){keep.splice(Math.max(keep.indexOf('line')+1,keep.length),0,'priority');try{localStorage.setItem(GKEY+'-pri','1');localStorage.setItem(GKEY,JSON.stringify(keep));}catch(_){}}if(!keep||!keep.length)return GDEF.slice();const o=[...new Set(keep)],i=o.indexOf('estimate');if(i>=0&&o[i+1]==='days'){o[i]='days';o[i+1]='estimate';}return o;};
const setGridCols=l=>{memCols=l||null;try{if(l)localStorage.setItem(GKEY,JSON.stringify(l));else localStorage.removeItem(GKEY);}catch(_){}};
const priOpts=v=>{const n=v==null||v===''?0:Number(v),L=[0,1,2,3,4,5];if(!L.includes(n))L.push(n);return L.sort((a,b)=>a-b).map(x=>`<option value="${x}"${x===n?' selected':''}>P${x}</option>`).join('');};
const relNum=r=>{const m=String(r.name||'').match(/(\d+)\s*$/);return m?Number(m[1]):-1;};
// Drag a workstream (grip) within its epic or into another epic; Up/Down on the focused grip nudges it one place.
function moveWs(wid,toE,idx){
  const pl=P.plan;let w=null;
  for(const e of pl.epics){const k=e.workstreams.findIndex(x=>x.id===wid);if(k>=0){w=e.workstreams.splice(k,1)[0];break;}}
  const te=pl.epics.find(e=>e.id===toE);if(!w||!te)return false;
  te.workstreams.splice(idx==null||idx<0?te.workstreams.length:Math.min(idx,te.workstreams.length),0,w);return true;
}
function wireDrag(el){
  const clear=()=>el.querySelectorAll('.pl-dragging,.pl-drop-above,.pl-drop-below').forEach(x=>x.classList.remove('pl-dragging','pl-drop-above','pl-drop-below'));
  el.ondragstart=ev=>{const g=ev.target.closest&&ev.target.closest('[data-grip]');if(!g)return;const tr=g.closest('tr'),w=g.closest('[data-w]');P.drag={w:w.dataset.w};ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',w.dataset.w);try{ev.dataTransfer.setDragImage(tr,16,16);}catch(_){}tr.classList.add('pl-dragging');};
  el.ondragend=()=>{P.drag=null;clear();};
  el.ondragover=ev=>{if(!P.drag)return;const tr=ev.target.closest('.pl-grid tbody tr[data-e]');if(!tr)return;ev.preventDefault();ev.dataTransfer.dropEffect='move';const r=tr.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2;el.querySelectorAll('.pl-drop-above,.pl-drop-below').forEach(x=>x.classList.remove('pl-drop-above','pl-drop-below'));tr.classList.add(after?'pl-drop-below':'pl-drop-above');};
  el.ondrop=ev=>{if(!P.drag)return;const tr=ev.target.closest('.pl-grid tbody tr[data-e]');if(!tr)return;ev.preventDefault();
    const r=tr.getBoundingClientRect(),after=ev.clientY>r.top+r.height/2,wid=P.drag.w,toE=tr.dataset.e,ref=tr.dataset.wr;P.drag=null;
    if(ref===wid){clear();return;}
    const te=P.plan.epics.find(e=>e.id===toE);if(!te)return;
    // index in the target epic once the dragged row is out of it
    const rest=te.workstreams.filter(x=>x.id!==wid),at=ref?rest.findIndex(x=>x.id===ref):-1,idx=at<0?-1:at+(after?1:0);
    if(moveWs(wid,toE,idx)){draw();queueSave();}
  };
  el.onkeydown=ev=>{const g=ev.target.closest&&ev.target.closest('[data-grip]');if(!g||(ev.key!=='ArrowUp'&&ev.key!=='ArrowDown'))return;ev.preventDefault();
    const wid=g.closest('[data-w]').dataset.w,e=P.plan.epics.find(x=>x.workstreams.some(w=>w.id===wid));if(!e)return;
    const k=e.workstreams.findIndex(w=>w.id===wid),n=k+(ev.key==='ArrowUp'?-1:1);if(n<0||n>=e.workstreams.length)return;
    moveWs(wid,e.id,n);draw();queueSave();P.el.querySelector(`[data-w="${wid}"] [data-grip]`)?.focus();};
}
// "+ Project" / "+ Epic": a sectioned dialog that creates the record in GUS right away (any signed-in user).
const crField=(label,hint,ctl,cls)=>`<label class="pl-cr-f${cls?' '+cls:''}"><span>${label}${hint?` <small>${hint}</small>`:''}</span>${ctl}</label>`;
const crSection=(title,body)=>`<section class="pl-cr-s"><h3>${title}</h3><div class="pl-cr-g">${body}</div></section>`;
const crAuto=rows=>`<div class="pl-cr-auto" aria-label="Set automatically">${rows.map(([k,v])=>`<div title="${esc(k)}: ${esc(v)}"><i>${esc(k)}:</i> ${esc(v)}</div>`).join('')}</div>`;
/** The theme GUS gets on a workstream story, same rule as the backend: R<release>_<team short>_Workstream (e.g. R268_VC_Workstream). */
const wsTheme=relName=>{const n=String(H.team&&H.team.Name||''),sh=/message queue/i.test(n)?'MQ':/\bmaps\b|managed async/i.test(n)?'MAPS':/vegacache.*\bface\b/i.test(n)?'VC-FACE':/vegastore/i.test(n)?'VS':/vegacache|caching services/i.test(n)?'VC':'';if(!sh)return '(none: this team has no theme short form)';const r=(String(relName||'').match(/\d{3,}/)||['268'])[0];return `R${r}_${sh}_Workstream`;};
// Default Product Tag per team: the tag remembered in this browser, else the team's main tag (most used on its work in GUS).
const TEAM_TAG={'message queue':'Architecture Message Queue','caching services':'CaaS: Cache As A Service','managed async processing service (maps)':'MAPS'};
function defTag(tags,key){let v='';try{v=localStorage.getItem(key)||'';}catch(_){}
  if(v&&tags.some(t=>t.id===v))return v;
  const n=TEAM_TAG[String(H.team&&H.team.Name||'').toLowerCase()],t=n&&tags.find(x=>x.name===n);return t?t.id:'';}
function crDialog(title,sub,bodyHtml,okLabel,submit){
  const el=openModal(title,`<p class="pl-cr-sub">${esc(sub)}</p>${bodyHtml}<p class="pl-cr-err" role="alert" hidden></p><div class="pl-cr-foot"><span class="note">Created in GUS immediately when you confirm.</span><span class="pl-cr-btns"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" data-ok disabled>${esc(okLabel)}</button></span></div>`);
  el.querySelector('.nd-modal').classList.add('pl-cr');
  {const m=el.querySelector('.nd-modal'),x=m.querySelector('.nd-x'),b=document.createElement('button');b.type='button';b.className='nd-x pl-cr-expand';
    const set=on=>{m.classList.toggle('pl-cr-wide',on);b.textContent=on?'⤡':'⤢';b.title=b.ariaLabel=on?'Shrink dialog':'Expand dialog';b.setAttribute('aria-pressed',on);try{localStorage.setItem('ri-cr-wide',on?'1':'');}catch(_){}};
    b.onclick=()=>set(!m.classList.contains('pl-cr-wide'));x.before(b);let w=false;try{w=!!localStorage.getItem('ri-cr-wide');}catch(_){}set(w);}
  const ok=el.querySelector('[data-ok]'),err=el.querySelector('.pl-cr-err');
  const fail=m=>{err.textContent=m;err.hidden=!m;};
  let busy=false;
  const sync=()=>{ok.disabled=busy;let r=true;try{r=!el._ready||!!el._ready();}catch(_){}ok.classList.toggle('pl-ready',r);ok.classList.toggle('pl-notready',!r);};el._sync=sync;el._deny=()=>{};
  el.addEventListener('input',()=>sync());el.addEventListener('change',()=>sync());
  // Once the input is validated a handler calls detach(): the dialog disappears at once and the GUS calls and the plan save carry on in the background. If one of them fails the dialog comes back with the error and what was typed.
  let hidden=false;const detach=()=>{if(hidden)return;hidden=true;el.style.display='none';window.toast?.('Saving in the background…',false);};
  const go=async()=>{if(ok.disabled)return;fail('');busy=true;ok.textContent='Creating…';sync();
    try{await submit(el,fail,detach);}catch(e){if(hidden){hidden=false;el.style.display='';}fail(String(e&&e.message||e));if(el.isConnected===false)window.toast?.(String(e&&e.message||e),true);}finally{busy=false;ok.textContent=ok.dataset.label||okLabel;sync();hidden=false;}};
  ok.onclick=go;
  el.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.tagName==='INPUT'){ev.preventDefault();go();}});
  return el;
}
// Tree state: which project / epic rows are collapsed (per team, remembered in this browser).
const colKey=()=>'ri-collapse-'+(H.team&&H.team.Id);
const collapsed=()=>{const t=H.team&&H.team.Id;if(P.col&&P.colTeam===t)return P.col;let a=[];try{a=JSON.parse(localStorage.getItem(colKey()))||[];}catch(_){}P.colTeam=t;return P.col=new Set(a);};
const setCollapsed=(k,on)=>{const c=collapsed();if(on)c.add(k);else c.delete(k);try{localStorage.setItem(colKey(),JSON.stringify([...c]));}catch(_){}};
// Smart shortening for GUS name limits (Project and Epic names: 80). Applies the least lossy step first and stops as soon as the name fits.
const NAME_ABBR=[[/\binfrastructure\b/gi,'Infra'],[/\bconfiguration\b/gi,'Config'],[/\bapplications\b/gi,'Apps'],[/\bapplication\b/gi,'App'],[/\benvironments\b/gi,'Envs'],[/\benvironment\b/gi,'Env'],[/\bperformance\b/gi,'Perf'],[/\bdocumentation\b/gi,'Docs'],[/\bmanagement\b/gi,'Mgmt'],[/\bauthentication\b/gi,'Auth'],[/\bimplementation\b/gi,'Impl'],[/\bdevelopment\b/gi,'Dev'],[/\band\b/gi,'&'],[/\bwith\b/gi,'w/']];
function smartShorten(name,max){
  const tidy=x=>x.replace(/\s+([,:;)])/g,'$1').replace(/\s{2,}/g,' ').replace(/[\s,;:\-–—&/]+$/,'').trim();
  let s=tidy(String(name||''));if(s.length<=max)return s;
  // 1. "Advanced Cross Region Continuity (ACRC)" -> "ACRC" when the initials spell the acronym.
  for(let from=0;;){const re=/\s*\(([A-Z][A-Z0-9]{1,9})\)/g;re.lastIndex=from;const x=re.exec(s);if(!x)break;
    const ac=x[1],w=s.slice(0,x.index).split(' '),tail=w.slice(-ac.length);
    if(tail.length===ac.length&&tail.map(t=>t[0]).join('').toUpperCase()===ac){s=w.slice(0,-ac.length).concat(ac).join(' ')+s.slice(x.index+x[0].length);from=0;}else from=x.index+x[0].length;}
  s=tidy(s);if(s.length<=max)return s;
  // 2. Common abbreviations, applied one at a time.
  for(const [re,to] of NAME_ABBR){s=s.replace(re,to);if(s.length<=max)return tidy(s);}
  // 3. Remaining parentheticals, then a trailing "by Q3" style timing qualifier.
  s=tidy(s.replace(/\s*\([^)]*\)/g,''));if(s.length<=max)return s;
  s=tidy(s.replace(/\s+(?:by|in|before|until)\s+(?:Q[1-4]|FY\d{2,4}|H[12]|CY\d{2,4}|\d{4})(?:\s+\w+)?$/i,''));if(s.length<=max)return s;
  // 4. Cut at the last clause boundary that fits, else at a word boundary.
  let cut=-1;const re=/\s(?:for|to|by|in|on|across|so that|using)\s/gi;let m;
  while((m=re.exec(s))&&m.index<=max)cut=m.index;
  if(cut>=Math.min(20,max/2))return tidy(s.slice(0,cut));
  const t=s.slice(0,max-1),sp=t.lastIndexOf(' ');
  return tidy(sp>=max/2?t.slice(0,sp):t)+'…';
}
// Shows "Suggested (n/80): …  [Use suggestion]" in `box` while the field is over the limit. Call the returned function to refresh.
function fitSuggest(input,max,box,what){
  const upd=()=>{const v=input.value.trim(),L=v.length;if(L<=max){box.innerHTML='';return;}
    const sug=smartShorten(v,max);
    box.innerHTML=`${esc(what)} is ${L} characters; GUS allows at most ${max}. Suggested (${sug.length}/${max}): <b>${esc(sug)}</b>${sug?' <button type="button" class="button small" data-fit>Use suggestion</button>':''}`;
    const use=box.querySelector('[data-fit]');if(use)use.onclick=()=>{input.value=sug;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();};};
  input.addEventListener('input',upd);upd();return upd;
}
const crUser=()=>(P.user&&P.user.name)||'You (signed-in GUS user)';
function newProjectAt(){
  const pl=P.plan,methods=ioLists().methods,PGK='pl-prog-'+H.team.Id;let prog=P.refs.program,listing=P.refs.projects;
  let saved='';try{saved=localStorage.getItem(PGK)||'';}catch(_){}
  if(saved&&(!prog||saved.toLowerCase()!==prog.name.toLowerCase()))prog=null,listing=[];
  const inPlan=g=>pl.projects.some(x=>(g.id&&x.gusId===g.id)||x.name.toLowerCase()===g.name.toLowerCase());
  let avail=listing.filter(g=>!inPlan(g));
  const mode=`<div class="pl-cr-seg" role="tablist" aria-label="Project source"><button type="button" role="tab" data-mode="pick">Pick from GUS</button><button type="button" role="tab" data-mode="new">Enter new project</button></div>`;
  const body=
    crSection('Project',mode+
      crField('GUS program','type or pick the program; its projects are listed below',`<input class="hub-inline" type="text" list="pl-cr-progs" data-pg value="${esc(saved||(prog?prog.name:''))}" placeholder="e.g. Caching Services - 268" autocomplete="off"><datalist id="pl-cr-progs">${(P.refs.programs||[]).map(x=>`<option value="${esc(x.name)}"></option>`).join('')}</datalist>`,'wide')+`<p class="pl-cr-hint" data-pgmsg role="status">${prog?'':'No program was found for this team. Enter the GUS program name to list its projects.'}</p>`+
      crField('GUS project',`<span data-avn>${avail.length} not yet in this plan</span>`,`<select class="hub-inline" data-g>${avail.length?avail.map(g=>opt(g.id,g.name,false)).join(''):opt('','No projects found for this program',true)}</select>`,'wide pl-cr-pick')+
      crField('Measure name',`new project in GUS · <span data-ncnt>0 / ${PROJECT_NAME_MAX}</span>`,`<input class="hub-inline" type="text" data-n placeholder="e.g. M1.1.3: Baseline reliability" autocomplete="off">`,'wide pl-cr-new')+`<p class="pl-cr-fit pl-cr-new" data-fit role="status"></p>`+
      crField('Project Shortform','e.g. HRP M1.1.3',`<input class="hub-inline" type="text" data-s maxlength="60" placeholder="e.g. HRP M1.1.3">`,'wide')+`<p class="pl-cr-hint" data-hint hidden></p>`)+
    crSection('V2MOM',crField('V2MOM method','saved on the project in GUS',`<input class="hub-inline" type="text" list="pl-cr-methods" data-m maxlength="1000" placeholder="Pick an existing method or type a new one" autocomplete="off"><datalist id="pl-cr-methods">${methods.map(m=>`<option value="${esc(m)}"></option>`).join('')}</datalist>`,'wide'))+
    crAuto([['Team',H.team.Name],['Owner',crUser()]]);
  let md=avail.length?'pick':'new';
  const el=crDialog('Add project','Pick a project that already exists in GUS, or enter a new one. Either way it is shared with every team.',body,'Add project',async(el,fail,detach)=>{
    const sh=el.querySelector('[data-s]').value.trim(),method=el.querySelector('[data-m]').value.trim();let name,gusId='',r;
    if(md==='pick'){
      const g=avail.find(x=>x.id===el.querySelector('[data-g]').value);if(!g)throw new Error('Pick a project, or switch to “Enter new project”.');
      name=g.name;gusId=g.id;
      r={gusId:g.id,created:false,programId:g.programId,programName:g.programName};
      if(method&&method!==g.method)await call('plan-create-project',{teamId:H.team.Id,project:{name,method,gusId}}).catch(()=>{});
    }else{
      name=el.querySelector('[data-n]').value.trim();
      if(!name){el.querySelector('[data-n]').focus();throw new Error('Enter the measure (project) name.');}
      if(name.length>PROJECT_NAME_MAX){el.querySelector('[data-n]').focus();throw new Error(`Project name is ${name.length} characters; GUS allows at most ${PROJECT_NAME_MAX}. Use the suggestion or shorten it by ${name.length-PROJECT_NAME_MAX}.`);}
      const pn=el.querySelector('[data-pg]').value.trim();if(!prog&&!pn)throw new Error('Enter the GUS program first, so the project can be created in it.');
      detach();
      r=await call('plan-create-project',{teamId:H.team.Id,project:{name,method,programName:prog?prog.name:pn}});
    }
    let p=pl.projects.find(x=>x.gusId===r.gusId);
    if(!p){p={id:uid('p'),name,short:sh||shortProj(name),theme:'',gusId:r.gusId};pl.projects.push(p);}
    Object.assign(p,{name,short:sh||p.short||shortProj(name),method:method||p.method||'',gusId:r.gusId,programId:r.programId,programName:r.programName});
    if(!P.refs.projects.some(x=>x.id===r.gusId))P.refs.projects.push({id:r.gusId,name,programId:r.programId,programName:r.programName,method});
    closeModal();draw();queueSave();window.toast?.(r.created?`Created project “${name}” in GUS.`:`Added GUS project “${name}” to the plan.`,false);
  });
  const g=el.querySelector('[data-g]'),n=el.querySelector('[data-n]'),sh=el.querySelector('[data-s]'),m=el.querySelector('[data-m]'),hint=el.querySelector('[data-hint]'),ok=el.querySelector('[data-ok]');let shTouched=false;
  const known=new Map(P.refs.projects.map(x=>[x.name.toLowerCase(),x]));
  const ncnt=el.querySelector('[data-ncnt]'),fitBox=el.querySelector('[data-fit]');
  const fit=fitSuggest(n,PROJECT_NAME_MAX,fitBox,'Project name');
  const count=()=>{const L=n.value.trim().length;ncnt.textContent=`${L} / ${PROJECT_NAME_MAX}`;ncnt.classList.toggle('over',L>PROJECT_NAME_MAX);n.classList.toggle('bad',L>PROJECT_NAME_MAX);};
  n.addEventListener('input',count);
  const fillPick=()=>{const x=avail.find(a=>a.id===g.value);if(!x)return;if(!shTouched)sh.value=shortProj(x.name);m.value=x.method||m.value;};
  const setMode=k=>{md=k;sh.value='';m.value='';n.value='';shTouched=false;hint.hidden=true;fit();count();el._gate=k==='new';el._sync();el._deny();el.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===k;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
    el.querySelector('.pl-cr-pick').hidden=k!=='pick';el.querySelector('.pl-cr-new').hidden=k!=='new';ok.textContent=k==='pick'?'Add project':'Create in GUS';
    el.querySelector('.pl-cr-foot .note').textContent=k==='pick'?'Links the existing GUS project; nothing new is created.':'Created in GUS immediately when you confirm.';
    if(k==='pick')fillPick();(k==='pick'?g:n).focus();};
  el.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>setMode(b.dataset.mode);});
  const pg=el.querySelector('[data-pg]'),pgm=el.querySelector('[data-pgmsg]'),avn=el.querySelector('[data-avn]');let pgSeq=0;
  const paint=()=>{avail=listing.filter(x=>!inPlan(x));g.innerHTML=avail.length?avail.map(x=>opt(x.id,x.name,false)).join(''):opt('','No projects found for this program',true);if(g._cs)g._cs.sync();avn.textContent=`${avail.length} not yet in this plan`;if(md==='pick')fillPick();};
  pg.onchange=async()=>{const v=pg.value.trim(),seq=++pgSeq;
    if(!v){pgm.textContent='Enter the GUS program name to list its projects.';return;}
    pgm.textContent='Loading projects…';
    try{const r=await call('plan-program-projects',{teamId:H.team.Id,programName:v});if(seq!==pgSeq)return;
      if(!r.program){prog=null;listing=[];paint();pgm.textContent=`No GUS program named “${v}” was found. Check the spelling.`;return;}
      prog=r.program;listing=r.projects;pg.value=r.program.name;try{localStorage.setItem(PGK,r.program.name);}catch(_){}
      paint();pgm.textContent=`${r.projects.length} project${r.projects.length===1?'':'s'} in ${r.program.name}.`;
      if(md==='new'&&avail.length&&!n.value.trim())setMode('pick');
    }catch(err){if(seq===pgSeq)pgm.textContent='Could not load that program: '+(err&&err.message||err);}};
  // A datalist only lists options that match the text already in the box, so a filled-in program hid every other one: clear it on focus (restored if nothing is chosen) to show the full list.
  pg.onfocus=()=>{pg._prev=pg.value;pg.value='';pg.placeholder='Type to search programs, or pick one';};
  pg.onblur=()=>{if(!pg.value.trim()&&pg._prev){pg.value=pg._prev;}};
  el._ready=()=>md==='pick'?!!g.value:!!n.value.trim();el._sync();
  g.onchange=fillPick;sh.oninput=()=>{shTouched=true;};
  n.oninput=()=>{const v=n.value.trim(),hit=known.get(v.toLowerCase()),local=pl.projects.find(x=>x.name.toLowerCase()===v.toLowerCase());
    if(!shTouched)sh.value=(local&&local.short)||(v?shortProj(v):'');
    if(local&&local.method&&!m.value)m.value=local.method;
    hint.hidden=!hit&&!local;hint.textContent=hit||local?'This project already exists in GUS. It will be linked, not duplicated.':'';};
  setMode(md);
}
function newWorkstreamAt(epicId,afterWid){
  const pl=P.plan;if(!pl.epics.length){window.toast?.('Add an epic first, then add workstreams under it.',true);newEpicAt();return;}
  const prj=new Map(pl.projects.map(p=>[p.id,p])),eng=allMem().slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const tags=P.refs.tags||[],tagKey='ri-ws-tag-'+H.team.Id,lastTag=defTag(tags,tagKey);
  const body=
    crSection('Workstream',crField('Epic','workstream is added under this epic',`<select class="hub-inline" data-e>${pl.epics.map((e,i)=>opt(e.id,`${projShort(prj.get(e.projectId)||{name:''})} › ${e.name||'(unnamed epic)'}${e.gusId?'':'  (not in GUS yet)'}`,epicId?e.id===epicId:i===pl.epics.length-1)).join('')}</select>`,'wide')+crField('Workstream name','',`<input class="hub-inline" type="text" data-n maxlength="200" placeholder="e.g. API changes" autocomplete="off">`,'wide'))+
    crSection('Assignment',crField('Engineer','optional',`<select class="hub-inline" data-g><option value="">Unassigned</option>${eng.map(m=>opt(m.id,m.name,false)).join('')}</select>`)+crField('Planned effort','days',`<input class="hub-inline" type="number" min="0" max="1000" step="0.5" data-d placeholder="0">`))+
    `<section class="pl-cr-s" data-gussec><h3>GUS</h3><div class="pl-cr-g">`+
      `<label class="pl-cr-f wide pl-cr-chk"><input type="checkbox" data-gus checked><span>Also create the workstream in GUS as a parent User Story on the epic</span></label>`+
      (lastTag?`<div hidden>${crField('Product tag','required by GUS · pick one of the team\'s tags',`<select class="hub-inline" data-t><option value="">Select a tag…</option>${tags.map(t=>opt(t.id,t.name,t.id===lastTag)).join('')}</select>`,'wide')}</div>`:crField('Product tag','required by GUS · pick one of the team\'s tags',`<select class="hub-inline" data-t><option value="">Select a tag…</option>${tags.map(t=>opt(t.id,t.name,t.id===lastTag)).join('')}</select>`,'wide'))+
    `</div></section>`+
    `<div data-chips></div>`;
  const el=crDialog('New workstream','Adds a workstream under an epic. For an epic that is already in GUS it is also created there, so engineers can add their work items under it.',body,'Add workstream',async(el,fail,detach)=>{
    const e=pl.epics.find(x=>x.id===el.querySelector('[data-e]').value),name=el.querySelector('[data-n]').value.trim(),gid=el.querySelector('[data-g]').value,days=Number(el.querySelector('[data-d]').value)||0;
    if(!e)throw new Error('Choose the epic.');
    if(!name){el.querySelector('[data-n]').focus();throw new Error('Enter the workstream name.');}
    const m=eng.find(x=>x.id===gid),w={id:uid('w'),name,priority:0,engId:m?m.id:'',engName:m?m.name:'',engIds:m?[m.id]:[],engNames:m?[m.name]:[],days,sprint:'',line:e.line==='BTL'?'BTL':'ABL'};
    let msg=`Added workstream “${name}”.`,warn=false;
    if(useGus()){
      const tagId=el.querySelector('[data-t]').value;
      if(!tagId){tSel.focus();throw new Error('Select a product tag. GUS requires one on every user story.');}
      detach();
      const r=await call('plan-create-workstream',{teamId:H.team.Id,workstream:{epicGusId:e.gusId,name,assigneeId:gid,tagId,days,projectShort:projShort(prj.get(e.projectId)||{name:''})}});
      w.gusId=r.gusId;try{localStorage.setItem(tagKey,tagId);}catch(_){}
      msg=r.created?`Created workstream “${name}” in GUS.`:`Workstream “${name}” already existed in GUS and was linked.`;
      if(r.warnings&&r.warnings.length){warn=true;msg+=' Themes were not fully applied: '+r.warnings[0];}
    }
    const at=afterWid&&e.id===epicId?e.workstreams.findIndex(x=>x.id===afterWid):-1;
    if(at>=0)e.workstreams.splice(at+1,0,w);else e.workstreams.push(w); // + on a row inserts right below it; the order can still be changed with the grip
    setCollapsed('p:'+e.projectId,false);setCollapsed('e:'+e.id,false);closeModal();draw();P.el.querySelector(`[data-w="${w.id}"]`)?.scrollIntoView({block:'nearest'});
    const kept=await persistNow(e,prj.get(e.projectId)||{id:e.projectId,name:''});
    window.toast?.(kept?msg:msg+' It is in GUS, but saving the plan for other users failed: use Retry at the top of the table.',warn||!kept);
  });
  const eSel=el.querySelector('[data-e]'),chk=el.querySelector('[data-gus]'),nm=el.querySelector('[data-n]'),chips=el.querySelector('[data-chips]'),tSel=el.querySelector('[data-t]');
  const epicNow=()=>pl.epics.find(x=>x.id===eSel.value);
  const useGus=()=>!!(epicNow()&&epicNow().gusId&&chk.checked);
  const sync=()=>{const e=epicNow(),inGus=!!(e&&e.gusId);chk.disabled=!inGus;if(!inGus)chk.checked=false;tSel.disabled=!useGus();
    const ok=el.querySelector('[data-ok]'),note=el.querySelector('.pl-cr-foot .note');ok.dataset.label=ok.textContent=useGus()?'Create in GUS':'Add workstream';
    note.textContent=useGus()?'Created in GUS immediately when you confirm.':inGus?'Saved to the plan only.':'This epic is not in GUS yet, so the workstream is saved to the plan only.';
    el._gate=useGus();el._sync();el._deny();
    const pr=e&&prj.get(e.projectId),sh=pr?projShort(pr):'',n=nm.value.trim();
    chips.innerHTML=useGus()?crAuto([['Story type','User Story'],['Subject','WS: '+(n||'…')],['Theme',wsTheme(e&&e.releaseName)],['Parent','Epic']]):'';};
  el._ready=()=>!!eSel.value&&!!nm.value.trim();
  eSel.onchange=sync;chk.onchange=sync;nm.oninput=sync;
  sync();nm.focus();
}
// Opened from a project row: creates a new epic under that project (with its workstreams) or adds an existing GUS epic of that project.
function newEpicAt(pid){
  const pl=P.plan;if(!pl.projects.length){newProjectAt();return;}
  const pr=pl.projects.find(x=>x.id===pid)||pl.projects[pl.projects.length-1];
  const rel=P.refs.releases,prog=P.refs.program,tags=P.refs.tags||[],tagKey='ri-ws-tag-'+H.team.Id,lastTag=defTag(tags,tagKey);
  const lead=P.members.slice().sort((x,y)=>String(x.name).localeCompare(String(y.name))),eng=P.members.filter(isEng).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const atl=cls=>crField('ATL/BTL','',`<select class="hub-inline" data-l><option value="ABL" selected>ABL / ATL (above the line)</option><option value="BTL">BTL (below the line)</option></select>`,cls);
  const wsRow=()=>`<div class="pl-wsr"><input class="hub-inline" type="text" data-wn maxlength="200" placeholder="Workstream name" aria-label="Workstream name" autocomplete="off"><select class="hub-inline" data-we aria-label="Engineer"><option value="">Unassigned</option>${eng.map(m=>opt(m.id,m.name,false)).join('')}</select><input class="hub-inline" type="number" min="0" max="1000" step="0.5" data-wd placeholder="Days" aria-label="Planned days"><button type="button" class="pl-ib" data-wx aria-label="Remove workstream" title="Remove">×</button></div>`;
  const body=
    crSection('Epic',`<div class="pl-cr-seg" role="tablist" aria-label="Epic source"><button type="button" role="tab" data-mode="new">Create new epic</button><button type="button" role="tab" data-mode="pick">Add existing GUS epic</button></div>`+
      `<div class="pl-cr-pinfo s12"><b>Project</b> ${esc(projLabel(pr))}${pr.method?` · V2MOM: ${esc(pr.method)}`:''}${pr.gusId?'':' · new — created with the epic'}</div>`+
      crField('Find any GUS epic','<span data-fnote>W-number, epic Id / GUS link, or name</span>',`<span class="pl-cr-find"><input class="hub-inline" type="search" data-fq placeholder="e.g. W-12345678, a3Q… or part of the epic name" autocomplete="off" aria-label="Find a GUS epic"><button type="button" class="button" data-fgo>Search</button></span>`,'s12 pl-cr-pick')+
      crField('GUS epic','<span data-pcnt>loading…</span>',`<select class="hub-inline" data-xe><option value="">Loading epics from GUS…</option></select>`,'s9 pl-cr-pick')+
      atl('s3 pl-cr-pick').replace('data-l','data-xl')+
      crField('Priority','required',`<select class="hub-inline" data-xp required>${priOpts(0)}</select>`,'s3 pl-cr-pick')+
      `<span class="pl-cr-pinfo s12 pl-cr-pick" data-xi></span>`+
      crField('Epic name',`<span data-cnt>0 / ${EPIC_NAME_MAX}</span>`,`<textarea class="hub-inline" rows="2" data-n placeholder="Epic name" autocomplete="off"></textarea>`,'s9 pl-cr-new')+
      `<p class="pl-cr-fit s12 pl-cr-new" data-efit role="status"></p>`+
      atl('s3 pl-cr-new')+
      crField('Priority','required · P0 is highest',`<select class="hub-inline" data-pri required>${priOpts(0)}</select>`,'s3 pl-cr-new')+
      crField('Development lead','required · epic owner',`<select class="hub-inline" data-o><option value="" selected>Select a team member…</option>${lead.map(m=>opt(m.id,m.name,false)).join('')}</select>`,'s6 pl-cr-new')+
      crField('Planned release','',`<select class="hub-inline" data-r>${opt('','— None (set after planning) —',true)}${rel.map(r=>opt(r.id,r.name,false)).join('')}</select>`,'s6 pl-cr-new'))+
    crSection('Workstreams <small>optional · each is created in GUS as a story under the epic</small>',
      `<div class="pl-wsbox s12"><div data-wsrows>${wsRow()}</div><div class="pl-wsbar"><button type="button" class="button small" data-wadd>+ Add workstream</button>`+
      `<label class="pl-wstag" data-tagbox hidden>Product tag <small>required by GUS</small><select class="hub-inline" data-t><option value="">Select a tag…</option>${tags.map(t=>opt(t.id,t.name,t.id===lastTag)).join('')}</select></label></div></div>`)+
    `<div class="pl-cr-new">${crAuto([['Team',H.team.Name],['Program',prog?prog.name:'—'],['Epic owner','= Development lead']])}</div>`;
  let md='new',xeps=[];const made={epic:null,ws:new Map()};
  const flashRow=e=>{const row=P.el.querySelector(`[data-e="${e.id}"]`);if(row){row.scrollIntoView({block:'center'});row.classList.add('pl-flash');setTimeout(()=>row.classList.remove('pl-flash'),2600);}};
  const el=crDialog('Add epic','Create a new epic in GUS, or add an epic that already exists in GUS, under this project. Workstreams are optional.',body,'Create in GUS',async(el,fail,detach)=>{
    const rows=[...el.querySelectorAll('.pl-wsr')].map(r=>({r,name:r.querySelector('[data-wn]').value.trim(),engId:r.querySelector('[data-we]').value,days:Number(r.querySelector('[data-wd]').value)||0})).filter(x=>x.name),tagId=el.querySelector('[data-t]').value;
    if(rows.length&&!tagId){el.querySelector('[data-t]').focus();throw new Error('Select a product tag for the workstreams. GUS requires one on every story.');}
    let e=made.epic,msg='';
    if(!e){
      if(md==='pick'){
        const x=xeps.find(g=>g.id===el.querySelector('[data-xe]').value);if(!x)throw new Error('Pick a GUS epic, or switch to “Create new epic”.');
        if(pl.epics.some(g=>g.gusId===x.id))throw new Error('That epic is already in the table.');
        const line=el.querySelector('[data-xl]').value;e=newEpic(pr.id);e.name=x.name;e.gusId=x.id;e.foreign=!!(x.teamId&&String(x.teamId).slice(0,15)!==String(H.team.Id).slice(0,15));e.releaseId=x.releaseId;e.releaseName=x.releaseName;e.line=line;e.priority=x.priority!=null?x.priority:Number(el.querySelector('[data-xp]').value)||0;
        e.owners=x.leadId?[x.leadId]:[];e.ownerNames=x.leadId?[x.leadName]:[];
        // GUS keeps the epic's planned points; carry them as one workstream so the epic total (sum of workstreams) still matches and is never overwritten.
        e.workstreams=x.points>0?[{id:uid('w'),name:'Planned in GUS',priority:0,engId:'',engName:'',engIds:[],engNames:[],days:x.points,sprint:'',line}].map(w=>(w.priority=e.priority,w)):[];
        msg=`Added GUS epic “${x.name}” to the table.`;
      }else{
        const name=el.querySelector('[data-n].hub-inline').value.trim(),releaseId=el.querySelector('[data-r]').value,line=el.querySelector('[data-l]').value,leadId=el.querySelector('[data-o]').value,pri=el.querySelector('[data-pri]').value,leadName=(P.members.find(m=>m.id===leadId)||{}).name||'';
        if(!name){el.querySelector('[data-n]').focus();throw new Error('Enter the epic name.');}
        if(name.length>EPIC_NAME_MAX){el.querySelector('[data-n]').focus();throw new Error(`Epic name is ${name.length} characters; GUS allows at most ${EPIC_NAME_MAX}. Shorten it by ${name.length-EPIC_NAME_MAX}.`);}
        if(!leadId){el.querySelector('[data-o]').focus();throw new Error('Select the development lead.');}
        if(pri===''||!Number.isFinite(Number(pri))){el.querySelector('[data-pri]').focus();throw new Error('Select the epic priority.');}
        detach();
        const r=await call('plan-create-epic',{teamId:H.team.Id,epic:{name,releaseId,leadId,priority:Number(pri),project:{gusId:pr.gusId,name:pr.name,method:pr.method}}});
        pr.gusId=r.projectGusId||pr.gusId;
        const rr=rel.find(x=>x.id===releaseId);e=newEpic(pr.id);e.name=name;e.gusId=r.gusId;e.releaseId=rr?rr.id:'';e.releaseName=rr?rr.name:'';e.owners=[leadId];e.ownerNames=[leadName];e.line=line;e.priority=Number(pri);
        if(rows.length)e.workstreams=[];else e.workstreams.forEach(w=>{w.line=line;w.priority=e.priority;});
        msg=r.created?`Created epic “${name}” in GUS.`:`Epic “${name}” already existed in GUS and was linked.`;
      }
      if(!P.gsnap)snapGus();
      pl.epics.push(e);made.epic=e;P.gsnap.set(e.gusId,JSON.stringify(gusSnap(e)));
      if(filtersOn(P.view)){Object.assign(P.view,{q:'',tok:[],flag:'',release:[],line:[],eng:[],theme:[],col:{}});saveFilters();drawTools();}
      setCollapsed('p:'+pr.id,false);setCollapsed('e:'+e.id,false);draw();queueSave();flashRow(e);
    }
    // Workstreams: each becomes a parent story in GUS. A retry only creates the ones still missing.
    if(rows.length)detach();
    for(const x of rows){
      if(made.ws.has(x.r))continue;
      let r;
      try{r=await call('plan-create-workstream',{teamId:H.team.Id,workstream:{epicGusId:e.gusId,name:x.name,assigneeId:x.engId,tagId,days:x.days,projectShort:projShort(pr)}});}
      catch(err){throw new Error(`The epic is in the table, but workstream “${x.name}” was not created in GUS: ${String(err&&err.message||err)} Fix it and press the button again; workstreams already created are kept.`);}
      const m=eng.find(g=>g.id===x.engId),w={id:uid('w'),gusId:r.gusId,name:x.name,priority:e.priority==null?0:e.priority,engId:m?m.id:'',engName:m?m.name:'',engIds:m?[m.id]:[],engNames:m?[m.name]:[],days:x.days,sprint:'',line:e.line};
      e.workstreams.push(w);made.ws.set(x.r,w);if(r.warnings&&r.warnings.length)window.toast?.('Themes were not fully applied: '+r.warnings[0],true);
      try{localStorage.setItem(tagKey,tagId);}catch(_){}
    }
    closeModal();draw();flashRow(e);
    const kept=await persistNow(e,pr);
    window.toast?.(kept?(msg||`Added workstreams to “${e.name}”.`):`${msg||`Added workstreams to “${e.name}”.`} It is in GUS, but saving the plan for other users failed: use Retry at the top of the table.`,!kept);
  });
  el.querySelector('.nd-modal').classList.add('pl-cr-epic');
  const nm=el.querySelector('textarea[data-n]'),cnt=el.querySelector('[data-cnt]'),errEl=el.querySelector('.pl-cr-err');
  el._ready=()=>{const v=q=>{const x=el.querySelector(q);return x?String(x.value||'').trim():'';};
    if(md==='pick')return !!v('[data-xe]');
    const L=v('textarea[data-n]').length;return L>0&&L<=EPIC_NAME_MAX&&!!v('[data-o]')&&v('[data-pri]')!=='';};
  fitSuggest(nm,EPIC_NAME_MAX,el.querySelector('[data-efit]'),'Epic name');
  nm.oninput=()=>{const L=nm.value.trim().length,over=L>EPIC_NAME_MAX;cnt.textContent=`${L} / ${EPIC_NAME_MAX}`;cnt.classList.toggle('over',over);nm.classList.toggle('bad',over);errEl.textContent=over?`Epic name is ${L} characters; GUS allows at most ${EPIC_NAME_MAX}. Shorten it by ${L-EPIC_NAME_MAX}.`:'';errEl.hidden=!over;};
  const xSel=el.querySelector('[data-xe]'),xInfo=el.querySelector('[data-xi]'),pc=el.querySelector('[data-pcnt]'),okb=el.querySelector('[data-ok]'),note=el.querySelector('.pl-cr-foot .note'),wsr=el.querySelector('[data-wsrows]'),tagBox=el.querySelector('[data-tagbox]'),wsSec=wsr.closest('.pl-cr-s');
  const filled=()=>[...wsr.querySelectorAll('[data-wn]')].filter(i=>i.value.trim()).length;
  const sync=()=>{const f=filled();tagBox.hidden=!f||!!lastTag;el._gate=md==='new'||f>0;el._sync();el._deny();
    okb.dataset.label=okb.textContent=md==='pick'?(f?'Add epic & create workstreams':'Add epic'):'Create in GUS';
    note.textContent=md==='pick'?(f?'Adds the epic to this table and creates the workstreams in GUS.':'Adds the existing GUS epic to this table; nothing new is created.'):(f?`Creates the epic and ${f} workstream${f>1?'s':''} in GUS.`:'Created in GUS immediately when you confirm.');};
  const showX=()=>{const x=xeps.find(g=>g.id===xSel.value);xInfo.textContent=x?[x.teamId&&String(x.teamId).slice(0,15)!==String(H.team.Id).slice(0,15)&&`Epic of team ${x.teamName||'another team'}: only its project is changed; nothing else on it is edited`,x.projectId&&x.projectId!==pr.gusId&&`Currently in project “${x.projectName||x.projectId}” — will be tagged to this project when saved to GUS`,x.leadName&&'Lead: '+x.leadName,x.releaseName&&'Release: '+x.releaseName,x.points&&x.points+' days planned'].filter(Boolean).join('  ·  '):'';xInfo.title=xInfo.textContent;const fo=!!(x&&x.teamId&&String(x.teamId).slice(0,15)!==String(H.team.Id).slice(0,15));wsSec.hidden=md==='pick'&&fo;if(wsSec.hidden){wsr.querySelectorAll('input').forEach(i=>{i.value='';});sync();}};
  xSel.onchange=showX;
  // Search all of GUS (not just this project): by the W-number of a work item in the epic, an epic Id/link, or epic name. Results are added to the list and can be tagged to this project.
  const fq=el.querySelector('[data-fq]'),fnote=el.querySelector('[data-fnote]');let fseq=0;
  const xlabel=g=>g.name+(g.projectId===pr.gusId&&pr.gusId?'':` — ${g.projectName||'no project'}${g.teamName?' · '+g.teamName:''}`);
  const fill=(keep)=>{const inPlan=new Set(pl.epics.map(e=>e.gusId).filter(Boolean)),L=xeps.filter(g=>!inPlan.has(g.id));
    xSel.innerHTML=`<option value="">${L.length?'Select an epic…':'No epics found'}</option>`+L.map(g=>opt(g.id,xlabel(g),g.id===keep)).join('');showX();};
  const runFind=async()=>{const q=fq.value.trim(),my=++fseq;if(q.length<3){fnote.textContent='Type at least 3 characters.';return;}
    fnote.textContent='Searching GUS…';try{const r=await call('plan-find-epics',{teamId:H.team.Id,query:q});if(my!==fseq)return;
      const have=new Set(xeps.map(g=>g.id));(r.epics||[]).forEach(g=>{if(!have.has(g.id))xeps.push(g);});
      const inPlan=new Set(pl.epics.map(e=>e.gusId).filter(Boolean)),hits=(r.epics||[]).filter(g=>!inPlan.has(g.id));
      fnote.textContent=hits.length?`${hits.length} found${r.note?' · '+r.note:''}`:((r.epics||[]).length?'Already in the table':(r.note||'No epics found'));
      fill(hits[0]&&hits[0].id);if(hits.length===1)xSel.value=hits[0].id;showX();}
    catch(e){if(my===fseq)fnote.textContent=String(e&&e.message||e).slice(0,90);}};
  el.querySelector('[data-fgo]').onclick=runFind;fq.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();ev.stopPropagation();if(!ev.isComposing)runFind();}});
  const setMode=k=>{md=k;showX();
    el.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===k;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
    el.querySelectorAll('.pl-cr-new').forEach(n=>{n.hidden=k!=='new';});el.querySelectorAll('.pl-cr-pick').forEach(n=>{n.hidden=k!=='pick';});
    sync();(k==='pick'?xSel:el.querySelector('[data-n].hub-inline')).focus();};
  el.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>setMode(b.dataset.mode);});
  el.querySelector('[data-wadd]').onclick=()=>{if(wsr.children.length>=10)return;wsr.insertAdjacentHTML('beforeend',wsRow());wsr.lastElementChild.querySelector('input').focus();};
  wsr.addEventListener('input',sync);
  wsr.addEventListener('click',ev=>{const x=ev.target.closest('[data-wx]');if(!x)return;if(wsr.children.length>1)x.closest('.pl-wsr').remove();else{x.closest('.pl-wsr').querySelectorAll('input').forEach(i=>{i.value='';});}sync();});
  call('plan-gus-epics',{teamId:H.team.Id}).then(r=>{const inPlan=new Set(pl.epics.map(e=>e.gusId).filter(Boolean)),own=(r.epics||[]).filter(g=>!inPlan.has(g.id)&&pr.gusId&&g.projectId===pr.gusId),found=xeps.filter(g=>!own.some(o=>o.id===g.id));xeps=own.concat(found);const had=xSel.value;
    xSel.innerHTML=xeps.length?`<option value="">Select an epic…</option>`+xeps.map(g=>opt(g.id,g.name,false)).join(''):opt('',pr.gusId?'No other epics of this project — use Find above for any GUS epic':'Use Find above to add any GUS epic',true);
    if(found.length)fill(had);
    pc.textContent=`${xeps.length-found.length} of this project not yet in the table`;},e=>{xSel.innerHTML=opt('','Could not load GUS epics',true);pc.textContent=String(e&&e.message||e).slice(0,60);});
  setMode('new');
}
// ── Export template / import (xlsx) ────────────────────────────────────────
// Engineers for planning/allocation: non-leaders plus leaders the backend flags (Ram/Jayant on MQ & MAPS, Jayant on VegaCache).
/** Everyone on the team's GUS roster (leaders and people hidden from capacity too), sorted by name: used where a workstream owner is picked. */
const allMem=()=>P.members.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
const isEng=m=>!(P.plan&&(P.plan.hiddenEng||[]).includes(m.id))&&(H.leaderRank(m.name)<0||m.alloc||m.extra);
/** Engineers added from other CFS teams live in the plan (extraEng); mirror them into P.members so every picker and the capacity model see them. */
const syncExtraEng=()=>{if(!P.plan||!P.members)return;P.members=P.members.filter(m=>!m.extra);const have=new Map(P.members.map(m=>[m.id,m]));(P.plan.extraEng||[]).forEach(x=>{const m=have.get(x.id);if(m)m.alloc=true;else P.members.push({id:x.id,name:x.name,role:'Engineer',extra:true,alloc:true});});};
const IO_COLS=['Method Name (V2MOM Field in Project)','Measure Name (project in GUS)','Project (short form)','Epic Name','Workstream','Epic Owner','Workstream Owner(s)','WS Est (days)','ATL/BTL','Priority','Sprint','Planned Release'];
const IO_ROWS=300;
const projShort=p=>p.short||shortProj(p.name);
const EPIC_NAME_MAX=80; // ADM_Epic__c.Name length in GUS
const PROJECT_NAME_MAX=80; // PPM_Project__c.Name length in GUS
const projLabel=p=>{const sh=projShort(p),n=p.name||'';return !n||n===sh?sh:n.toLowerCase().startsWith(sh.toLowerCase())?n:sh+' — '+n;};
function ioLists(){
  const pl=P.plan,eng=P.members.filter(isEng).map(m=>m.name).sort();
  return {methods:[...new Set(pl.projects.map(p=>(p.method||'').trim()).filter(Boolean))].sort(),projects:pl.projects.map(projShort),releases:P.refs.releases.map(r=>r.name),eng,line:['ABL','BTL'],pri:[0,1,2,3,4,5].map(n=>'P'+n),status:STAT};
}
function exportTemplate(){
  const pl=P.plan,L=ioLists(),prj=new Map(pl.projects.map(p=>[p.id,p]));
  const rows=[IO_COLS.slice()];
  for(const e of pl.epics){
    const p=prj.get(e.projectId)||{},names=(e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)).filter(Boolean);
    const ws=e.workstreams.length?e.workstreams:[null];
    ws.forEach((w,j)=>{const f=j===0,wn=w?(w.engNames&&w.engNames.length?w.engNames:wsEngs(w).map(memName)).filter(Boolean):[];
      rows.push([f?(p.method||''):'',f?(p.name||''):'',projShort(p),e.name||'',w?w.name:'',f?names.join(', '):'',wn.join(', '),w&&w.days?w.days:'',w?wl(e,w):(f?e.line:''),f?'P'+(e.priority==null?0:e.priority):'',w?w.sprint:'',f?(e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||''):'']);});
  }
  const lcols=[['V2MOM Methods',L.methods],['Projects',L.projects],['Planned releases',L.releases],['Engineers',L.eng],['ATL/BTL',L.line],['Priority',L.pri]];
  const lrows=[lcols.map(c=>c[0])],lh=Math.max(...lcols.map(c=>c[1].length));
  for(let i=0;i<lh;i++)lrows.push(lcols.map(c=>c[1][i]==null?'':c[1][i]));
  const rng=(c,n)=>`Lists!$${c}$2:$${c}$${Math.max(2,n+1)}`,last=Math.max(rows.length+IO_ROWS,IO_ROWS);
  const V=(col,c,n,o)=>Object.assign({sqref:`${col}2:${col}${last}`,formula:rng(c,n)},o);
  const help=[['Release Planning template'],[''],['One row per workstream. Rows with the same Project + Epic Name belong to the same epic.'],['Epic-level columns (Epic Owner, ATL/BTL, Priority, Planned Release) are read from the first row that has a value for that epic. Method Name and Measure Name are read once per project.'],[''],
    ['Column','Expected value'],
    [IO_COLS[0],'The V2MOM method this project supports. Pick from the V2MOM Methods list or type a new one. Saved on the project (V2MOM Method field in GUS). Fill it once per project.'],[IO_COLS[1],'Full measure / project name as in GUS. Required only for a new project.'],[IO_COLS[2],'Short form such as HRP M1.1.3. Pick from the Lists sheet, or type a new one (then also fill Measure Name).'],[IO_COLS[3],'Required.'],[IO_COLS[4],'Workstream / feature name. Leave empty for an epic without workstreams.'],
    [IO_COLS[5],'Engineer names exactly as on the Engineers list; separate several with commas.'],[IO_COLS[6],'Same as Epic Owner.'],[IO_COLS[7],'Days, a number of 0 or more. The epic effort is calculated by the dashboard as the sum of its ATL (ABL) workstreams and saved to GUS as the epic Planned Effort; there is no epic effort column.'],
    [IO_COLS[8],'ABL (above the line, also accepted as ATL) or BTL. A BTL epic makes all its workstreams BTL. Only ABL work counts toward capacity and is saved to GUS.'],[IO_COLS[9],'P0 to P5 (a plain number also works).'],[IO_COLS[10],'Free text, e.g. a sprint name.'],[IO_COLS[11],'Optional: a planned release name from the Releases list. Blank keeps the current release (new epics get the default).'],
    [''],['Blank cells never overwrite what the plan already has for an existing epic or project. Older templates (with Epic Status, Theme, WS Status, Doc link, HRP/CFS V2MOM columns) can still be imported.'],
    [''],['Importing merges into the plan: an epic that already exists (same project and name) has its fields updated and its workstreams replaced by the rows in the file; epics that are not in the file are left alone.']];
  const bytes=PlanIO.write({sheets:[
    {name:'Plan',header:true,freeze:true,wrap:[0,1],rows,widths:[44,34,16,34,30,28,28,12,10,10,16,16],validations:[
      V('A','A',L.methods.length,{title:'V2MOM method',prompt:'Pick a V2MOM method, or type a new one. Saved on the project.',error:'Not in the V2MOM Methods list; it will be saved as typed.',warn:true}),
      V('C','B',L.projects.length,{title:'Project',prompt:'Pick a project short form, or type a new one.',error:'Not an existing project. A new project will be created if you also fill Measure Name.',warn:true}),
      V('F','D',L.eng.length,{title:'Owners',prompt:'Engineer name; separate several with commas.',error:'Use engineer names from the Engineers list (comma-separated for several).',warn:true}),
      V('G','D',L.eng.length,{title:'Owners',prompt:'Engineer name; separate several with commas.',error:'Use engineer names from the Engineers list (comma-separated for several).',warn:true}),
      V('I','E',2,{error:'Use ABL or BTL.'}),V('J','F',6,{error:'Use P0 to P5.'}),V('L','C',L.releases.length,{warn:true,error:'Not a known release name.'})]},
    {name:'Lists',header:true,rows:lrows,widths:[50,28,24,28,10,10]},
    {name:'Instructions',header:true,rows:help,widths:[40,110],wrap:[1]}]});
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.href=url;a.download=`release-plan-${(H.team.short||H.team.Name||'team').replace(/[^\w.-]+/g,'-')}-${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
// Parse + validate the rows of the Plan sheet. Returns {issues, epics, stats}; nothing is changed until applyImport.
function checkImport(sheet){
  const pl=P.plan,issues=[],add=(sev,row,msg)=>issues.push({sev,row,msg});
  const norm=x=>String(x==null?'':x).replace(/\s+/g,' ').trim().toLowerCase();
  const strip=x=>norm(x).replace(/\s*\(.*?\)\s*/g,' ').replace(/\s+/g,' ').trim();
  const ALIAS={proj:['project short form','project','short form'],pname:['measure name','measure','project name'],epic:['epic name','epic'],ws:['workstream','workstream name','feature'],eo:['epic owner','epic owners'],wo:['workstream owner','workstream owners','ws owner','ws owners'],days:['ws est','ws days','days','ws effort'],line:['atl/btl','abl/btl','atl btl','line'],sprint:['sprint'],pri:['priority'],stat:['epic status','status'],rel:['planned release','release'],theme:['theme'],wst:['ws status','workstream status'],doc:['doc link','doc'],hrp:['hrp v2mom method'],v2m:['cfs v2mom'],method:['method name','v2mom method','v2mom field in project','method']};
  // The header row is the first row (within the top 15) that has an Epic Name column; rows above it (titles, notes) are ignored.
  let hr=0;for(let i=0;i<Math.min(sheet.length,15);i++){if((sheet[i]||[]).some(c=>ALIAS.epic.includes(strip(c)))){hr=i;break;}}
  const head=(sheet[hr]||[]).map(strip);
  const ci={};for(const k of Object.keys(ALIAS))ci[k]=head.findIndex(h=>ALIAS[k].includes(h));
  if(ci.epic<0||ci.proj<0&&ci.pname<0){add('error',hr+1,'Header row not recognised. Use “Export template” and keep its column headers (Project, Epic Name, … ).');return {issues,epics:[],stats:{}};}
  const get=(r,k)=>ci[k]<0?'':String(r[ci[k]]==null?'':r[ci[k]]).trim();
  const projBy=new Map(),projects=[...pl.projects];
  const findProj=(sh,nm)=>projects.find(p=>(sh&&norm(projShort(p))===norm(sh))||(nm&&norm(p.name)===norm(nm)))||null;
  const members=P.members.filter(isEng),byName=new Map(members.map(m=>[norm(m.name),m]));
  const names=(txt,row,what)=>{const ids=[],nm=[];for(const part of String(txt||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean)){let m=byName.get(norm(part));if(!m){const q=norm(part),hits=members.filter(x=>norm(x.name).startsWith(q));if(q&&hits.length===1){m=hits[0];add('warn',row,`${what}: “${part}” was matched to ${m.name}.`);}}if(m){if(!ids.includes(m.id)){ids.push(m.id);nm.push(m.name);}}else add('error',row,`${what}: “${part}” is not an engineer on this team${(()=>{const q=norm(part).split(' ')[0]||'~',h=members.filter(x=>norm(x.name).includes(q));return h.length&&h.length<4?' (did you mean '+h.map(x=>x.name).join(' / ')+'?)':'';})()}.`);}return {ids,nm};};
  const groups=new Map(),newProj=new Map(),methods=new Map();
  let last=null,carried=0;
  for(let i=hr+1;i<sheet.length;i++){
    const r=sheet[i]||[],row=i+1;if(!r.some(c=>String(c==null?'':c).trim()))continue;
    let sh=get(r,'proj'),pn=get(r,'pname'),en=get(r,'epic');
    // Merged cells / blank repeats: a blank Epic Name or Project continues the epic above, so its workstream rows stay grouped.
    if(!en){
      const hasWs=get(r,'ws')||get(r,'days')||get(r,'wo')||get(r,'sprint');
      if(last&&hasWs&&((!sh&&!pn)||(sh&&sh===last.sh)||(pn&&pn===last.pn))){en=last.en;sh=last.sh;pn=last.pn;carried++;}
      else{add('error',row,last&&hasWs?'Epic Name is blank and the Project differs from the epic above; fill the Epic Name.':'Epic Name is required.');continue;}
    }else if(!sh&&!pn){
      if(last){sh=last.sh;pn=last.pn;carried++;}else{add('error',row,'Project is required (short form or measure name).');continue;}
    }
    last={sh,pn,en};
    let pr=findProj(sh,pn),pkey;
    if(pr)pkey=pr.id;else{
      const gh=P.refs.projects.find(x=>norm(x.name)===norm(pn));
      pkey='new:'+norm(sh||pn);
      if(!newProj.has(pkey)){
        if(!pn&&!gh){add('error',row,`New project “${sh}” needs a Measure name (project in GUS).`);}
        else{newProj.set(pkey,{id:uid('p'),name:pn||(gh&&gh.name)||sh,short:sh||shortProj(pn),theme:'',gusId:gh?gh.id:'',programId:gh&&gh.programId,programName:gh&&gh.programName});add('warn',row,`New project “${sh||pn}” will be created${gh?' (linked to the GUS project of the same name)':''}.`);}
      }
      if(!newProj.has(pkey))continue;
      pr=newProj.get(pkey);
    }
    const mv=get(r,'method');if(mv&&!methods.has(pr.id))methods.set(pr.id,mv.slice(0,1000));
    const key=pkey+'|'+norm(en);let g=groups.get(key);
    if(!g){g={pr,name:en,row,line:'',pri:null,status:'',rel:null,eo:null,ws:[]};groups.set(key,g);}
    const take=(f,v)=>{if(v===''||v==null)return;if(g[f]===''||g[f]==null)g[f]=v;else if(String(g[f])!==String(v))add('warn',row,`Epic “${en}”: ${f==='eo'?'Epic Owner':f==='rel'?'Planned Release':f==='pri'?'Priority':f==='line'?'ATL/BTL':'Status'} differs between rows; the first value (${f==='eo'?g.eo.nm.join(', '):f==='rel'?g.rel.name:f==='pri'?'P'+g.pri:g[f]}) is used.`);};
    const ln=get(r,'line').toUpperCase();let rowLine='';if(ln){if(ln==='ABL'||ln==='ATL')rowLine='ABL';else if(ln==='BTL')rowLine='BTL';else add('error',row,`ATL/BTL: “${get(r,'line')}” is not valid (use ABL or BTL).`);if(rowLine&&!g.line)g.line=rowLine;}
    let rowPri=null;const pv=get(r,'pri');if(pv){const m=/^p?\s*(\d{1,4})$/i.exec(pv);if(m){rowPri=Number(m[1]);g.pri=g.pri==null?rowPri:Math.min(g.pri,rowPri);}else add('error',row,`Priority: “${pv}” is not valid (use P0 to P5).`);}
    const eo=get(r,'eo');if(eo){const o=names(eo,row,'Epic Owner(s)');if(o.ids.length){if(!g.eo)g.eo={ids:[],nm:[]};o.ids.forEach((id,k)=>{if(!g.eo.ids.includes(id)){g.eo.ids.push(id);g.eo.nm.push(o.nm[k]);}});}}
    const sv=get(r,'stat');if(sv){const hit=STAT.find(x=>norm(x)===norm(sv));if(hit){if(!g.status)g.status=hit;}else add('error',row,`Epic Status: “${sv}” is not valid (use ${STAT.join(', ')}).`);}
    const rv=get(r,'rel');if(rv&&!g.rel){const hit=P.refs.releases.find(x=>norm(x.name)===norm(rv));if(hit)g.rel=hit;else add('warn',row,`Planned Release: “${rv}” is not a known release; it is ignored.`);}
    const dv=get(r,'doc');if(dv&&!g.doc){if(/^https?:\/\//i.test(dv))g.doc=dv;else add('warn',row,`Doc link: “${dv}” must start with http:// or https://; it is ignored.`);}
    [['theme','theme'],['hrp','hrp'],['v2m','v2mom']].forEach(([k,f])=>{const v=get(r,k);if(v&&!g[f])g[f]=v.slice(0,80);});
    let wsv='';const wv=get(r,'wst');if(wv){const hit=STAT.find(x=>norm(x)===norm(wv));if(hit)wsv=hit;else add('error',row,`WS Status: “${wv}” is not valid (use ${STAT.join(', ')}).`);}
    const wn=get(r,'ws'),wd=get(r,'days'),wo=get(r,'wo'),sp=get(r,'sprint');
    if(wn||wd||wo||sp){
      let d=0;if(wd!==''){d=Number(String(wd).replace(',','.').replace(/\s*d(ays?)?$/i,''));if(!isFinite(d)||d<0||d>5000){add('error',row,`WS Est: “${wd}” must be a number of days between 0 and 5000.`);d=0;}}
      if(!wn)add('warn',row,'Row has effort or owners but no Workstream name; it is imported as an unnamed workstream.');
      if(g.ws.some(x=>wn&&norm(x.name)===norm(wn)))add('warn',row,`Workstream “${wn}” appears twice in epic “${en}”.`);
      const o=names(wo,row,'Workstream Owner(s)');
      g.ws.push({name:wn,days:d,pri:rowPri,line:rowLine,sprint:sp,status:wsv,ids:o.ids,nm:o.nm});
    }
  }
  const epics=[...groups.values()];
  for(const g of epics){
    if(!g.line)add('warn',g.row,`Epic “${g.name}” has no ATL/BTL value; ${pl.epics.some(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name))?'its current value is kept':'it is imported as BTL'}.`);}
  if(!epics.length&&!issues.some(x=>x.sev==='error'))add('error',1,'No epic rows found in the file.');
  if(pl.epics.length+epics.filter(g=>!pl.epics.some(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name))).length>300)add('error',1,'The plan would exceed 300 epics.');
  if(epics.some(g=>g.ws.length>40))add('error',1,'An epic has more than 40 workstreams.');
  const isNew=g=>!pl.epics.some(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name));
  return {issues,epics,newProj,methods,stats:{epics:epics.length,created:epics.filter(isNew).length,updated:epics.filter(g=>!isNew(g)).length,ws:epics.reduce((a,g)=>a+g.ws.length,0),projects:newProj.size,carried,removed:pl.epics.filter(e=>!epics.some(g=>g.pr.id===e.projectId&&norm(g.name)===norm(e.name))).length,removedGus:pl.epics.filter(e=>e.gusId&&!epics.some(g=>g.pr.id===e.projectId&&norm(g.name)===norm(e.name))).length}};
}
function applyImport(res){
  // Clean import: the file is the source of truth. Epics not in the file are removed from the plan (epics already saved in GUS stay in GUS);
  // epics that match by project + name keep their GUS link, release and status; order follows the file.
  const pl=P.plan,norm=x=>String(x==null?'':x).replace(/\s+/g,' ').trim().toLowerCase(),prev=pl.epics.slice(),out=[];
  for(const p of res.newProj.values())pl.projects.push(p);
  for(const [id,m] of res.methods||[]){const p=pl.projects.find(x=>x.id===id);if(p)p.method=m;}
  for(const g of res.epics){
    let e=prev.find(x=>x.projectId===g.pr.id&&norm(x.name)===norm(g.name)&&!out.includes(x));
    if(!e){e=newEpic(g.pr.id);e.name=g.name;e.workstreams=[];}
    if(g.pri!=null)e.priority=g.pri;
    if(g.status)e.status=g.status;if(g.rel){e.releaseId=g.rel.id;e.releaseName=g.rel.name;}if(g.theme)e.theme=g.theme;if(g.doc)e.doc=g.doc;if(g.hrp)e.hrp=g.hrp;if(g.v2mom)e.v2mom=g.v2mom;
    e.owners=g.eo?g.eo.ids:[];e.ownerNames=g.eo?g.eo.nm:[];
    const base=g.line||e.line,old=e.workstreams;
    e.workstreams=g.ws.map(x=>{const o=old.find(w=>x.name&&norm(w.name)===norm(x.name));return Object.assign({},o||{},{id:o?o.id:uid('w'),name:x.name,priority:x.pri!=null?x.pri:(o?o.priority:0),days:x.days,line:x.line||base,sprint:x.sprint,status:x.status||(o&&o.status)||'',engIds:x.ids,engNames:x.nm,engId:x.ids[0]||'',engName:x.nm[0]||''});});
    e.line=base;deriveLine(e);out.push(e);
  }
  pl.epics=out;
  draw();queueSave();
  // Self-check: the plan must equal what the file said (workstream count and total days per epic).
  const bad=[];res.epics.forEach((g,i)=>{const e=out[i],sum=a=>Math.round(a.reduce((t,d)=>t+d,0)*100);if(!e||e.workstreams.length!==g.ws.length||sum(e.workstreams.map(w=>w.days))!==sum(g.ws.map(w=>w.days)))bad.push(g.name);});
  return bad;
}
function openImport(file,opener){
  PlanIO.read(file).then(book=>{
    const name=Object.keys(book).find(n=>/^plan$/i.test(n))||Object.keys(book)[0],res=checkImport(book[name]||[]);
    const errs=res.issues.filter(x=>x.sev==='error'),warns=res.issues.filter(x=>x.sev==='warn'),st=res.stats;
    const list=(a,t)=>a.length?`<h4>${t} (${a.length})</h4><ul class="pl-iss">${a.slice(0,80).map(x=>`<li><b>Row ${x.row}</b> ${esc(x.msg)}</li>`).join('')}${a.length>80?`<li>… and ${a.length-80} more</li>`:''}</ul>`:'';
    const sum=st.epics?`<p class="note">${st.epics} epic(s) and ${st.ws} workstream(s) in the file (${st.created} new, ${st.updated} matched to existing epics)${st.projects?` · ${st.projects} new project(s)`:''}${st.carried?` · ${st.carried} row(s) grouped under the epic above (blank Epic/Project cell)`:''}.</p><p class="pl-iss-bad">This is a clean import: ${st.removed} epic(s) currently in the plan that are not in the file will be removed${st.removedGus?` (${st.removedGus} already in GUS stay there; they are only dropped from this plan)`:''}.</p>`:'';
    const prev=res.epics.length?`<details class="pl-prev"><summary>Preview grouping (${res.epics.length} epics)</summary><ul class="pl-iss">${res.epics.slice(0,150).map(g=>`<li><b>${esc(projShort(g.pr))}</b> · ${esc(g.name)} <small>${g.line||'—'}${g.pri!=null?' · P'+g.pri:''}</small><ul>${g.ws.map(w=>`<li>${esc(w.name||'(unnamed)')} — ${fmt(w.days)}d${w.nm.length?' · '+esc(w.nm.join(', ')):''}${w.sprint?' · '+esc(w.sprint):''}</li>`).join('')||'<li>(no workstreams)</li>'}</ul></li>`).join('')}</ul></details>`:'';
    const el=openModal('Import release plan',`${sum}${errs.length?`<p class="pl-iss-bad">Fix ${errs.length} error(s) in the file and import again. Nothing was changed.</p>`:`<p class="pl-iss-ok">No errors found.${warns.length?' Review the warnings below, then import.':''}</p>`}${list(errs,'Errors')}${list(warns,'Warnings')}${prev}<div class="pl-iss-btns"><button type="button" class="button" data-close>${errs.length?'Close':'Cancel'}</button>${errs.length?'':'<button type="button" class="button primary" data-do-import>Replace plan with this file</button>'}</div>`,opener);
    const go=el.querySelector('[data-do-import]');if(go)go.onclick=()=>{const bad=applyImport(res);closeModal();P.state='dirty';flush().then(()=>window.toast?.(P.state==='saved'?`Imported ${st.epics} epic(s) and ${st.ws} workstream(s) and saved to the backend for the whole team.${bad.length?' Check the mismatched epics: '+bad.slice(0,3).join(', ')+'.':''}`:'Imported, but the plan could not be saved to the backend. Use Retry.',P.state!=='saved'));};
  }).catch(err=>openModal('Import release plan',`<p class="pl-iss-bad">${esc(err&&err.message||'The file could not be read.')}</p><div class="pl-iss-btns"><button type="button" class="button" data-close>Close</button></div>`,opener));
}
// Inline confirmation popover, shown just above the button that was clicked.
function confirmAt(btn,msg,onOk){
  document.querySelectorAll('.pl-confirm').forEach(x=>x.remove());
  const d=document.createElement('div');d.className='pl-confirm';d.setAttribute('role','alertdialog');d.setAttribute('aria-label',msg);
  d.innerHTML=`<p>${esc(msg)}</p><div><button type="button" class="button small" data-no>Cancel</button><button type="button" class="button small danger" data-yes>Delete</button></div>`;
  H.popHost().appendChild(d);
  const r=btn.getBoundingClientRect(),w=d.offsetWidth,h=d.offsetHeight;
  d.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';d.style.top=(r.top-h-8<8?r.bottom+8:r.top-h-8)+'px';
  const close=()=>{d.remove();document.removeEventListener('mousedown',away,true);document.removeEventListener('keydown',key,true);btn.focus();};
  const away=ev=>{if(!d.contains(ev.target))close();},key=ev=>{if(ev.key==='Escape'){ev.stopPropagation();close();}};
  d.querySelector('[data-no]').onclick=close;d.querySelector('[data-yes]').onclick=()=>{close();onOk();};
  document.addEventListener('mousedown',away,true);document.addEventListener('keydown',key,true);d.querySelector('[data-no]').focus();
}
const defRel=()=>{const r=P.refs.releases.reduce((b,x)=>!b||relNum(x)>relNum(b)?x:b,null);return r?{releaseId:r.id,releaseName:r.name}:{releaseId:'',releaseName:''};};
const newEpic=pid=>({id:uid('e'),projectId:pid,name:'',line:'BTL',priority:0,...defRel(),gusId:'',owners:[],ownerNames:[],workstreams:[{id:uid('w'),name:'',priority:0,engId:'',engName:'',engIds:[],engNames:[],days:0,sprint:''}]});
const prj0=e=>P.plan.projects.find(p=>p.id===e.projectId)||null;
const memName=id=>{const m=P.members.find(x=>x.id===id);if(m)return m.name;for(const e of (P.plan&&P.plan.epics)||[]){const i=(e.owners||[]).indexOf(id);if(i>=0&&e.ownerNames&&e.ownerNames[i])return e.ownerNames[i];}return '';}; // an owner who is not on the team roster keeps the name GUS gave
/** Epics already in the plan with no owner get their development lead (or GUS owner) from GUS, saved to the shared plan without writing back to GUS. */
async function fillLeads(){
  const pl=P.plan;if(!pl)return;const need=pl.epics.filter(e=>e.gusId&&!(e.owners&&e.owners.length)&&!e.foreign);if(!need.length)return;
  const my=P.seq,id=H.team.Id;
  try{const r=await call('plan-epic-leads',{teamId:id,ids:need.map(e=>e.gusId)});if(id!==H.team.Id||P.plan!==pl)return;
    let n=0;need.forEach(e=>{const l=r.leads&&r.leads[e.gusId];if(l){e.owners=[l.leadId];e.ownerNames=[l.leadName];n++;}});
    if(n){snapGus();draw();queueSave();}}catch(_){}
}
const wsEngs=w=>w.engIds&&w.engIds.length?w.engIds:(w.engId?[w.engId]:[]);
/** Who carries a workstream's days: its own engineers, else the epic's owners (two owners = half each). */
const wsNames=w=>wsEngs(w).map(id=>memName(id)||(id===w.engId?w.engName:'')||'Engineer');
const shortProj=n=>{n=n||'';if(/^[^:]{1,30}:/.test(n))return n.split(':')[0].trim();const m=n.match(/^(?:[A-Za-z]{2,6}\s+)?[A-Za-z]?\d+(?:\.\d+)+/);return m?m[0]:(n||'(unnamed project)');};
const msLabel=(ids,empty)=>{const n=ids.map(memName).filter(Boolean);return n.length?(n.length>1?`${n[0].split(' ')[0]} +${n.length-1}`:n[0]):empty;};
const msel=(f,ids,label,empty)=>{const mem=P.members.filter(isEng);
  return `<div class="cs ms" data-ms="${f}"><button type="button" class="cs-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${label}" title="${esc(ids.map(memName).join(', '))}"><span>${esc(msLabel(ids,empty))}</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5"/></svg></button></div>`;};
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const r2=n=>Math.round(n*100)/100,fmt=n=>String(r2(Number(n)||0));
const iso=d=>d.toISOString().slice(0,10);
const dmy=s=>{const d=new Date(s+'T00:00:00');return isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});};
const relLabel=r=>r.name+(r.start&&r.end?` — ${dmy(r.start)} → ${dmy(r.end)}`:r.start?` — from ${dmy(r.start)}`:' — no dates');
function fillRel(){const s=document.querySelector('#pl-rel'),w=P.plan.window,rs=(P.refs&&P.refs.releases)||[];if(!s)return;
  s.innerHTML=`<option value="">Custom dates</option>`+(w.releaseId&&!rs.some(x=>x.id===w.releaseId)?`<option value="${esc(w.releaseId)}" selected>Saved release — ${esc(dmy(w.start))} → ${esc(dmy(w.end))}</option>`:'')+rs.map(r=>`<option value="${esc(r.id)}"${r.id===w.releaseId?' selected':''}>${esc(relLabel(r))}</option>`).join('');
  document.querySelector('#pl-start').value=w.start;document.querySelector('#pl-end').value=w.end;
  const wn=document.querySelector('#pl-win');if(wn)wn.hidden=!!w.releaseId;}
function pickRel(id){const r=((P.refs&&P.refs.releases)||[]).find(x=>x.id===id);if(!P.plan)return;
  if(!r){P.plan.window.releaseId='';fillRel();queueSave();return;}
  if(!r.start||!r.end){window.toast?.('That planned release has no dates in GUS; enter the dates manually.',true);P.plan.window.releaseId='';fillRel();queueSave();return;}
  P.plan.window={start:r.start,end:r.end,releaseId:r.id};fillRel();drawSummary();queueSave();}
const emptyPlan=()=>{const s=new Date(),e=new Date(Date.now()+91*864e5);return {window:{start:iso(s),end:iso(e)},people:{},projects:[],epics:[],hiddenProjects:[],lastCommit:null};};

// ── Capacity model (pure, recomputed on every edit) ─────────────────────────
function workdays(start,end){
  if(!start||!end||start>end)return 0;
  const a=new Date(start+'T00:00:00Z'),b=new Date(end+'T00:00:00Z');let n=0;
  for(let d=a;d<=b;d=new Date(d.getTime()+864e5)){const w=d.getUTCDay();if(w&&w<6)n++;}
  return n;
}
const themeOf=pr=>(pr&&(pr.theme||(/^[^:]{1,30}:/.test(pr.name||'')?pr.name.split(':')[0].trim():'')))||'Unthemed';
// A workstream counts as ATL/ABL only when it is itself tagged ATL (and its epic is not BTL); everything else is BTL.
const wl=(e,w)=>e.line!=='BTL'&&w&&w.line==='ABL'?'ABL':'BTL';
const deriveLine=e=>{e.line=e.workstreams.some(w=>w.line==='ABL')?'ABL':'BTL';};
const epicDays=e=>r2(e.workstreams.filter(w=>wl(e,w)==='ABL').reduce((a,w)=>a+(w.days||0),0));
const epicTheme=e=>e.theme||themeOf((P.plan.projects.find(p=>p.id===e.projectId))||null);
const STAT=['Planned','In Progress','Completed','On Hold'];
const statOpts=v=>`<option value="">Status</option>`+STAT.map(x=>`<option value="${x}"${x===v?' selected':''}>${x}</option>`).join('');
const docOk=u=>/^https?:\/\//i.test(u||'');
/** One distinct colour per project (by its order in the plan), used for the left bar of its rows. */
const PROJ_PAL=['#e6194b','#3cb44b','#4363d8','#f58231','#911eb4','#00a6a6','#f032e6','#9a6324','#808000','#000075','#fabe0b','#008080','#7f3fbf','#ff6f91'];
const projColor=id=>{const i=P.plan.projects.findIndex(p=>p.id===id);return i<0?'#a8b7c7':i<PROJ_PAL.length?PROJ_PAL[i]:`hsl(${Math.round(i*137.508)%360} 70% 42%)`;};
function model(){
  const pl=P.plan,wd=workdays(pl.window.start,pl.window.end),prj=new Map(pl.projects.map(p=>[p.id,p]));
  const eng=new Map();
  const row=(id,name)=>{if(!eng.has(id))eng.set(id,{id,name,total:0,leave:0,holiday:0,oncall:0,avail:0,abl:0,btl:0,cap:true,th:new Map()});return eng.get(id);};
  for(const m of P.members)if(isEng(m)){const x=row(m.id,m.name),pp=pl.people[m.id]||{};x.leave=pp.leave||0;x.holiday=pp.holiday||0;x.oncall=pp.oncall||0;x.total=pp.total!=null?pp.total:wd;x.avail=Math.max(0,x.total-x.leave-x.holiday-x.oncall);}
  const themes=new Map(),pris=new Map();let ablT=0,btlT=0;
  for(const e of pl.epics){
    const slices=e.workstreams.filter(w=>(w.days||0)>0).map(w=>({ids:wsEngs(w),d:w.days,nm:w.engName,k:wl(e,w)==='ABL'?'abl':'btl'}));
    for(const {ids,d,nm,k} of slices){const share=d/(ids.length||1),t=epicTheme(e);
      for(const id of ids.length?ids:['']){const x=id?row(id,memName(id)||nm||'Engineer'):row('none','Unassigned');if(!id)x.cap=false;x[k]+=share;
        const tm=x.th.get(t)||x.th.set(t,{abl:0,btl:0,ep:new Map()}).get(t),ep=tm.ep.get(e.id)||tm.ep.set(e.id,{name:e.name||'Untitled epic',abl:0,btl:0}).get(e.id);tm[k]+=share;ep[k]+=share;}
      if(!themes.has(t))themes.set(t,{name:t,abl:0,btl:0});
      const pn=Math.max(0,Number(e.priority)||0);if(!pris.has(pn))pris.set(pn,{name:'P'+pn+(pn===0?' (highest)':''),n:pn,abl:0,btl:0});pris.get(pn)[k]+=d;
      if(k==='abl')ablT+=d;else btlT+=d;themes.get(t)[k]+=d;}
  }
  const rows=[...eng.values()],avail=rows.reduce((a,x)=>a+x.avail,0);
  return {wd,rows,avail,abl:r2(ablT),btl:r2(btlT),total:r2(ablT+btlT),themes:[...themes.values()].sort((a,b)=>(b.abl+b.btl)-(a.abl+a.btl)),pris:[...pris.values()].sort((a,b)=>a.n-b.n)};
}
// ── Release Planning Summary (read-only roll-up of the plan) ───────────────
const TCOL=['#f59e0b','#2f6fdd','#12b981','#9333ea','#06b6d4','#e11d74','#6366f1','#84cc16','#64748b'];
const PCOL={0:'#b3261e',1:'#e8890c',2:'#1b73b3',3:'#6b7f93',b:'#b8c4d2'};
const bucketOf=e=>e.line!=='ABL'?'b':Math.min(e.priority==null?0:Number(e.priority)||0,3);
function rpsModel(){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p])),B={0:0,1:0,2:0,3:0,b:0},T=new Map();let abl=0;
  for(const e of pl.epics){const d=epicDays(e),b=bucketOf(e);B[b]+=d;
    if(e.line==='ABL'){abl+=d;const t=epicTheme(e);if(!T.has(t))T.set(t,{name:t,days:0,epics:0});const x=T.get(t);x.days+=d;x.epics++;}}
  return {B,abl:r2(abl),themes:[...T.values()].sort((a,b)=>b.days-a.days)};
}
const pctOf=(n,d)=>d?Math.round(n/d*100):0;
function drawRps(){
  const el=P.el&&P.el.querySelector('#pl-rps');if(!el||!P.plan)return;
  const m=rpsModel(),{B}=m,tot=m.abl,col=i=>TCOL[i%TCOL.length];
  const card=(k,label,val,sub,colr)=>`<button type="button" class="pl-rk" data-rps="${k}" style="--c:${colr}">${icon(({abl:'flag',btl:'clock',total:'chart'})[k]||'stack',({abl:'green',btl:'amber',total:'violet'})[k]||'blue')}<span>${label}</span><b>${fmt(val)}<small> d</small></b><em>${sub}</em><i>Full screen →</i></button>`;
  const pl=P.plan,M=model(),epics=pl.epics,rn=e=>e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||'No planned release';
  const rm=new Map();epics.forEach(e=>{const k=rn(e);if(!rm.has(k))rm.set(k,{name:k,n:0,abl:0,btl:0});const x=rm.get(k);x.n++;x[e.line==='ABL'?'abl':'btl']+=epicDays(e);});
  const byRel=[...rm.values()].sort((a,b)=>b.n-a.n),sm=new Map();epics.forEach(e=>sm.set(e.status||'No status',(sm.get(e.status||'No status')||0)+1));const byStat=[...sm.entries()];
  const noOwner=epics.filter(e=>!(e.owners||[]).length).length,noRel=epics.filter(e=>!e.releaseId).length,unas=epics.reduce((a,e)=>a+e.workstreams.filter(w=>!wsEngs(w).length).length,0),inGus=epics.filter(e=>e.gusId).length,load=M.avail?Math.round(M.total/M.avail*100):0;
  const hm=[['Epics',epics.length],['ABL / BTL',epics.filter(e=>e.line==='ABL').length+' / '+epics.filter(e=>e.line!=='ABL').length],['In GUS / draft',inGus+' / '+(epics.length-inGus)],['Capacity used',load+'%',load>100?'bad':''],['No owner',noOwner,noOwner?'warn':''],['No release',noRel,noRel?'warn':''],['Unassigned workstreams',unas,unas?'warn':'']];
  const prjm=new Map(pl.projects.map(p=>[p.id,p])),saved=epics.filter(e=>e.gusId),lc=pl.lastCommit&&pl.lastCommit.at?new Date(pl.lastCommit.at).toLocaleString():'';
  const owners=e=>(e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)).filter(Boolean).join(', ')||'—';
  const savedHtml=`<section class="pl-card pl-saved"><h3>${icon('database','teal')} Saved epics <small>${saved.length} of ${epics.length} in GUS${lc?' · last saved '+esc(lc):''}</small></h3>${epics.length?`<table class="pl-rps-t"><thead><tr><th>Project</th><th>Epic</th><th>Release</th><th>ATL/BTL</th><th>GUS</th><th>Development Lead</th><th>Planned Story Points</th></tr></thead><tbody>${epics.map(e=>{const p=prjm.get(e.projectId)||{};return `<tr><td>${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">${esc(p.name||'project')} ↗</a>`:esc(p.name||'—')}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc(rn(e))}</td><td>${esc(e.line)}</td><td>${e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:'<em class="pl-draft">Not saved to GUS</em>'}</td><td>${esc(owners(e))}</td><td>${fmt(epicDays(e))}</td></tr>`;}).join('')}</tbody></table>`:'<p class="note">No epics yet.</p>'}</section>`;
  const pts=n=>fmt(n)+'p',ts=m.themes.filter(t=>t.days>0),tcol=n=>col(Math.max(0,m.themes.findIndex(t=>t.name===n)));
  const R=46,C=2*Math.PI*R;let off=0;
  const arcs=ts.map(t=>{const len=t.days/tot*C,a=`<circle class="pl-arc" data-rps="t:${esc(t.name)}" cx="60" cy="60" r="${R}" fill="none" stroke="${tcol(t.name)}" stroke-width="18" stroke-dasharray="${Math.max(0,len-1.2)} ${C-Math.max(0,len-1.2)}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"><title>${esc(t.name)}: ${pts(t.days)}</title></circle>`;off+=len;return a;}).join('');
  const donut=`<section class="pl-card pl-donut-card"><h3>${icon('chart','violet')} Theme Payload Distribution</h3><p class="note">Click slice or theme to open full screen view</p>${ts.length?`<div class="pl-donut"><svg viewBox="0 0 120 120" role="img" aria-label="Planned points by theme" style="stroke:none">${arcs}<text x="60" y="58" text-anchor="middle" class="pl-dn">${fmt(tot)}</text><text x="60" y="71" text-anchor="middle" class="pl-dl">PLANNED PTS</text></svg></div><h4 class="pl-sub">All themes (${ts.length})</h4><div class="pl-theme-leg">${ts.map(t=>`<button type="button" data-rps="t:${esc(t.name)}"><i style="background:${tcol(t.name)}"></i><span title="${esc(t.name)}">${esc(t.name)}</span><b>${pts(t.days)}</b></button>`).join('')}</div>`:'<p class="note">No above-the-line effort planned yet.</p>'}</section>`;
  const pl2=(k,label,val,c)=>`<button type="button" class="pl-plabel" data-rps="${k}" style="color:${c}">${label}: ${fmt(val)} Pts${k==='abl'||k==='btl'?'':` (${pctOf(val,tot)}%)`}</button>`;
  const seg=(b,l)=>B[b]>0?`<i style="width:${B[b]/((tot+B.b)||1)*100}%;background:${PCOL[b]}" title="${l}: ${fmt(B[b])} pts"></i>`:'';
  const prio=`<section class="pl-card pl-prio-card"><h3>${icon('flag','rose')} Priority &amp; Strategic Investment Breakdown</h3><p class="note">High-level resource commitment across release goals</p>
    <div class="pl-plabels">${pl2('p0','P0 Critical Path',B[0],PCOL[0])}${pl2('p1','P1 High',B[1],PCOL[1])}${pl2('p2','P2 Medium',B[2],'#7c3aed')}${pl2('p3','P3+ Low',B[3],PCOL[3])}${pl2('btl','BTL Effort',B.b,PCOL[3])}</div>
    <div class="pl-pbar">${seg(0,'P0')}${seg(1,'P1')}${seg(2,'P2')}${seg(3,'P3+')}${seg('b','BTL')}</div>
    <h4 class="pl-sub">Strategic themes portfolio (${ts.length} theme${ts.length===1?'':'s'}) <small>Click any card to open full screen view</small></h4>
    <div class="pl-tcards">${ts.map(t=>`<button type="button" class="pl-tcard" data-rps="t:${esc(t.name)}" style="--c:${tcol(t.name)}"><span class="pl-tc-h"><b>${esc(t.name)}</b><em>${pts(t.days)} (${pctOf(t.days,tot)}%)</em></span><span class="pl-tc-bar"><i style="width:${pctOf(t.days,tot)}%"></i></span><span class="pl-tc-f"><small>${t.epics} Epic${t.epics===1?'':'s'}</small><u>Open Full Screen ⤢</u></span></button>`).join('')||'<p class="note">No themes yet.</p>'}</div></section>`;
  const prank=e=>e.priority==null?0:Number(e.priority)||0,ablEpics=epics.filter(e=>e.line==='ABL').sort((a,b)=>prank(a)-prank(b)||epicTheme(a).localeCompare(epicTheme(b)));
  const ecard=e=>{const ws=e.workstreams,own=owners(e),th=epicTheme(e);
    return `<button type="button" class="pl-ecard" data-rps="e:${esc(e.id)}"><span class="pl-ec-top"><em class="pl-ec-th" style="--c:${tcol(th)}">${esc(th)}</em><span><em class="pl-ec-p">P${prank(e)}</em><em class="pl-ec-pts">${fmt(epicDays(e))} pts</em></span></span><b class="pl-ec-n">${esc(e.name||'(unnamed)')}</b>
    <span class="pl-ec-ws"><span class="pl-ec-wh"><small>WORKSTREAMS</small><small>${ws.length} ITEM${ws.length===1?'':'S'}</small></span>${ws.slice(0,2).map(w=>`<span class="pl-ec-w"><span>• ${esc(w.name||'(unnamed)')}</span><i>${fmt(w.days||0)}p</i></span>`).join('')}${ws.length>2?`<small class="pl-ec-more">+ ${ws.length-2} more workstreams…</small>`:''}${ws.length?'':'<small class="pl-ec-more">No workstreams yet</small>'}</span>
    <span class="pl-ec-f"><small>${own==='—'?'Unassigned':esc(own)}</small><u>Open Full Screen ⤢</u></span></button>`;};
  const execHtml=`<section class="pl-card pl-exec${P.open.exec===false?' collapsed':''}"><h3><button type="button" class="pl-fold" data-fold="exec" aria-expanded="${P.open.exec!==false}"><span aria-hidden="true">${P.open.exec===false?'▸':'▾'}</span> ${icon('board','amber')} Executive Epics Summary</button><small>${P.open.exec===false?'Expand':'Collapse'} Executive Overview</small></h3><p class="note">Showing ${ablEpics.length} epic${ablEpics.length===1?'':'s'} (above the line) · Click any epic to open full screen view</p>${P.open.exec===false?'':`<div class="pl-ecards">${ablEpics.map(ecard).join('')||'<p class="note">No above-the-line epics yet.</p>'}</div>`}</section>`;
  const health=`<section class="pl-card"><h3>${icon('health','green')} Planning health</h3><div class="pl-hm">${hm.map(([l,v,t])=>`<div class="${t||''}"><b>${v}</b><span>${l}</span></div>`).join('')}</div></section>`;
  const SC={'Planned':'#6b7f93','In Progress':'#1b73b3','Completed':'#2e844a','On Hold':'#c67b25'};
  const prog=e=>{const ws=e.workstreams;return ws.length?Math.round(ws.filter(w=>w.status==='Completed').length/ws.length*100):0;};
  const ring=n=>`<span class="pl-ring" style="--p:${n}" title="${n}% of workstreams completed"><b>${n}%</b></span>`;
  const brow=(e,i)=>{const pj=prjm.get(e.projectId)||{},own=owners(e),st=e.status||'Planned';
    return `<div class="pl-br" draggable="true" data-be="${esc(e.id)}" style="--pc:${projColor(e.projectId)}"><span class="pl-br-g" aria-hidden="true">⋮⋮</span><select class="pl-br-p" data-bpri="${esc(e.id)}" aria-label="Priority of ${esc(e.name||'epic')}">${priOpts(e.priority)}</select><span class="pl-br-n"><b title="${esc(e.name)}">${esc(e.name||'(unnamed epic)')}</b><small>${esc(epicTheme(e))}</small></span><span class="pl-br-r">${esc(rn(e))}</span><span class="pl-br-s" style="--c:${SC[st]||'#6b7f93'}">${esc(st)}</span>${ring(prog(e))}<span class="pl-br-d">${fmt(epicDays(e))}<i>d</i></span><span class="pl-br-o" title="${esc(own)}">${own==='—'?'<em>Unassigned</em>':esc(own)}</span><span class="pl-br-j" title="${esc(pj.name||'')}">${esc(pj.short||shortProj(pj.name||'')||'—')}</span></div>`;};
  const grp=(label,list)=>`<div class="pl-bg" data-bg="${label[0]}"><h4>${label} <small>${list.length}</small></h4>${list.map(brow).join('')||'<p class="note">Nothing here.</p>'}</div>`;
  const ord=l=>l.slice().sort((a,b)=>prank(a)-prank(b)||epics.indexOf(a)-epics.indexOf(b));
  const sm2=new Map();epics.forEach(e=>sm2.set(e.status||'Planned',(sm2.get(e.status||'Planned')||0)+1));const stc=[...sm2.entries()].map(([k,v])=>`<span class="pl-bl"><i style="background:${SC[k]||'#6b7f93'}"></i>${esc(k)} ${v}</span>`).join('');
  const boardHtml=`<section class="pl-card pl-board"><h3>${icon('board','teal')} Priority board <small>${epics.length} epics</small></h3><div class="pl-bl-row">${stc}</div><p class="note">Drag an epic onto another to take its priority and place, or change the priority in the list. Changes save automatically.</p><div class="pl-bh"><span></span><span>Priority</span><span>Epic</span><span>Planned release</span><span>Status</span><span>Progress</span><span>Effort</span><span>Owner</span><span>Project</span></div>${grp('Above the line (ABL)',ord(epics.filter(e=>e.line==='ABL')))}${grp('Below the line (BTL)',ord(epics.filter(e=>e.line!=='ABL')))}</section>`;
  // Executive view: one headline, then one section at a time (Overview is open by default) instead of a stack of collapsed cards.
  const RV=[['overview','Overview'],['board','Priority board',epics.length],['exec','Executive epics',ablEpics.length],['saved','Saved in GUS',saved.length+'/'+epics.length]];
  const rv=RV.some(x=>x[0]===P.rv)?P.rv:'overview',abl=epics.filter(e=>e.line==='ABL').length;
  const risks=[noOwner&&`${noOwner} epic${noOwner===1?'':'s'} without an owner`,noRel&&`${noRel} without a release`,unas&&`${unas} unassigned workstream${unas===1?'':'s'}`,load>100&&`capacity ${load}% used`].filter(Boolean);
  const headline=`<div class="pl-rv-head ${risks.length?'warn':'ok'}"><b>${epics.length} epic${epics.length===1?'':'s'}</b> planned (${abl} above the line), <b>${fmt(tot)} pts</b> across ${ts.length} theme${ts.length===1?'':'s'}. ${risks.length?'<b>Needs attention:</b> '+esc(risks.join(' · '))+'.':'No planning gaps found.'}</div>`;
  const nav=`<div class="pl-rv-nav" role="tablist" aria-label="Release summary view">${RV.map(([k,l,n])=>`<button type="button" role="tab" data-rv="${k}" aria-selected="${rv===k}">${l}${n!=null?` <small>${n}</small>`:''}</button>`).join('')}</div>`;
  const stripH=`<div class="pl-hm pl-hm-strip">${hm.map(([l,v,t])=>`<div class="${t||''}"><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  const bodies={overview:`${stripH}<div class="pl-rps-top">${donut}${prio}</div>`,board:boardHtml,exec:execHtml.replace(' collapsed','').replace(/<button type="button" class="pl-fold"[^>]*>.*?<\/span> (.*?)<\/button><small>.*?<\/small>/,'$1'),saved:savedHtml};
  el.innerHTML=headline+nav+`<div class="pl-rv-body">${bodies[rv]}</div>`;
  if(rv==='exec'&&P.open.exec===false){P.open.exec=true;}
  if(!el.dataset.board){el.dataset.board='1';let drag=null;
    const clr=()=>el.querySelectorAll('.pl-br-over').forEach(x=>x.classList.remove('pl-br-over'));
    el.addEventListener('dragstart',ev=>{const r=ev.target.closest&&ev.target.closest('.pl-br');if(!r)return;drag=r.dataset.be;ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',drag);r.classList.add('pl-br-drag');});
    el.addEventListener('dragend',()=>{drag=null;clr();el.querySelectorAll('.pl-br-drag').forEach(x=>x.classList.remove('pl-br-drag'));});
    el.addEventListener('dragover',ev=>{const r=ev.target.closest&&ev.target.closest('.pl-br');if(!drag||!r||r.dataset.be===drag)return;const d=findE(drag),t=findE(r.dataset.be);if(!d||!t||(d.line==='ABL')!==(t.line==='ABL'))return;ev.preventDefault();clr();r.classList.add('pl-br-over');});
    el.addEventListener('drop',ev=>{const r=ev.target.closest&&ev.target.closest('.pl-br');if(!drag||!r)return;ev.preventDefault();const d=findE(drag),t=findE(r.dataset.be);drag=null;clr();if(!d||!t||d===t||(d.line==='ABL')!==(t.line==='ABL'))return;
      d.priority=t.priority==null?0:t.priority;const a=P.plan.epics;a.splice(a.indexOf(d),1);a.splice(a.indexOf(t),0,d);queueSave();draw();});
    el.addEventListener('change',ev=>{const sel=ev.target.closest&&ev.target.closest('[data-bpri]');if(!sel)return;const e=findE(sel.dataset.bpri);if(!e)return;e.priority=Math.max(0,Math.round(Number(sel.value)||0));queueSave();draw();});}
}
function openRps(k,opener){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p]));let title,list;
  if(k.startsWith('e:')){const e=findE(k.slice(2));if(!e)return;
    openModal(e.name||'(unnamed epic)',`<p class="note">${esc(epicTheme(e))} · P${esc(e.priority==null?0:e.priority)} · ${esc(e.line)} · ${esc((prj.get(e.projectId)||{}).name||'—')} · ${fmt(epicDays(e))} pts</p><table class="pl-rps-t"><thead><tr><th>Workstream</th><th>Priority</th><th>Engineers</th><th>Sprint</th><th>Status</th><th>Days</th></tr></thead><tbody>${e.workstreams.map(w=>`<tr class="${w.flag==='new'?'pl-ws-new':w.flag==='changed'?'pl-ws-chg':''}"><td>${esc(w.name||'(unnamed)')}${w.flag==='new'?' <em class="pl-rv-tag new">New</em>':w.flag==='changed'?' <em class="pl-rv-tag upd">Changed</em>':''}</td><td>P${esc(w.priority==null?0:w.priority)}</td><td>${esc(wsNames(w).join(', ')||'—')}</td><td>${esc(w.sprint||'—')}</td><td>${esc(w.status||'—')}</td><td>${fmt(w.days||0)}</td></tr>`).join('')||'<tr><td colspan="6" class="note">No workstreams yet.</td></tr>'}</tbody></table>`,opener);return;}
  if(k==='abl'){title='Total payload (ABL)';list=pl.epics.filter(e=>e.line==='ABL');}
  else if(k==='btl'){title='BTL effort';list=pl.epics.filter(e=>e.line!=='ABL');}
  else if(k[0]==='p'){title=(k[1]==='3'?'P3+':'P'+k[1])+' epics';list=pl.epics.filter(e=>bucketOf(e)===Number(k[1]));}
  else{const t=k.slice(2);title='Theme: '+t;list=pl.epics.filter(e=>e.line==='ABL'&&epicTheme(e)===t);}
  list=[...list].sort((a,b)=>(a.priority==null?0:a.priority)-(b.priority==null?0:b.priority));
  const eng=e=>[...new Set(e.workstreams.flatMap(wsNames))].join(', ')||'—';
  openModal(title,list.length?`<table class="pl-rps-t"><thead><tr><th>P</th><th>Epic</th><th>Project</th><th>Release</th><th>ATL/BTL</th><th>Engineers</th><th>Days</th></tr></thead><tbody>${list.map(e=>`<tr><td>P${esc(e.priority==null?0:e.priority)}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc((prj.get(e.projectId)||{}).name||'—')}</td><td>${esc(e.releaseName||'—')}</td><td>${esc(e.line)}</td><td>${esc(eng(e))}</td><td>${fmt(epicDays(e))}</td></tr>`).join('')}</tbody></table>`:'<p class="note">No epics.</p>',opener);
}
function setTab(t){P.tab=t;const q=s=>P.el.querySelector(s);q('#pl-main').hidden=t!=='plan';q('#pl-rps').hidden=t!=='rps';P.el.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});if(t==='rps')drawRps();}
const tone=pct=>pct>100?'over':pct>85?'warn':'ok';

// ── Persistence ─────────────────────────────────────────────────────────────
const stateText=()=>({idle:'',dirty:'Saving…',saving:'Saving…',saved:'✓ Saved '+P.stateAt,conflict:'Someone else changed this plan. <button type="button" class="text-button" data-reload>Reload</button>',error:'Could not save. <button type="button" class="text-button" data-retry>Retry</button>'}[P.state]||'');
function setState(s){P.state=s;if(s==='saved')P.stateAt=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});const c=P.el&&P.el.querySelector('#pl-state');if(c){c.className='pl-state '+s;c.innerHTML=stateText();}}
// Auto-save: every edit is saved quietly in the background shortly after the last change, and a 2-minute heartbeat retries anything still unsaved.
const AUTOSAVE_MS=1500,HEARTBEAT_MS=120000;
function queueSave(){setState('dirty');clearTimeout(P.timer);P.timer=setTimeout(()=>{if(P.plan&&P.el&&P.el.isConnected)flush(true);},AUTOSAVE_MS);}
setInterval(()=>{if(P.plan&&P.el&&P.el.isConnected&&(P.state==='dirty'||P.state==='error'))flush(true);},HEARTBEAT_MS);
window.addEventListener('beforeunload',ev=>{if(P.state==='dirty'||P.state==='error'){ev.preventDefault();ev.returnValue='';}});
// Edits to epics that exist in GUS are written through to GUS after each plan save (administrators only).
const gusSnap=e=>({name:e.name||'',leadId:(e.owners&&e.owners[0])||'',releaseId:e.releaseId||'',effort:Math.round(e.workstreams.reduce((a,w)=>a+(Number(w.days)||0),0)*100)/100});
function snapGus(){P.gsnap=new Map((P.plan?P.plan.epics:[]).filter(e=>e.gusId).map(e=>[e.gusId,JSON.stringify(gusSnap(e))]));}
async function syncGus(){
  if(!P.plan||P.noGusSync)return;if(!P.gsnap)snapGus();
  const todo=P.plan.epics.filter(e=>e.gusId&&!e.foreign&&P.gsnap.get(e.gusId)!==JSON.stringify(gusSnap(e)));if(!todo.length)return;
  const sent=todo.map(e=>({e,s:gusSnap(e)}));
  try{
    const r=await call('plan-sync-epics',{teamId:H.team.Id,epics:sent.map(x=>({gusId:x.e.gusId,...x.s}))});
    let bad=0;r.results.forEach((x,i)=>{if(x.ok)P.gsnap.set(sent[i].e.gusId,JSON.stringify(sent[i].s));else{bad++;window.toast?.(`GUS did not update “${sent[i].e.name}”: ${x.err}`,true);P.gsnap.set(sent[i].e.gusId,JSON.stringify(sent[i].s));}});
    if(!bad&&sent.length)window.toast?.(`Updated ${sent.length} epic${sent.length>1?'s':''} in GUS.`,false);
  }catch(e){if(/restricted/i.test(e.message))P.noGusSync=true;else window.toast?.('GUS update failed: '+e.message,true);}
}
/** Save the plan to the shared backend right now (not after the autosave delay), so what was just created in GUS shows for every user of the team. If someone else saved first, add this epic to their latest plan and retry once. */
async function persistNow(epic,project){
  clearTimeout(P.timer);setState('dirty');
  await flush(true);
  if(P.state==='saved')return true;
  if(P.state!=='conflict')return false;
  try{
    const g=await call('plan-get',{teamId:H.team.Id}),sp=g.plan;
    if(!sp.epics.some(x=>x.id===epic.id||(x.gusId&&x.gusId===epic.gusId))){
      if(!sp.projects.some(x=>x.id===project.id))sp.projects.push(project);
      sp.epics.push(epic);
    }
    const r=await call('plan-save',{teamId:H.team.Id,plan:sp,revision:g.revision});
    P.plan=r.plan.window&&r.plan.window.start?r.plan:{...r.plan,window:emptyPlan().window};P.rev=r.revision;P.plan.epics.forEach(deriveLine);snapGus();draw();setState('saved');
    return true;
  }catch(_){setState('error');return false;}
}
async function flush(quiet){
  clearTimeout(P.timer);if(P.inflight)await P.inflight;if(P.state!=='dirty'&&P.state!=='error')return P.inflight;
  const my=P.seq;setState('saving');
  P.inflight=call('plan-save',{teamId:H.team.Id,plan:P.plan,revision:P.rev}).then(r=>{if(my!==P.seq)return;P.rev=r.revision;if(P.state==='saving')setState('saved');return syncGus();},e=>{if(my!==P.seq)return;setState(/changed/i.test(e.message)?'conflict':'error');if(!quiet)window.toast?.(e.message,true);});
  return P.inflight;
}

// ── Rendering ───────────────────────────────────────────────────────────────
const opt=(v,l,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(l)}</option>`;
const KPI_ACT={'Available':'all','ABL epics':'abl','BTL epics':'btl','Planned ABL':'abl','Planned BTL':'btl','Total planned':'all','Headroom (ABL)':'abl','Over capacity':'abl','Time off & on-call':'off','Over-allocated':'over','Unassigned effort':'unassigned','Incomplete epics':'incomplete','Pending GUS save':'pending'};
const KPI_HINT={all:'Show every epic',abl:'Show above-the-line work',btl:'Show below-the-line work',off:'Show epics worked by engineers with time off or on-call',over:'Show epics of over-allocated engineers',unassigned:'Show epics with workstreams that have days but no engineer',incomplete:'Show epics missing an owner or an estimate',pending:'Show ABL epics not yet saved to GUS'};
const kpi=(label,val,sub,cls='',ic='chart',tone='blue',chip='')=>{const a=KPI_ACT[label]||'';return `<div class="pl-kpi pl-t-${tone} ${cls}${a&&P.view.kpi===a?' pl-kpi-on':''}"${a?` data-kpi="${a}" role="button" tabindex="0" title="${KPI_HINT[a]} in the grid" aria-pressed="${P.view.kpi===a}"`:''}>${icon(ic,tone)}<div class="pl-kpi-b"><span>${esc(label)}</span><b>${val}</b><small title="${esc(String(sub).replace(/<[^>]*>/g,'').replace(/&(amp|lt|gt|quot|#39);/g,(m,k)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"})[k]))}">${sub}</small></div>${chip?`<em class="pl-chip">${esc(chip)}</em>`:''}</div>`;};
/** Rich hover card for an engineer's allocation: section chips, then their themes and epics. */
function engTipHtml(x){
  const av=x.avail,pc=d=>av?Math.round(d/av*100):0,pa=pc(x.abl),pb=pc(x.btl),pf=Math.max(0,100-pa-pb);
  const ths=[...x.th.entries()].sort((a,b)=>(b[1].abl+b[1].btl)-(a[1].abl+a[1].btl));
  const chip=(c,t)=>`<span class="pl-tc ${c}">${t}</span>`;
  const body=ths.length?ths.slice(0,6).map(([t,v],i)=>{const eps=[...v.ep.values()].sort((a,b)=>(b.abl+b.btl)-(a.abl+a.btl));
    return `<div class="pl-tt-th"><div class="pl-tt-thh"><i style="background:${TCOL[i%TCOL.length]}"></i><b>${esc(t)}</b><span>${fmt(r2(v.abl+v.btl))}d · ${eps.length} epic${eps.length===1?'':'s'}</span></div><ul>${eps.slice(0,5).map(e=>`<li><span>${esc(e.name)}</span>${e.abl?chip('a',`ABL ${fmt(r2(e.abl))}d`):''}${e.btl?chip('b',`BTL ${fmt(r2(e.btl))}d`):''}</li>`).join('')}${eps.length>5?`<li class="more">+${eps.length-5} more</li>`:''}</ul></div>`;}).join('')+(ths.length>6?`<p class="more">+${ths.length-6} more themes</p>`:''):'<p class="more">No epics assigned in this planning window.</p>';
  return `<div class="pl-tt-h"><b>${esc(x.name)}</b><span>${fmt(av)}d available of ${fmt(x.total)}d</span></div><div class="pl-tt-chips">${chip('a',`Prioritised (ABL) · ${fmt(r2(x.abl))}d · ${pa}%`)}${chip('b',`Planned, Not Priority (BTL) · ${fmt(r2(x.btl))}d · ${pb}%`)}${chip('f',`Unplanned · ${pf}%`)}${chip('t',`Total ${pa+pb+pf}%`)}</div>${body}`;
}
let ttEl=null;
document.addEventListener('mouseover',e=>{const h=e.target.closest&&e.target.closest('[data-tip-eng]');if(h)showTip(h);else if(ttEl&&!e.target.closest('.pl-tt'))hideTip();});
document.addEventListener('focusin',e=>{const h=e.target.closest&&e.target.closest('[data-tip-eng]');if(h)showTip(h);});
document.addEventListener('focusout',hideTip);document.addEventListener('keydown',e=>{if(e.key==='Escape')hideTip();});window.addEventListener('scroll',hideTip,true);
function hideTip(){if(ttEl){ttEl.remove();ttEl=null;}}
function showTip(host){
  const x=P.engRows&&P.engRows.find(r=>String(r.id)===host.dataset.tipEng);if(!x||!x.cap){return;}
  hideTip();ttEl=document.createElement('div');ttEl.className='pl-tt';ttEl.setAttribute('role','tooltip');ttEl.innerHTML=engTipHtml(x);H.popHost().appendChild(ttEl);
  const r=host.getBoundingClientRect(),w=ttEl.offsetWidth,h=ttEl.offsetHeight;
  let left=Math.min(Math.max(8,r.right-w),innerWidth-w-8),top=r.top-h-8;if(top<8)top=Math.min(r.bottom+8,innerHeight-h-8);
  ttEl.style.left=left+'px';ttEl.style.top=top+'px';
}
/** Extra planning-risk tiles: capacity lost to time off, engineers planned beyond availability, effort with no engineer, epics missing an owner or estimate. */
const extraKpis=m=>{const cap=m.rows.filter(x=>x.cap),sum=k=>r2(cap.reduce((a,x)=>a+(x[k]||0),0)),lost=r2(sum('leave')+sum('holiday')+sum('oncall')),
  over=cap.filter(x=>x.abl+x.btl>x.avail+0.001),un=m.rows.find(x=>!x.cap),unD=un?r2(un.abl+un.btl):0,
  inc=P.plan.epics.filter(e=>!(e.owners&&e.owners.length)||!e.workstreams.some(w=>(w.days||0)>0)),short=a=>a.slice(0,2).map(x=>esc(x.name.split(' ')[0])).join(', ')+(a.length>2?` +${a.length-2}`:'');
  return {off:kpi('Time off & on-call',fmt(lost)+'<i>d</i>',`${fmt(sum('leave'))} leave · ${fmt(sum('holiday'))} holidays · ${fmt(sum('oncall'))} on-call`,'','calendar','amber','RoB/KTLO'),
   over:kpi('Over-allocated',String(over.length)+'<i> eng</i>',over.length?`Planned beyond availability: ${short(over)}`:'Everyone is within availability',over.length?'over':'ok','users',over.length?'rose':'green',over.length?'Review':'Balanced'),
   un:kpi('Unassigned effort',fmt(unD)+'<i>d</i>',unD?'Workstreams with days but no engineer':'Every workstream has an engineer',unD?'warn':'ok','risk',unD?'amber':'green',unD?'Assign':'Covered'),
   inc:kpi('Incomplete epics',String(inc.length)+'<i> of '+P.plan.epics.length+'</i>',inc.length?'Missing an owner or an estimate':'All epics have an owner and an estimate',inc.length?'warn':'ok','scope',inc.length?'amber':'green',inc.length?'Fix':'Complete'),
   pend:(()=>{const abl=P.plan.epics.filter(e=>e.line==='ABL'),pend=abl.filter(e=>!e.gusId).length;
     return kpi('Pending GUS save',String(pend)+'<i> of '+abl.length+' ABL</i>',!abl.length?'No above-the-line epics yet':pend?`${pend} ABL epic${pend===1?'':'s'} not yet created in GUS`:'All ABL epics are saved in GUS',pend?'warn':'ok','database',pend?'amber':'green',!abl.length?'Plan':pend?'Review & save':'In sync');})()};};
/** A summary tile filters the grid below to the data behind it; clicking the active tile again clears the filter. */
function applyKpi(a){
  const V=P.view,cap=(P.engRows||[]).filter(x=>x.cap);
  if(V.kpi===a){Object.assign(V,{q:'',tok:[],release:[],line:[],eng:[],theme:[],col:{}});saveFilters();}
  else{
    let eng=[];
    if(a==='over')eng=cap.filter(x=>x.abl+x.btl>x.avail+0.001).map(x=>x.id);
    if(a==='off')eng=cap.filter(x=>(x.leave||0)+(x.holiday||0)+(x.oncall||0)>0).map(x=>x.id);
    if((a==='over'||a==='off')&&!eng.length){window.toast?.(a==='over'?'No engineers are over-allocated.':'No engineer has time off or on-call.',false);return;}
    Object.assign(V,{q:'',tok:[],release:[],line:a==='abl'?['ABL']:a==='btl'?['BTL']:[],eng,theme:[],col:{}});saveFilters();
    V.flag=['unassigned','incomplete','pending'].includes(a)?a:'';V.kpi=a;
  }
  drawSummary();drawTools();drawPlanner();wire();
  const g=P.el.querySelector('#pl-planner');if(g&&P.tab!=='rps')g.scrollIntoView({block:'nearest'});
}
// Epics are created in GUS when added and most edits sync automatically; this button creates ABL drafts (e.g. imported) and re-saves project, priority and description.
function syncCommitBtn(){const b=P.el&&P.el.querySelector('#pl-commit');if(!b||!P.plan)return;const n=P.plan.epics.filter(e=>!e.gusId&&e.line==='ABL').length;b.hidden=false;b.textContent=n?`Create ${n} draft${n===1?'':'s'} in GUS`:'Review & save to GUS';if(!b.disabled)b.title=n?'':'Re-save project, priority and description changes to GUS';}
function drawSummary(){
  syncCommitBtn();
  if(P.tab==='rps')drawRps();
  const el=P.el&&P.el.querySelector('#pl-sum');if(!el)return;
  const m=model();P.engRows=m.rows;const pctA=m.avail?Math.round(m.abl/m.avail*100):0,pctT=m.avail?Math.round(m.total/m.avail*100):0,head=r2(m.avail-m.abl);
  const maxT=Math.max(1,...m.themes.map(t=>t.abl+t.btl)),maxP=Math.max(1,...m.pris.map(t=>t.abl+t.btl));
  const x=extraKpis(m),E=P.plan.epics,nA=E.filter(e=>e.line==='ABL').length,nB=E.length-nA,free=Math.max(0,r2(m.avail-m.total)),eng=m.rows.filter(r=>r.cap).length,saved=E.filter(e=>e.gusId).length,open=P.open.kpis,
    grp=(t,cl,tiles)=>`<div class="pl-kg ${cl}"><h4>${t}</h4><div class="pl-kpis">${tiles}</div></div>`;
  const kpiBox=`<section class="pl-kbox${open?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="kpis" aria-expanded="${open}"><span aria-hidden="true">${open?'▾':'▸'}</span> Planning metrics</button><span class="pl-kbrief"><b>${fmt(m.abl)}d</b> ABL · <b>${fmt(m.btl)}d</b> BTL · <b>${fmt(free)}d</b> unplanned · <b>${pctT}%</b> of ${fmt(m.avail)}d used</span><small>${open?'Collapse':'Expand'}</small></h3>${open?`<div class="pl-kgs">`
    +grp('Planned','pk',kpi('Planned ABL',fmt(m.abl)+'<i>d</i>',`${pctA}% of available`,tone(pctA),'flag','green','ABL '+pctA+'%')+kpi('Planned BTL',fmt(m.btl)+'<i>d</i>','stretch work below the line','','clock','amber','BTL')+kpi('Total planned',fmt(m.total)+'<i>d</i>',`${pctT}% of available`,tone(pctT),'chart','violet',pctT+'% used')+kpi('ABL epics',String(nA),'above the line','','scope','green')+kpi('BTL epics',String(nB),'below the line','','scope','amber'))
    +grp('Unplanned','uk',kpi('Unplanned capacity',fmt(free)+'<i>d</i>','available but not planned yet','','users','blue')+kpi(head<0?'Over capacity':'Headroom (ABL)',fmt(Math.abs(head))+'<i>d</i>',head<0?'ABL exceeds what the team can deliver':'available after ABL',head<0?'over':'ok',head<0?'risk':'bolt',head<0?'rose':'teal',head<0?'Over':'On track')+x.un+x.over)
    +grp('Capacity &amp; delivery','ok2',kpi('Available',fmt(m.avail)+'<i>d</i>',`${m.wd} working days × ${eng} engineers, less leaves, holidays and on-call`,'','users','blue',m.wd+' working days')+x.off+x.inc+x.pend+kpi('Saved in GUS',String(saved)+'<i> of '+E.length+'</i>','epics already in GUS','','database','blue'))
    +`</div>`:''}</section>`;
  el.innerHTML=kpiBox+`
  <div class="pl-sum-grid"><section class="pl-card${P.open.theme?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="theme" aria-expanded="${P.open.theme}"><span aria-hidden="true">${P.open.theme?'▾':'▸'}</span> ${icon('chart','violet')} ${P.sumBy==='pri'?'By priority':'By theme / method'}</button>${P.open.theme?`<span class="pl-sumby" role="group" aria-label="Break down planned days by"><button type="button" data-sumby="theme" aria-pressed="${P.sumBy!=='pri'}">Theme / method</button><button type="button" data-sumby="pri" aria-pressed="${P.sumBy==='pri'}">Priority</button></span>`:''}<small>${P.open.theme?'Collapse':'Expand'}</small></h3>${(P.sumBy==='pri'?m.pris:m.themes).length?(P.sumBy==='pri'?m.pris:m.themes).map(t=>{const mx=P.sumBy==='pri'?maxP:maxT;return `<div class="pl-bar-row"><span class="pl-bar-l" title="${esc(t.name)}">${esc(t.name)}</span><div class="pl-bar"><i class="abl" style="width:${t.abl/mx*100}%"></i><i class="btl" style="width:${t.btl/mx*100}%"></i></div><span class="pl-bar-v">${fmt(t.abl)}<small> ABL</small> · ${fmt(t.btl)}<small> BTL</small></span></div>`;}).join(''):'<p class="note">Add effort to workstreams to see the split.</p>'}<p class="pl-legend"><i class="abl"></i>ABL <i class="btl"></i>BTL</p></section>
  <section class="pl-card${P.open.eng?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="eng" aria-expanded="${P.open.eng}"><span aria-hidden="true">${P.open.eng?'▾':'▸'}</span> ${icon('users','blue')} Engineer bandwidth</button><small>${P.open.eng?'Collapse':'Expand'}</small></h3><div class="pl-eng" role="table" aria-label="Engineer bandwidth"><div class="pl-eng-h" role="row"><span>Engineer</span><span class="b">Total</span><span>Leave</span><span>Holidays</span><span>On-call</span><span class="b">Available</span><span class="b">Prioritised (ABL)</span><span title="Planned, Not Priority (BTL)">Not Priority (BTL)</span><span class="pl-alloc-h">Allocation % <small><i class="a"></i>Prioritised (ABL) <i class="b"></i>Planned, Not Priority (BTL) <i class="f"></i>Unplanned</small></span></div>${m.rows.length?m.rows.map(x=>{const pct=x.avail?Math.round((x.abl+x.btl)/x.avail*100):((x.abl+x.btl)?999:0),pa=x.avail?Math.round(x.abl/x.avail*100):0,pb=x.avail?Math.round(x.btl/x.avail*100):0,pf=Math.max(0,100-pa-pb),sa=Math.min(pa,100),sb=Math.max(0,Math.min(pb,100-sa));
    return `<div class="pl-eng-r${x.cap?'':' pl-eng-un'}${!x.cap&&P.view.kpi==='unassigned'?' pl-eng-un-on':''}" role="row"${x.cap?'':' data-kpi="unassigned" tabindex="0" title="Show epics with unassigned workstream effort"'}><span class="pl-eng-n" title="${esc(x.name)}">${H.avatarHtml?H.avatarHtml(x.id,x.name,22):''}<span>${esc(x.name)}</span></span><span class="b">${x.cap?fmt(x.total):'—'}</span><span>${x.cap?fmt(x.leave||0):'—'}</span><span>${x.cap?fmt(x.holiday||0):'—'}</span><span>${x.cap?fmt(x.oncall||0):'—'}</span><span class="b">${x.cap?fmt(x.avail):'—'}</span><span class="b">${fmt(x.abl)}</span><span>${fmt(x.btl)}</span><span class="pl-alloc ${x.cap?tone(pct):'over'}" tabindex="0" data-tip-eng="${esc(x.id)}" aria-label="${x.cap?`${esc(x.name)}: Prioritised (ABL) ${fmt(x.abl)}d = ${pa}%, Planned, Not Priority (BTL) ${fmt(x.btl)}d = ${pb}%, Unplanned ${pf}%, of ${fmt(x.avail)}d available`:'No availability set'}">${x.cap?`<span class="pl-alloc-bar"><i class="a" style="width:${sa}%"></i><i class="b" style="width:${sb}%"></i></span><b><em class="a">${pa}%</em> + <em class="b">${pb}%</em> + <em class="f">${pf}%</em> = <strong>${pa+pb+pf>=999?'—':(pa+pb+pf)+'%'}</strong></b>`:'<b>unassigned</b>'}</span></div>`;}).join(''):'<p class="note">No team members loaded.</p>'}${(()=>{const cr=m.rows.filter(x=>x.cap&&x.avail),av=cr.reduce((t,x)=>t+x.avail,0),ta=cr.reduce((t,x)=>t+x.abl,0),tb=cr.reduce((t,x)=>t+x.btl,0);if(!av)return '';const qa=Math.round(ta/av*100),qb=Math.round(tb/av*100),qf=Math.max(0,100-qa-qb);return `<div class="pl-eng-r pl-eng-tot" role="row"><span class="pl-eng-n">Team total</span><span class="b">${fmt(cr.reduce((t,x)=>t+x.total,0))}</span><span>${fmt(cr.reduce((t,x)=>t+(x.leave||0),0))}</span><span>${fmt(cr.reduce((t,x)=>t+(x.holiday||0),0))}</span><span>${fmt(cr.reduce((t,x)=>t+(x.oncall||0),0))}</span><span class="b">${fmt(av)}</span><span class="b">${fmt(ta)}</span><span>${fmt(tb)}</span><span class="pl-alloc ${tone(qa+qb)}"><span class="pl-alloc-bar"><i class="a" style="width:${Math.min(qa,100)}%"></i><i class="b" style="width:${Math.max(0,Math.min(qb,100-qa))}%"></i></span><b><em class="a">${qa}%</em> + <em class="b">${qb}%</em> + <em class="f">${qf}%</em> = <strong>${qa+qb+qf}%</strong></b></span></div>`;})()}</div></section></div>`;
}
function drawPlanner(){
  const el=P.el.querySelector('#pl-planner'),pl=P.plan,rel=P.refs.releases;
  const projOpts=sel=>pl.projects.map(p=>opt(p.id,p.name||'(unnamed project)',p.id===sel)).join('');
  const engOpts=sel=>'<option value="">Unassigned</option>'+allMem().map(m=>opt(m.id,m.name,m.id===sel)).join('');
  const V=P.view,prj=new Map(pl.projects.map(p=>[p.id,p])),q=(/^\s*([a-z0-9]+)\s*:/i.exec(V.q)&&SA[/^\s*([a-z0-9]+)/i.exec(V.q)[1].toLowerCase()]?'':V.q.trim().toLowerCase()),colF=Object.entries(V.col||{}).filter(([k,v])=>v&&v.trim()&&gridCols().includes(k)).map(([k,v])=>[k,v.trim().toLowerCase()]),filtering=!!(q||colF.length||V.flag||V.tok.length||MF.some(k=>V[k].length));
  const FLAG={unassigned:e=>e.workstreams.some(w=>(w.days||0)>0&&!wsEngs(w).length),incomplete:e=>!(e.owners&&e.owners.length)||!e.workstreams.some(w=>(w.days||0)>0),pending:e=>e.line==='ABL'&&!e.gusId};
  const match=e=>{const p=prj.get(e.projectId);
    if(V.flag&&FLAG[V.flag]&&!FLAG[V.flag](e))return false;
    if(V.release.length&&!V.release.includes(e.releaseId))return false;if(V.line.length&&!(e.workstreams.length?e.workstreams.some(w=>V.line.includes(wl(e,w))):V.line.includes(e.line)))return false;
    if(V.eng.length&&!e.workstreams.some(w=>wsEngs(w).some(i=>V.eng.includes(i))))return false;if(V.theme.length&&!V.theme.includes(epicTheme(e)))return false;
    if(!tokOk(e,p))return false;
    if(colF.some(([k,t])=>!colText(k,e,p).includes(t)))return false;
    if(q&&!((e.name||'')+' '+(p&&p.name||'')+' '+e.workstreams.map(w=>w.name).join(' ')).toLowerCase().includes(q))return false;return true;};
  const tokOk=(e,p)=>{const by={};V.tok.forEach(t=>(by[t.k]=by[t.k]||[]).push(t));return Object.keys(by).every(k=>{const vs=skVals(k,e,p).map(x=>String(x).toLowerCase());return by[k].some(t=>{const v=t.v.toLowerCase();return t.x?vs.includes(v):vs.some(x=>x.includes(v));});});};
  const shown=pl.epics.filter(match);
  const cnt=P.el.querySelector('#pl-count');if(cnt)cnt.textContent=filtering?`${shown.length} of ${pl.epics.length} epics${V.flag?' · '+({unassigned:'unassigned effort',incomplete:'incomplete',pending:'pending GUS save'})[V.flag]:''}`:`${pl.epics.length} epic${pl.epics.length===1?'':'s'}`;
  const gsum=es=>{const d=l=>fmt(es.filter(e=>e.line===l).reduce((a,e)=>a+epicDays(e),0));return `<span class="pl-gsum"><i>${es.length} epic${es.length===1?'':'s'}</i><i class="abl">ABL ${d('ABL')}d</i><i class="btl">BTL ${d('BTL')}d</i></span>`;};
  const cols=gridCols();
  const gridHtml=()=>{
    const sel=(f,html,lbl)=>`<select class="sp-select pl-g" aria-label="${lbl}" data-f="${f}">${html}</select>`;
    const rows=[],fold=collapsed();
    const emit=e=>{
      const cE=fold.has('e:'+e.id)&&e.workstreams.length>0;
      const ws=cE?[null]:(e.workstreams.length?e.workstreams:[null]);
      ws.forEach((w,j)=>{
        const first=j===0,tail=j===ws.length-1;
        const txt=(f,v,ph,max,w2)=>`<input class="hub-inline" type="text" aria-label="${esc(ph)}" data-f="${f}" value="${esc(v||'')}" maxlength="${max}" placeholder="${esc(ph)}" style="width:${w2}px">`;
        const tdE=(k,h)=>first?`<td class="c-${k}">${h}</td>`:`<td class="c-${k}"></td>`,tdW=(k,h)=>w?`<td class="c-${k}" data-w="${esc(w.id)}">${h}</td>`:`<td class="c-${k}"></td>`;
        const C={
          project:()=>tdE('project',sel('projectId',pl.projects.map(p=>`<option value="${esc(p.id)}" data-short="${esc(p.short||shortProj(p.name))}"${p.id===e.projectId?' selected':''}>${esc(p.name||'(unnamed project)')}</option>`).join(''),'Project')),
          name:()=>tdE('name',`${e.workstreams.length?`<button type="button" class="pl-caret" data-fold-row="e:${esc(e.id)}" aria-expanded="${!cE}" aria-label="${cE?'Expand':'Collapse'} workstreams" title="${cE?'Show':'Hide'} workstreams">${cE?'▸':'▾'}</button>`:''}<input class="hub-inline" type="text" aria-label="Epic name" data-f="name" value="${esc(e.name)}" maxlength="${EPIC_NAME_MAX}" placeholder="Epic name">${e.gusId?`<a class="pl-open-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener" title="Open this epic in GUS" aria-label="Open epic ${esc(e.name)} in GUS"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3h6v6M17 3l-8 8M14 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>`:''}`),
          ws:()=>cE?tdE('ws',`<span class="pl-wscount">${e.workstreams.length} workstream${e.workstreams.length===1?'':'s'} · ${fmt(e.workstreams.reduce((a,x)=>a+(x.days||0),0))}d</span>`):tdW('ws',`<input class="hub-inline" type="text" aria-label="Workstream" data-f="name" value="${esc(w&&w.name)}" maxlength="120" placeholder="Workstream">`),
          owners:()=>tdE('owners',msel('owners',e.owners||[],'Epic owners','Owners')),
          priority:()=>tdE('priority',sel('priority',priOpts(e.priority),'Epic priority')),
          estimate:()=>tdE('estimate',`<output class="pl-days pl-ro" data-eff aria-label="Epic effort (sum of workstream effort, ATL only)" title="Sum of workstream effort. Counted only when the epic is ABL (above the line); saved to GUS as Planned Story Points.">${epicDays(e)?fmt(epicDays(e)):'0'}</output>`),
          status:()=>tdE('status',sel('status',statOpts(e.status),'Epic status')),
          engs:()=>tdW('engs',msel('engIds',w?wsEngs(w):[],'Engineers','Unassigned')),
          days:()=>tdW('days',`<input class="hub-inline pl-days ${w&&w.days?'pl-eff-set':'pl-eff-empty'}" type="number" min="0" max="1000" step="0.5" aria-label="Effort in days" data-f="days" value="${w&&w.days?fmt(w.days):''}" placeholder="Days">`),
          sprint:()=>tdW('sprint',`<input class="hub-inline" type="text" list="pl-sprints" aria-label="Tentative sprint" data-f="sprint" value="${esc(w&&w.sprint)}" maxlength="60" placeholder="Sprint">`),
          release:()=>tdE('release',sel('releaseId',`<option value="">Planned release…</option>${rel.map(r=>opt(r.id,r.name,r.id===e.releaseId)).join('')}${e.releaseId&&!rel.some(r=>r.id===e.releaseId)?opt(e.releaseId,e.releaseName||e.releaseId,true):''}`,'Planned release')),
          line:()=>{const ln=wl(e,w),btn=v=>`<button type="button" class="${ln===v?'on '+v.toLowerCase():''}" data-line="${v}" aria-pressed="${ln===v}">${v}</button>`,h=`<span class="pl-line" role="group" aria-label="ATL/BTL for this ${w?'workstream':'epic'}">${btn('ABL')}${btn('BTL')}</span>`;return w?tdW('line',h):tdE('line',h);},
          theme:()=>tdE('theme',txt('theme',e.theme,themeOf(prj0(e)),80,110)),
          wstatus:()=>tdW('wstatus',sel('status',statOpts(w&&w.status),'Workstream status')),
          doc:()=>tdE('doc',txt('doc',e.doc,'Doc link',300,120)+(docOk(e.doc)?` <a href="${esc(e.doc)}" target="_blank" rel="noopener" aria-label="Open doc">↗</a>`:'')),
          gus:()=>tdE('gus',e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">Draft</em>'),
          hrp:()=>tdE('hrp',txt('hrp',e.hrp,'HRP method',80,90)),
          v2mom:()=>tdE('v2mom',txt('v2mom',e.v2mom,'CFS V2MOM',80,80)),
          pmethod:()=>{const m=(prj0(e)||{}).method||'';return tdE('pmethod',`<span class="pl-pm" title="${esc(m)}">${esc(m||'—')}</span>`);}
        };
        const ep=cols.map(k=>C[k]()).join(''),wc='';
        const ico=d=>`<svg viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`,ib=(cls,attr,lbl,d,on)=>`<button type="button" class="pl-ib ${cls}${on?'':' pl-ib-off'}" ${on?attr:'tabindex="-1" disabled'} aria-label="${lbl}" title="${lbl}">${ico(d)}</button>`;
        const act=`<td class="pl-g-act"><span class="pl-acts"${w?` data-w="${esc(w.id)}"`:''}>${w?`<button type="button" class="pl-ib pl-grip" draggable="true" data-grip aria-label="Move workstream: drag within this epic or into another epic (or press Up/Down)" title="Drag to move this workstream, within this epic or into another">${ico('<g fill="currentColor" stroke="none"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></g>')}</button>`:ib('pl-grip','','',' ',false)}${ib('pl-add','data-add-ws','Add workstream below this one','<path d="M10 4v12M4 10h12"/>',true)}${ib('pl-rm','data-del-ws','Remove workstream','<circle cx="10" cy="10" r="7"/><path d="M6.8 10h6.4"/>',!!w)}${ib('pl-trash','data-del-epic','Delete epic','<path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6M8.5 9v4M11.5 9v4"/>',first)}</span></td>`;
        rows.push(`<tr data-e="${esc(e.id)}"${w?` data-wr="${esc(w.id)}"`:''} style="--pc:${projColor(e.projectId)}" class="${wl(e,w)==='ABL'?'abl':'btl'}${first?' pl-g-first':''}">${ep}${wc}${act}</tr>`);
      });
    };
    const byP=new Map(pl.projects.map(p=>[p.id,[]]));
    shown.forEach(e=>{if(!byP.has(e.projectId))byP.set(e.projectId,[]);byP.get(e.projectId).push(e);});
    const projRow=(pid,es,open)=>{const p=prj.get(pid);return `<tr class="pl-g-proj" data-p="${esc(pid)}" style="--pc:${projColor(pid)}"><td colspan="${cols.length+1}"><div class="pl-pj-bar"><div class="pl-pj-l"><button type="button" class="pl-caret" data-fold-row="p:${esc(pid)}" aria-expanded="${open}" aria-label="${open?'Collapse':'Expand'} project" title="${open?'Collapse':'Expand'}">${open?'▾':'▸'}</button><span class="pl-pj-t"><b class="pl-pj-n" title="${esc(p?p.name:'')}">${esc(p?projLabel(p):'(no project)')}</b>${p&&p.gusId?`<a class="pl-open-gus pl-open-inline" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener" title="Open this project in GUS" aria-label="Open project ${esc(p.name)} in GUS"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3h6v6M17 3l-8 8M14 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg></a>`:''}${p&&p.method?`<button type="button" class="pl-pj-mt" data-m-toggle="${esc(pid)}" aria-expanded="${P.mOpen.has(pid)}" title="V2MOM method: ${esc(p.method)}">V2MOM ${P.mOpen.has(pid)?'▾':'▸'}</button>${P.mOpen.has(pid)?`<span class="pl-pj-m" title="${esc(p.method)}">${esc(p.method)}</span>`:''}`:''}</span></div><div class="pl-pj-r">${gsum(es)}${p?`<button type="button" class="button small pl-pj-add" data-proj-add-epic>+ Epic</button>`:''}${p?`<button type="button" class="button small pl-pj-del" data-proj-del aria-label="Delete project" title="Delete project">🗑</button>`:''}</div></div></td></tr>`;};
    // A project search alone also lists matching projects that have no epics yet.
    const pOnly=pid=>!q&&!V.flag&&!V.tok.length&&!MF.some(k=>V[k].length)&&colF.length>0&&colF.every(([k])=>k==='project')&&colText('project',{workstreams:[]},prj.get(pid)).includes(colF[0][1]);
    const GROUPS={priority:'Priority',line:'ATL/BTL',theme:'Theme',wsowner:'Workstream owner',eowner:'Epic owner',method:'V2MOM method'};
    const names=a=>[...new Set(a.filter(Boolean))];
    const gOf=e=>{const p=prj.get(e.projectId)||{};switch(V.group){
      case 'priority':{const n=Math.max(0,Number(e.priority)||0);return [n,'Priority P'+n+(n===0?' (highest)':''),n];}
      case 'line':return [e.line||'BTL',(e.line==='ABL'?'ATL (above the line)':'BTL (below the line)'),e.line==='ABL'?0:1];
      case 'theme':{const t=epicTheme(e)||'';return [t||'—',t||'No theme',t?1:2];}
      case 'wsowner':{const n=names(e.workstreams.flatMap(w=>wsEngs(w).map(memName)));return [n.join(', ')||'—',n.join(', ')||'Unassigned',n.length?1:2];}
      case 'eowner':{const n=names((e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)));return [n.join(', ')||'—',n.join(', ')||'No epic owner',n.length?1:2];}
      default:{const m=(p.method||'').trim();return [m||'—',m||'No V2MOM method',m?1:2];}}};
    const grpRow=(k,label,es,open)=>`<tr class="pl-g-proj pl-g-pri" data-grp="${esc(String(k))}" style="--pc:#5b7fa6"><td colspan="${cols.length+1}"><div class="pl-pj-bar"><div class="pl-pj-l"><button type="button" class="pl-caret" data-fold-row="g:${esc(String(k))}" aria-expanded="${open}" aria-label="${open?'Collapse':'Expand'} ${esc(label)}" title="${open?'Collapse':'Expand'}">${open?'▾':'▸'}</button><span class="pl-pj-t"><b class="pl-pj-n" title="${esc(label)}">${esc(label)}</b></span></div><div class="pl-pj-r">${gsum(es)}</div></div></td></tr>`;
    P.gkeys=[];
    if(GROUPS[V.group]){
      const by=new Map();shown.forEach(e=>{const [k,label,ord]=gOf(e);if(!by.has(k))by.set(k,{label,ord,k,es:[]});by.get(k).es.push(e);});
      [...by.values()].sort((a,b)=>a.ord-b.ord||(V.group==='priority'?a.k-b.k:String(a.label).localeCompare(String(b.label)))).forEach(g=>{P.gkeys.push(g.k);const open=!fold.has('g:'+g.k);rows.push(grpRow(g.k,g.label,g.es,open));if(open)g.es.forEach(emit);});
    }else
    byP.forEach((es,pid)=>{if(filtering&&!es.length&&!pOnly(pid))return;const open=!fold.has('p:'+pid);rows.push(projRow(pid,es,open));if(open)es.forEach(emit);});
    const prjs=new Map(pl.projects.map(p=>[p.id,p]));
    const emenu=P.epicsOpen?`<div class="pl-pmenu pl-emenu" role="dialog" aria-label="Epics"><div class="pl-pm-h"><b>Epics <small>${pl.epics.length}</small></b><button type="button" class="pl-pm-x" data-epics-toggle aria-label="Close epics" title="Close">×</button></div><div class="pl-eh" aria-hidden="true"><span>Project Shortform</span><span>Epic name</span><span>Development lead</span><span>Release</span><span></span></div>${pl.epics.length?pl.epics.map(e=>{const pj=prjs.get(e.projectId)||{},own=(e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)).filter(Boolean)[0]||'—';return `<div class="pl-erow" data-goto-epic="${esc(e.id)}" tabindex="0" role="button" title="${esc(e.name)} — click to show in the table"><span title="${esc(pj.name||'')}">${esc(projShort(pj)||'—')}</span><span>${esc(e.name||'(unnamed)')}</span><span title="${esc(own)}">${esc(own)}</span><span title="${esc(e.releaseName||'')}">${esc(e.releaseName||'—')}</span><span class="pl-pact">${e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">Draft</em>'}</span></div>`;}).join(''):'<p class="note">No epics yet. Use + Epic to add one.</p>'}<p class="note">Click an epic to jump to it in the table. Hover to see full text.</p></div>`:'';
    const pmenu=P.projOpen?`<div class="pl-pmenu" role="dialog" aria-label="Projects"><div class="pl-pm-h"><b>Projects</b><button type="button" class="pl-pm-x" data-proj-toggle aria-label="Close projects" title="Close">×</button></div><div class="pl-ph" aria-hidden="true"><span>Project Shortform</span><span>Project name</span><span>V2MOM method</span><span></span></div>${pl.projects.map(p=>`<span class="pl-pchip" data-p="${esc(p.id)}"><input class="hub-inline pl-pshort" type="text" placeholder="e.g. HRP M1.1.3" aria-label="Project Shortform" title="${esc(p.short||'')}" data-f="short" value="${esc(p.short||'')}" maxlength="60"><input class="hub-inline pl-pname" type="text" list="pl-projects" placeholder="Project name (type to link a GUS project)" aria-label="Project name" title="${esc(p.name)}${p.gusId?' (exists in GUS; rename it in GUS)':''}" data-f="name" value="${esc(p.name)}" maxlength="${PROJECT_NAME_MAX}"${p.gusId?' readonly':''}><input class="hub-inline pl-pmeth" type="text" placeholder="V2MOM method" aria-label="V2MOM method for this project" title="${esc(p.method||'')}${p.gusId?' (saved to the GUS project on commit)':''}" data-f="method" value="${esc(p.method||'')}" maxlength="1000"><span class="pl-pact">${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">New</em>'}<button type="button" class="pl-x" data-add-epic aria-label="Add epic to this project" title="Add epic to this project">+</button><button type="button" class="pl-x" data-del-proj aria-label="Delete project" title="Delete project">×</button></span></span>`).join('')}<p class="note">Project names that exist in GUS are read-only (rename them in GUS). The shortform is a label kept in this plan only. The V2MOM method is saved to the GUS project when you commit the plan. Hover a field to see its full text.</p></div>`:'';

    const anyOpen=(GROUPS[V.group]?(P.gkeys||[]):pl.projects.map(p=>p.id)).some(k=>!fold.has((GROUPS[V.group]?'g:':'p:')+k))||(!GROUPS[V.group]&&!pl.projects.length);
    return `<div class="pl-grid-tools"><label class="pl-gb">Group by <select class="hub-inline" data-v="group" aria-label="Group planner rows by"><option value="project"${V.group&&V.group!=='project'&&/^(priority|line|theme|wsowner|eowner|method)$/.test(V.group)?'':' selected'}>Project</option><option value="priority"${V.group==='priority'?' selected':''}>Priority</option><option value="line"${V.group==='line'?' selected':''}>ATL/BTL</option><option value="theme"${V.group==='theme'?' selected':''}>Theme</option><option value="wsowner"${V.group==='wsowner'?' selected':''}>Workstream owner</option><option value="eowner"${V.group==='eowner'?' selected':''}>Epic owner</option><option value="method"${V.group==='method'?' selected':''}>V2MOM method</option></select></label><span class="pl-tl"><span class="pl-tg" role="group" aria-label="Add"><button type="button" class="button" id="pl-add-proj">+ Project</button></span><span class="pl-tg" role="group" aria-label="Open lists"><span class="pl-pwrap"><button type="button" class="button" data-proj-toggle aria-haspopup="true" aria-expanded="${P.projOpen?'true':'false'}">Projects ▾</button>${pmenu}</span><span class="pl-pwrap"><button type="button" class="button" data-epics-toggle aria-haspopup="true" aria-expanded="${P.epicsOpen?'true':'false'}">Epics ▾</button>${emenu}</span></span></span><span class="pl-cols"><button type="button" class="button" data-cols-toggle aria-haspopup="true" aria-expanded="${P.colsOpen?'true':'false'}">Columns ▾</button>${P.colsOpen?`<div class="pl-cols-menu" role="menu">${[...cols,...Object.keys(GCOL).filter(k=>!cols.includes(k))].map(k=>{const on=cols.includes(k),i=cols.indexOf(k);return `<div class="pl-colrow" data-colrow="${k}"${on?' draggable="true"':''}><span class="pl-colgrip" aria-hidden="true">${on?'⠿':''}</span><label><input type="checkbox" data-col="${k}"${on?' checked':''}> ${esc(GCOL[k])}</label>${on?`<button type="button" class="pl-colmv" data-colmv="${k}" data-d="-1" aria-label="Move ${esc(GCOL[k])} left"${i===0?' disabled':''}>▲</button><button type="button" class="pl-colmv" data-colmv="${k}" data-d="1" aria-label="Move ${esc(GCOL[k])} right"${i===cols.length-1?' disabled':''}>▼</button>`:''}</div>`;}).join('')}<div class="pl-cols-foot"><button type="button" class="pl-cols-reset" data-cols-reset>Reset to default</button><button type="button" class="button primary" data-cols-done>Done</button></div></div>`:''}</span><span class="pl-tg" role="group" aria-label="Rows">${anyOpen?'<button type="button" class="button" data-fold-all="1" title="Collapse every group">Collapse all</button>':'<button type="button" class="button" data-fold-all="0" title="Expand every group and epic">Expand all</button>'}</span></div><div class="pl-grid-wrap"><table class="pl-grid"><colgroup>${cols.map(k=>`<col class="${k==='name'||k==='ws'?'w-grow':'w-fit'}">`).join('')}<col class="w-fit"></colgroup><thead><tr>${cols.map(k=>`<th class="c-${k}">${esc(GCOL[k])}</th>`).join('')}<th class="c-actions">Actions</th></tr><tr class="pl-cf-row">${cols.map(k=>`<th class="c-${k}"><input type="search" class="pl-cf" data-cf="${k}" value="${esc((V.col||{})[k]||'')}" placeholder="Search" aria-label="Filter ${esc(GCOL[k])}" autocomplete="off"></th>`).join('')}<th class="c-actions">${colF.length?'<button type="button" class="pl-cf-clear" data-cf-clear title="Clear column searches" aria-label="Clear column searches">Clear</button>':''}</th></tr></thead><tbody>${rows.join('')||`<tr><td colspan="${cols.length+1}" class="note">${pl.projects.length?'No epics match the filters.':'No epics yet.'}</td></tr>`}</tbody></table></div>`;};
  el.innerHTML=`<datalist id="pl-projects">${P.refs.projects.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist><datalist id="pl-sprints">${P.refs.sprints.map(s=>`<option value="${esc(s.name)}"></option>`).join('')}</datalist>`+
    (!pl.projects.length?'<div class="empty-state hub-empty pl-empty"><h3>No projects yet</h3><p>Use + Project, then + Epic on the project row, or Import a filled template.</p></div>':'')+gridHtml();
  hoistTools();
}
// The grid action buttons (+ Epic, + Project, Projects, Columns) live on the filter bar's right so everything sits on one line.
function hoistTools(){
  const box=P.el.querySelector('#pl-tools'),gt=P.el.querySelector('#pl-planner .pl-grid-tools');if(!box)return;
  box.querySelectorAll(':scope > .pl-grid-tools').forEach(x=>{if(x!==gt)x.remove();});if(gt)box.appendChild(gt);
}
const wire=()=>{P.el.querySelectorAll('#pl-planner select').forEach(s=>H.customSelect(s));wireColFilters();};
let cfTimer;
/** Inline column searches: update the filter and redraw the grid, keeping focus and caret in the box being typed in. */
function wireColFilters(){const root=P.el.querySelector('#pl-planner');if(!root)return;
  const redraw=(focus,pos,keep=true)=>{if(!P.plan)return;drawTools();drawPlanner();wire();if(focus&&keep){const i=P.el.querySelector(`.pl-cf[data-cf="${focus}"]`);if(i){i.focus();try{i.setSelectionRange(pos,pos);}catch(_){}}}};
  root.querySelectorAll('.pl-cf').forEach(i=>{const go=()=>{const k=i.dataset.cf,pos=i.selectionStart;P.view.col=P.view.col||{};P.view.col[k]=i.value;clearTimeout(cfTimer);cfTimer=setTimeout(()=>redraw(k,pos,document.activeElement===i),150);};
    i.addEventListener('input',ev=>{if(!ev.isComposing)go();}); // wait for IME composition to finish
    i.addEventListener('compositionstart',()=>clearTimeout(cfTimer));i.addEventListener('compositionend',go);});
  const c=root.querySelector('[data-cf-clear]');if(c)c.onclick=()=>{P.view.col={};redraw();const f=P.el.querySelector('.pl-cf');if(f)f.focus();};}
function drawTools(){
  const box=P.el.querySelector('#pl-tools'),pl=P.plan;if(!box||!pl)return;const V=P.view;
  const themes=[...new Set(pl.epics.map(epicTheme))].sort(),engs=P.members.filter(isEng);
  restoreFilters();V.q='';V.tok=[];
  const mfLabel=(k,list)=>{const sel=V[k];if(!sel.length)return 'All';const nm=v=>(list.find(x=>x[0]===v)||[v,v])[1];return sel.length===1?nm(sel[0]):sel.length+' selected';};
  const sel=(k,label,list)=>`<div class="pl-tf pl-mf${V[k].length?' on':''}" data-mf="${k}"><span>${label}</span><button type="button" class="pl-mf-btn" aria-haspopup="true" aria-expanded="false" aria-label="${label} filter"><b>${esc(mfLabel(k,list))}</b><i aria-hidden="true">▾</i></button><div class="pl-mf-pop" hidden><input type="search" class="hub-inline" placeholder="Search ${label.toLowerCase()}…" aria-label="Search ${label}"><div class="pl-mf-acts"><button type="button" data-mf-all>Select all</button><button type="button" data-mf-none>Clear</button></div><ul>${list.map(([v,l])=>`<li data-t="${esc(String(l).toLowerCase())}"><label><input type="checkbox" value="${esc(v)}"${V[k].includes(v)?' checked':''}> <span>${esc(l)}</span></label></li>`).join('')||'<li class="note">Nothing to filter yet</li>'}</ul></div></div>`;
  const rels=[...new Map(pl.epics.filter(e=>e.releaseId).map(e=>[e.releaseId,e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||e.releaseId])).entries()];
  const keepGt=box.querySelector(':scope > .pl-grid-tools');
  // The Release / ATL-BTL / Engineer / Theme filters were replaced by the column filters; drop any value saved earlier so nothing filters invisibly.
  if(MF.some(k=>V[k].length)){MF.forEach(k=>{V[k]=[];});saveFilters();}
  box.innerHTML='';
  if(keepGt)box.appendChild(keepGt);
  box.querySelectorAll('select').forEach(x=>H.customSelect(x));
  const lists={};MF.forEach(k=>{const w=box.querySelector(`[data-mf=${k}]`);if(w)lists[k]=[...w.querySelectorAll('li input')].map(i=>[i.value,i.nextElementSibling.textContent]);});
  const refresh=w=>{const k=w.dataset.mf;w.classList.toggle('on',V[k].length>0);w.querySelector('.pl-mf-btn b').textContent=mfLabel(k,lists[k]||[]);const c=box.querySelector('[data-clear-view]');if(c){const on=filtersOn(V);c.disabled=!on;c.classList.toggle('pl-clear-on',on);}drawPlanner();wire();};
  const closeAll=()=>box.querySelectorAll('.pl-mf-pop').forEach(p=>{p.hidden=true;p.parentNode.querySelector('.pl-mf-btn').setAttribute('aria-expanded','false');});
  box.onclick=e=>{const w=e.target.closest('.pl-mf');if(!w)return;const k=w.dataset.mf;
    if(e.target.closest('.pl-mf-btn')){const pop=w.querySelector('.pl-mf-pop'),open=pop.hidden;closeAll();if(open){pop.hidden=false;w.querySelector('.pl-mf-btn').setAttribute('aria-expanded','true');const q=pop.querySelector('input[type=search]');q.focus();}return;}
    if(e.target.closest('[data-mf-all]')){V[k]=[...w.querySelectorAll('li:not([hidden]) input')].map(i=>i.value);w.querySelectorAll('li input').forEach(i=>{i.checked=V[k].includes(i.value);});saveFilters();refresh(w);return;}
    if(e.target.closest('[data-mf-none]')){V[k]=[];w.querySelectorAll('li input').forEach(i=>{i.checked=false;});saveFilters();refresh(w);return;}};
  box.onchange=e=>{const i=e.target.closest('.pl-mf li input');if(!i)return;const w=i.closest('.pl-mf'),k=w.dataset.mf;V[k]=[...w.querySelectorAll('li input:checked')].map(x=>x.value);saveFilters();refresh(w);};
  box.addEventListener('input',e=>{const q=e.target.closest('.pl-mf-pop input[type=search]');if(!q)return;const t=q.value.trim().toLowerCase();q.closest('.pl-mf-pop').querySelectorAll('li[data-t]').forEach(li=>{li.hidden=!!t&&!li.dataset.t.includes(t);});});
  box.onkeydown=e=>{if(e.key==='Escape'&&e.target.closest('.pl-mf')){const w=e.target.closest('.pl-mf');closeAll();w.querySelector('.pl-mf-btn').focus();e.stopPropagation();}};
  if(!P.mfDoc){P.mfDoc=true;document.addEventListener('mousedown',e=>{if(e.target.closest('.pl-mf'))return;document.querySelectorAll('.pl-mf-pop').forEach(p=>{p.hidden=true;});});}
}
// Global search: "kind:text" tokens (project:, epic:, ws:, eng:, owner:, status:, atl:/btl:, sprint:, release:, theme:, method:).
// Type 3+ characters to get suggestions across every kind, or a short form such as "eng:" to list just that kind. Tokens AND across kinds and OR within one.
const SK={project:'Project',method:'Method',epic:'Epic',ws:'Workstream',eng:'Engineer',owner:'Epic owner',status:'Status',line:'ATL/BTL',sprint:'Sprint',release:'Release',theme:'Theme'};
const SA={project:'project',proj:'project',p:'project',measure:'project',method:'method',m:'method',epic:'epic',e:'epic',workstream:'ws',ws:'ws',w:'ws',engineer:'eng',eng:'eng',en:'eng',owner:'owner',lead:'owner',dl:'owner',status:'status',st:'status',atl:'line',btl:'line',line:'line',sprint:'sprint',sp:'sprint',release:'release',rel:'release',theme:'theme'};
const uniq=a=>[...new Set(a.map(x=>String(x==null?'':x).trim()).filter(Boolean))];
/** Lower-case searchable text of one grid column for an epic (epic-level value plus all of its workstreams). */
function colText(k,e,p){const ws=e.workstreams||[],sk=n=>skVals(n,e,p).join(' ');let t='';
  switch(k){
    case 'project':t=sk('project');break;case 'name':t=e.name||'';break;case 'ws':t=sk('ws');break;case 'owners':t=sk('owner');break;case 'engs':t=sk('eng');break;
    case 'days':t=ws.map(w=>w.days||'').join(' ');break;case 'estimate':t=String(epicDays(e));break;case 'line':t=sk('line')+(e.line==='ABL'?' above':' below');break;
    case 'priority':t='P'+(e.priority==null?0:e.priority);break;case 'status':t=e.status||'Planned';break;case 'wstatus':t=ws.map(w=>w.status||'').join(' ');break;case 'sprint':t=sk('sprint');break;case 'release':t=sk('release');break;
    case 'theme':t=sk('theme');break;case 'gus':t=e.gusId?'gus saved':'draft';break;case 'doc':t=e.doc||'';break;case 'hrp':t=e.hrp||'';break;case 'v2mom':t=e.v2mom||'';break;case 'pmethod':t=sk('method');break;
  }return t.toLowerCase();}
function skVals(k,e,p){const ws=e.workstreams||[];
  switch(k){
    case 'project':return p?[projLabel(p),p.name,projShort(p)]:[];
    case 'method':return p&&p.method?[p.method]:[];
    case 'epic':return [e.name];
    case 'ws':return ws.map(w=>w.name);
    case 'eng':return uniq(ws.flatMap(w=>wsEngs(w).map((id,i)=>memName(id)||(w.engNames||[])[i]||(w.engId===id?w.engName:''))));
    case 'owner':return uniq((e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)));
    case 'status':return uniq([e.status||'Planned',...ws.map(w=>w.status)]);
    case 'line':return uniq(ws.length?ws.map(w=>wl(e,w)):[e.line]).flatMap(l=>l==='ABL'?['ABL','ATL']:[l]);
    case 'sprint':return uniq(ws.map(w=>w.sprint));
    case 'release':return e.releaseName?[e.releaseName]:[];
    case 'theme':return [epicTheme(e)];
  }return [];}
function skSuggest(query){const m=/^\s*([a-z0-9]+)\s*:\s*(.*)$/i.exec(query),kind=m&&SA[m[1].toLowerCase()],text=(kind?m[2]:query).trim().toLowerCase();
  if(!kind&&text.length<3)return [];
  const prj=new Map(P.plan.projects.map(p=>[p.id,p])),kinds=kind?[kind]:Object.keys(SK),out=[];
  kinds.forEach(k=>{const cnt=new Map();
    P.plan.epics.forEach(e=>{const seen=new Set();(k==='project'?[projLabel(prj.get(e.projectId)||{name:'',short:''})].filter(Boolean):skVals(k,e,prj.get(e.projectId))).forEach(v=>{if(!seen.has(v)&&!(k==='line'&&v==='ATL')&&(!text||v.toLowerCase().includes(text)||(k==='line'&&((v==='ABL'&&('atl'.startsWith(text)||'above the line'.includes(text)))||(v==='BTL'&&'below the line'.includes(text)))))){seen.add(v);cnt.set(v,(cnt.get(v)||0)+1);}});});
    if(k==='project'){/* project labels only; method has its own kind */}
    const arr=[...cnt.entries()].sort((a,b)=>(b[0].toLowerCase().startsWith(text)-a[0].toLowerCase().startsWith(text))||b[1]-a[1]||a[0].localeCompare(b[0],undefined,{numeric:true}));
    arr.slice(0,kind?12:4).forEach(([v,n])=>out.push({k,v,n}));});
  return out.slice(0,kind?12:16);}
function draw(){drawSummary();drawTools();drawPlanner();wire();}

const closeMs=()=>document.querySelectorAll('.ms.open').forEach(w=>{w.classList.remove('open');w.querySelector('.cs-btn').setAttribute('aria-expanded','false');});
document.addEventListener('click',e=>{if(!e.target.closest('.ms'))closeMs();
  const w=e.target.closest('.pl-grid .cs.open,.pl-grid .ms.open');if(w){const b=w.querySelector('.cs-btn'),m=w.querySelector('.cs-menu'),r=b.getBoundingClientRect();m.style.position='fixed';m.style.left=Math.min(r.left,innerWidth-m.offsetWidth-8)+'px';m.style.right='auto';m.style.top=(r.bottom+4>innerHeight-200?Math.max(8,r.top-m.offsetHeight-4):r.bottom+4)+'px';}});
addEventListener('scroll',ev=>{if(ev.target.closest&&ev.target.closest('.cs-menu,.pl-mspop'))return;closeMsPop();document.querySelectorAll('.pl-grid .cs.open').forEach(w=>{w.classList.remove('open');});closeMs();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMs();});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.pl-kpi[data-kpi]')){e.preventDefault();applyKpi(e.target.dataset.kpi);}});
// ── Edits ───────────────────────────────────────────────────────────────────
const findE=id=>P.plan.epics.find(e=>e.id===id),findP=id=>P.plan.projects.find(p=>p.id===id);
function closeMsPop(){document.querySelectorAll('.pl-mspop').forEach(x=>x.remove());}
function openMsPop(btn,c){
  closeMsPop();const wd=btn.closest('.ms'),f=wd.dataset.ms;let cur;
  if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!w)return;cur=wsEngs(w);}else if(c.e){const e=findE(c.e);if(!e)return;cur=e.owners||[];}else return;
  const mem=f==='owners'?P.members.filter(isEng):allMem(),pop=document.createElement('div');pop.className='pl-mspop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',f==='owners'?'Epic owners':'Workstream owners');
  pop.innerHTML=`<b>${f==='owners'?'Epic owners':'Workstream owners'}</b><div class="pl-ms-l">${mem.map(m=>`<label><input type="checkbox" value="${esc(m.id)}"${cur.includes(m.id)?' checked':''}> ${esc(m.name)}</label>`).join('')||'<p class="note">No team members</p>'}</div><div class="pl-ms-a"><button type="button" class="button" data-x>Cancel</button><button type="button" class="button primary" data-ok>Save</button></div>`;
  H.popHost().appendChild(pop);
  const r=btn.getBoundingClientRect(),h=pop.offsetHeight,w=pop.offsetWidth;
  pop.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+'px';pop.style.top=(r.top-h-6>=8?r.top-h-6:Math.min(r.bottom+6,innerHeight-h-8))+'px';
  const off=ev=>{if(!pop.contains(ev.target)&&!btn.contains(ev.target))end();},esc_=ev=>{if(ev.key==='Escape'){end();btn.focus();}};
  function end(){pop.remove();document.removeEventListener('mousedown',off,true);document.removeEventListener('keydown',esc_,true);}
  document.addEventListener('mousedown',off,true);document.addEventListener('keydown',esc_,true);
  pop.querySelector('[data-x]').onclick=end;
  pop.querySelector('[data-ok]').onclick=()=>{const ids=[...pop.querySelectorAll('input:checked')].map(i=>i.value);
    if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(w){w.engIds=ids;w.engId=ids[0]||'';w.engName=memName(ids[0]);w.engNames=ids.map(memName);}}
    else{const e=findE(c.e);if(e){e.owners=ids;e.ownerNames=ids.map(memName);}}
    btn.firstElementChild.textContent=msLabel(ids,f==='owners'?'Owners':'Unassigned');btn.title=ids.map(memName).join(', ');end();drawSummary();queueSave();};
  pop.querySelector('input')?.focus();
}
const ctxOf=t=>{const w=t.closest('[data-w]'),e=t.closest('[data-e]'),p=t.closest('[data-p]');return {w:w&&w.dataset.w,e:e&&e.dataset.e,p:p&&p.dataset.p};};
function redrawCols(){const m=P.el.querySelector('.pl-cols-menu'),top=m?m.scrollTop:0;drawPlanner();wire();const n=P.el.querySelector('.pl-cols-menu');if(n)n.scrollTop=top;}
function wireColDrag(el){let from=null;
  el.addEventListener('dragstart',ev=>{const r=ev.target.closest&&ev.target.closest('[data-colrow][draggable]');if(!r)return;from=r.dataset.colrow;ev.dataTransfer.effectAllowed='move';ev.dataTransfer.setData('text/plain',from);});
  el.addEventListener('dragover',ev=>{const r=ev.target.closest&&ev.target.closest('[data-colrow][draggable]');if(from&&r){ev.preventDefault();el.querySelectorAll('.pl-coldrop').forEach(x=>x.classList.remove('pl-coldrop'));r.classList.add('pl-coldrop');}});
  el.addEventListener('drop',ev=>{const r=ev.target.closest&&ev.target.closest('[data-colrow][draggable]');if(!from||!r)return;ev.preventDefault();const to=r.dataset.colrow,cur=gridCols();if(to!==from&&cur.includes(from)&&cur.includes(to)){cur.splice(cur.indexOf(from),1);cur.splice(cur.indexOf(to),0,from);setGridCols(cur);}from=null;redrawCols();});
  el.addEventListener('dragend',()=>{from=null;el.querySelectorAll('.pl-coldrop').forEach(x=>x.classList.remove('pl-coldrop'));});}
function onInput(ev){
  if(ev.target.closest&&ev.target.closest('[data-col]'))return;
  const vt=ev.target.closest&&ev.target.closest('[data-v]');if(vt){P.view[vt.dataset.v]=vt.value;if(vt.dataset.v==='group'||vt.tagName==='SELECT')drawTools();drawPlanner();wire();return;}
  const t=ev.target.closest('[data-f]');if(!t||!P.plan)return;
  const f=t.dataset.f,c=ctxOf(t),v=t.value;let structural=false;
  if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!w)return;
    if(f==='days'){w.days=Math.max(0,Number(v)||0);t.classList.toggle('pl-eff-set',w.days>0);t.classList.toggle('pl-eff-empty',!(w.days>0));const b=(t.closest('.pl-epic')||P.el).querySelector(`[data-e="${e.id}"] [data-eff]`)||t.closest('.pl-epic')?.querySelector('[data-eff]');if(b)b.textContent=fmt(epicDays(e));}
    else if(f==='priority')w.priority=v===''?null:Math.max(0,Math.round(Number(v)));
    else if(f==='engId'){w.engId=v;w.engName=(P.members.find(m=>m.id===v)||{}).name||'';}
    else w[f]=v;}
  else if(c.e){const e=findE(c.e);if(!e)return;
    if(f==='priority')e.priority=v===''?null:Math.max(0,Math.round(Number(v)));
    else if(f==='doc')e.doc=/^https?:\/\//i.test(v)||v===''?v:e.doc;
    else if(f==='releaseId'){e.releaseId=v;e.releaseName=(P.refs.releases.find(r=>r.id===v)||{}).name||'';}
    else if(f==='projectId'){e.projectId=v;structural=true;}
    else e[f]=v;}
  else if(c.p){const p=findP(c.p);if(!p)return;
    if(f==='name'){p.name=v;const hit=P.refs.projects.find(x=>x.name===v);if(hit){p.gusId=hit.id;p.programId=hit.programId;p.programName=hit.programName;structural=true;}else if(p.gusId){p.gusId='';}}
    else p[f]=v;}
  if(structural&&ev.type==='change')draw();else drawSummary();
  queueSave();
}
function toggleFs(force){
  const box=P.el&&P.el.querySelector('#pl-fs');if(!box)return;const on=force==null?!box.classList.contains('pl-fs-on'):force;
  box.classList.toggle('pl-fs-on',on);document.body.classList.toggle('pl-fs-lock',on);
  const b=box.querySelector('#pl-fs-btn');if(b){b.textContent=on?'Exit full screen':'Full screen';b.setAttribute('aria-pressed',String(on));}
  try{if(on&&!document.fullscreenElement&&box.requestFullscreen)box.requestFullscreen().catch(()=>{});else if(!on&&document.fullscreenElement)document.exitFullscreen().catch(()=>{});}catch(_){}
}
document.addEventListener('fullscreenchange',()=>{const host=H.popHost();document.querySelectorAll('.nd-overlay,.hub-confirm-ov,.pl-tt,#ui-tooltip,#toasts,.pl-confirm,.pl-mspop').forEach(x=>{if(x.parentNode!==host)host.appendChild(x);});if(!document.fullscreenElement)toggleFs(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.pl-fs-on')&&!document.querySelector('.nd-overlay,.hub-confirm-ov,.pl-confirm,.pl-mspop')&&!document.querySelector('.cs.open,.ms.open')){toggleFs(false);e.stopImmediatePropagation();}},true);
function onClick(ev){
  const t=ev.target,c=ctxOf(t),pl=P.plan;
  if(t.closest('#pl-fs-btn'))return toggleFs();
  const ct=t.closest('input[data-col]');if(ct){const cur=gridCols(),k=ct.dataset.col,n=ct.checked?[...cur.filter(x=>x!==k),k]:cur.filter(x=>x!==k);if(n.length)setGridCols(n);redrawCols();return;}
  if(t.closest('.pl-colrow')&&!t.closest('button'))return;
  if(t.closest('[data-cols-done]')){P.colsOpen=false;drawPlanner();wire();return;}
  const mv=t.closest('[data-colmv]');if(mv){const cur=gridCols(),i=cur.indexOf(mv.dataset.colmv),j=i+Number(mv.dataset.d);if(i>=0&&j>=0&&j<cur.length){[cur[i],cur[j]]=[cur[j],cur[i]];setGridCols(cur);}redrawCols();P.el.querySelector(`[data-colmv="${mv.dataset.colmv}"][data-d="${mv.dataset.d}"]:not([disabled])`)?.focus();return;}
  if(t.closest('[data-cols-toggle]')){P.colsOpen=!P.colsOpen;drawPlanner();wire();return;}
  if(t.closest('[data-cols-reset]')){setGridCols(null);redrawCols();return;}
  if(!t.closest('a[href]')&&((P.colsOpen&&!t.closest('.pl-cols'))||((P.projOpen||P.epicsOpen)&&!t.closest('.pl-pwrap')))){P.colsOpen=false;P.projOpen=false;P.epicsOpen=false;drawPlanner();wire();}
  if(t.closest('[data-reload]'))return load(P.el);
  if(t.closest('[data-retry]'))return flush();
  if(!pl)return;
  const dmt=t.closest('[data-dm-toggle]');
  document.querySelectorAll('.pl-dm').forEach(m=>{const open=dmt&&m.contains(dmt)&&m.querySelector('.pl-dm-list').hidden;m.querySelector('.pl-dm-list').hidden=!open;m.querySelector('[data-dm-toggle]').setAttribute('aria-expanded',String(open));});
  if(dmt)return;
  if(t.closest('#pl-export')){exportTemplate();return;}
  if(t.closest('#pl-import')){P.el.querySelector('#pl-import-file').click();return;}
  if(t.closest('#pl-add-proj')){newProjectAt(t.closest('#pl-add-proj'));return;}
  const mb=t.closest('.ms .cs-btn');if(mb){openMsPop(mb,c);return;}
  const tb=t.closest('[data-tab]');if(tb){setTab(tb.dataset.tab);return;}
  const rp=t.closest('[data-rps]');if(rp){openRps(rp.dataset.rps,rp);return;}
  const rvb=t.closest('[data-rv]');if(rvb){P.rv=rvb.dataset.rv;drawRps();return;}const sb=t.closest('[data-sumby]');if(sb){P.sumBy=sb.dataset.sumby;drawSummary();return;}
  const fd=t.closest('[data-fold]')||(t.closest('.pl-card>h3>small,.pl-kbox>h3>small,.pl-kbox>h3>.pl-kbrief')?.parentElement.querySelector('[data-fold]'));if(fd){P.open[fd.dataset.fold]=!P.open[fd.dataset.fold];drawSummary();return;}
  const fa=t.closest('[data-fold-all]');if(fa){const c=collapsed();c.clear();if(fa.dataset.foldAll==='1'){pl.projects.forEach(p=>c.add('p:'+p.id));(P.gkeys||[]).forEach(k=>c.add('g:'+k));}try{localStorage.setItem(colKey(),JSON.stringify([...c]));}catch(_){}drawPlanner();wire();return;}
  const mt=t.closest('[data-m-toggle]');if(mt){const k=mt.dataset.mToggle;if(P.mOpen.has(k))P.mOpen.delete(k);else P.mOpen.add(k);drawPlanner();wire();return;}
  const fr=t.closest('[data-fold-row]');if(fr){const k=fr.dataset.foldRow;setCollapsed(k,!collapsed().has(k));drawPlanner();wire();return;}
  if(t.closest('[data-proj-add-epic]')){newEpicAt(c.p);return;}
  if(t.closest('[data-epics-toggle]')){P.epicsOpen=!P.epicsOpen;if(P.epicsOpen)P.projOpen=false;drawPlanner();wire();return;}
  const ge=t.closest('[data-goto-epic]');if(ge&&!t.closest('a')){const id=ge.dataset.gotoEpic,ee=findE(id);if(ee){setCollapsed('p:'+ee.projectId,false);setCollapsed('e:'+id,false);}P.epicsOpen=false;drawPlanner();wire();const row=P.el.querySelector(`[data-e="${id}"]`);if(row){row.scrollIntoView({block:'center'});row.classList.add('pl-flash');setTimeout(()=>row.classList.remove('pl-flash'),2600);}return;}
  if(t.closest('[data-proj-toggle]')){P.projOpen=!P.projOpen;if(P.projOpen)P.epicsOpen=false;drawPlanner();wire();return;}
  const kp=t.closest('[data-kpi]');if(kp){applyKpi(kp.dataset.kpi);return;}
  if(t.closest('[data-clear-view]')){P.view=Object.assign(P.view,{q:'',tok:[],release:[],line:[],eng:[],theme:[],col:{}});saveFilters();drawTools();drawPlanner();wire();return;}
  if(t.closest('#pl-save')){const b=t.closest('#pl-save');b.disabled=true;P.state='dirty';flush().then(()=>{b.disabled=false;if(P.state==='saved')window.toast?.('Plan saved to GUS Apps for the whole team.');else window.toast?.('Could not save the plan.',true);},()=>{b.disabled=false;});return;}
  if(t.closest('#pl-leaves'))return openLeaves();
  if(t.closest('#pl-commit'))return openCommit(false);
  if(t.closest('[data-add-epic]')){const e=newEpic(c.p);pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] .pl-ename`)?.focus();return;}
  if(t.closest('[data-add-ws]')){if(findE(c.e)){const ar=t.closest('[data-w]');newWorkstreamAt(c.e,ar&&ar.dataset.w);}return;}
  const line=t.closest('[data-line]');if(line){const e=findE(c.e);if(e){const v=line.dataset.line,w=c.w&&e.workstreams.find(x=>x.id===c.w);if(w){e.workstreams.forEach(x=>{x.line=x.line||e.line;});w.line=v;deriveLine(e);}else{e.line=v;e.workstreams.forEach(x=>{x.line=v;});}draw();queueSave();}return;}
  if(t.closest('[data-del-ws]')){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!e||!w)return;if(w.gusId)delItemDlg('ws',e,w,t.closest('[data-del-ws]'));else{e.workstreams=e.workstreams.filter(x=>x.id!==c.w);draw();queueSave();}return;}
  if(t.closest('[data-del-epic]')){const e=findE(c.e);if(!e)return;const go=()=>{pl.epics=pl.epics.filter(x=>x.id!==c.e);draw();queueSave();};if(!e.gusId&&!e.name&&!epicDays(e))go();else if(e.gusId)delItemDlg('epic',e,null,t.closest('[data-del-epic]'));else confirmAt(t.closest('[data-del-epic]'),'Delete this epic and its workstreams?',go);return;}
  if(t.closest('[data-del-proj]')){P.projOpen=false;delProjectDlg(c.p,t.closest('[data-del-proj]'));return;}
  if(t.closest('[data-proj-del]')){delProjectDlg(c.p,t.closest('[data-proj-del]'));return;}
}

// ── Dialogs ─────────────────────────────────────────────────────────────────
let modal=null;
function closeModal(){if(!modal)return false;document.removeEventListener('keydown',modal.key,true);modal.el.remove();modal.opener&&modal.opener.focus&&modal.opener.focus();modal=null;return true;}
document.addEventListener('mouseover',e=>{const i=e.target.closest&&e.target.closest('.pl-pmenu input');if(i)i.title=i.value;});
// Removing an epic or workstream that already exists in GUS: the user chooses between taking it off the dashboard only (GUS keeps it) and deleting it in GUS as well.
function delItemDlg(kind,e,w,opener){
  const pl=P.plan,isWs=kind==='ws',label=isWs?(w.name||'(unnamed workstream)'):(e.name||'(unnamed epic)'),canGus=isWs?!!w.gusId:!e.foreign;
  const wsIds=isWs?[]:e.workstreams.filter(x=>x.gusId).map(x=>x.gusId);
  const el=openModal(isWs?'Remove workstream':'Remove epic',`<p><b>${esc(label)}</b></p>
    <p class="note">${isWs?'This workstream is also a story in GUS.':'This epic is also in GUS'+(e.workstreams.length?`, with ${e.workstreams.length} workstream${e.workstreams.length===1?'':'s'}`:'')+'.'} Where should it be removed?</p>
    <label class="pl-del-row"><input type="radio" name="dsc" value="dash" checked><span><b>Remove from the dashboard only</b> — it stays in GUS.</span></label>
    ${canGus?`<label class="pl-del-row"><input type="radio" name="dsc" value="gus"><span><b>Delete in GUS as well</b> — removes it from GUS and the dashboard.</span></label>
    <div data-ack hidden><label class="pl-del-row pl-del-ack"><input type="checkbox" data-ackc><span>I understand this permanently deletes ${isWs?'the story':'the epic'} in GUS and cannot be undone. GUS only allows it when no other work items are under it${isWs?'':' (its own workstream stories are deleted with it)'}.</span></label></div>`:`<p class="note">This epic belongs to another team, so it can only be removed from the dashboard.</p>`}
    <p class="pl-del-err" role="alert" hidden></p>
    <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" data-idel>Remove from dashboard</button></div>`,opener);
  const radios=[...el.querySelectorAll('[name=dsc]')],ack=el.querySelector('[data-ackc]'),go=el.querySelector('[data-idel]'),err=el.querySelector('.pl-del-err');
  const gus=()=>{const r=radios.find(x=>x.checked);return !!r&&r.value==='gus';};
  const sync=()=>{const g=gus();const a=el.querySelector('[data-ack]');if(a)a.hidden=!g;go.textContent=g?'Delete in GUS and dashboard':'Remove from dashboard';go.disabled=g&&!(ack&&ack.checked);go.classList.toggle('pl-danger',g);};
  radios.forEach(r=>r.addEventListener('change',()=>{if(ack)ack.checked=false;sync();}));ack&&ack.addEventListener('change',sync);sync();
  go.onclick=async()=>{err.hidden=true;go.disabled=true;const g=gus();let msg=`Removed “${label}” from the dashboard.`;
    try{
      if(g){
        if(isWs)await call('plan-delete-workstream',{teamId:H.team.Id,workstream:{gusId:w.gusId}});
        else await call('plan-delete-epic',{teamId:H.team.Id,epic:{gusId:e.gusId,workstreamIds:wsIds}});
        msg=`Deleted “${label}” in GUS and removed it from the dashboard.`;
      }
      if(isWs)e.workstreams=e.workstreams.filter(x=>x.id!==w.id);else pl.epics=pl.epics.filter(x=>x.id!==e.id);
      closeModal();draw();queueSave();window.toast?.(msg,false);
    }catch(x){err.textContent=String(x&&x.message||x)+' It was kept on the dashboard.';err.hidden=false;sync();}};
}
// Remove a project from the dashboard. By default GUS is untouched; the admin can also delete the project in GUS (explicit acknowledgement).
function delProjectDlg(pid,opener){
  const pl=P.plan,p=findP(pid);if(!p)return;
  const n=pl.epics.filter(e=>e.projectId===pid).length,inGus=!!p.gusId;
  const el=openModal('Delete project',`<p><b>${esc(projLabel(p))}</b></p>
    <p class="note">This removes the project${n?` and its ${n} epic${n===1?'':'s'}`:''} from this dashboard. Anything already in GUS stays in GUS.</p>
    ${inGus?`<label class="pl-del-row"><input type="checkbox" data-gus><span>Also delete this project from GUS</span></label>
    <div data-ack hidden><label class="pl-del-row pl-del-ack"><input type="checkbox" data-ackc><span>I understand this permanently deletes the project in GUS and cannot be undone. GUS only allows it when the project has no epics left.</span></label></div>`:''}
    <p class="pl-del-err" role="alert" hidden></p>
    <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" data-pdel>Remove from dashboard</button></div>`,opener);
  const gus=el.querySelector('[data-gus]'),ack=el.querySelector('[data-ackc]'),go=el.querySelector("[data-pdel]"),err=el.querySelector('.pl-del-err');
  const sync=()=>{const g=!!(gus&&gus.checked);el.querySelector('[data-ack]')&&(el.querySelector('[data-ack]').hidden=!g);go.textContent=g?'Delete from dashboard and GUS':'Remove from dashboard';go.disabled=g&&!(ack&&ack.checked);go.classList.toggle('pl-danger',g);};
  gus&&gus.addEventListener('change',()=>{if(ack)ack.checked=false;sync();});ack&&ack.addEventListener('change',sync);sync();
  go.onclick=async()=>{err.hidden=true;go.disabled=true;let warn=false,msg=`Removed “${projLabel(p)}” from the dashboard.`;
    try{
      if(gus&&gus.checked){await call('plan-delete-project',{teamId:H.team.Id,project:{gusId:p.gusId}});msg=`Deleted “${projLabel(p)}” from GUS and the dashboard.`;}
      pl.projects=pl.projects.filter(x=>x.id!==pid);pl.epics=pl.epics.filter(e=>e.projectId!==pid);pl.hiddenProjects=[...new Set([...(pl.hiddenProjects||[]),pid])]; // hidden for this team only; other teams keep the shared project
      closeModal();draw();queueSave();window.toast?.(msg,warn);
    }catch(e){err.textContent=String(e&&e.message||e)+(gus&&gus.checked?' The project was kept on the dashboard.':'');err.hidden=false;sync();}};
}
function openModal(title,body,opener){
  closeModal();const el=document.createElement('div');el.className='nd-overlay';
  el.innerHTML=`<div class="nd-modal pl-modal" role="dialog" aria-modal="true" aria-labelledby="pl-mt"><div class="nd-head"><h2 id="pl-mt">${esc(title)}</h2><button type="button" class="nd-x" data-close aria-label="Close">×</button></div><div id="pl-mb">${body}</div></div>`;
  H.popHost().appendChild(el);
  modal={el,opener,key:e=>{if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();closeModal();}}};document.addEventListener('keydown',modal.key,true);
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-close]'))closeModal();});
  (el.querySelector('input,button.primary')||el.querySelector('[data-close]')).focus();return el;
}
function openLeaves(){
  const m=P.members.filter(isEng),wd=workdays(P.plan.window.start,P.plan.window.end);
  const el=openModal('Leaves, holidays & on-call',`<p class="note">Days off for each engineer inside the planning window (${esc(P.plan.window.start)} → ${esc(P.plan.window.end)}, ${wd} working days). On-call is the effort each engineer spends on rotation (not available for planned work). Total days default to the weekdays in the window and can be edited per engineer. Available days = total − leave − holidays − on-call.</p>
  <div class="pl-leaves"><div class="pl-leaves-h"><span>Engineer</span><span><b>Total (days)</b></span><span>Leave (days)</span><span>Holidays (days)</span><span>On-call (days)</span><span><b>Available</b></span><span></span></div>${m.map(x=>{const p=P.plan.people[x.id]||{};return `<div class="pl-leaves-r" data-id="${esc(x.id)}"><span>${esc(x.name)}</span><input class="hub-inline pl-total" type="number" min="0" max="366" step="0.5" inputmode="decimal" aria-label="Total days for ${esc(x.name)}" data-k="total" title="Weekdays in the planning window; edit if this engineer joins or leaves part-way" value="${fmt(p.total!=null?p.total:wd)}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Leave days for ${esc(x.name)}" data-k="leave" value="${p.leave?fmt(p.leave):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Holiday days for ${esc(x.name)}" data-k="holiday" value="${p.holiday?fmt(p.holiday):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="On-call days for ${esc(x.name)}" data-k="oncall" value="${p.oncall?fmt(p.oncall):''}"><b data-av>${fmt(Math.max(0,(p.total!=null?p.total:wd)-(p.leave||0)-(p.holiday||0)-(p.oncall||0)))}</b><button type="button" class="pl-ib pl-rm" data-eng-rm="${esc(x.id)}" aria-label="Remove ${esc(x.name)} from planning" title="Remove from planning">×</button></div>`;}).join('')||'<p class="note">No team members loaded.</p>'}</div>
  <div class="pl-eng-add"><label>Add engineer <select class="hub-inline" id="pl-eng-pick" aria-label="Add an engineer from any CFS team"><option value="">Loading CFS team members…</option></select></label><button type="button" class="button" id="pl-eng-add" disabled>Add</button></div><p class="note">Pick anyone on a CFS team. Removing only hides an engineer from this plan's capacity; the GUS team roster is unchanged, and existing workstream assignments are kept.</p>
  <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-leaves-save">Save</button></div>`,document.getElementById('pl-leaves'));
  el.addEventListener('input',e=>{const r=e.target.closest('.pl-leaves-r');if(!r)return;const v=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0);r.querySelector('[data-av]').textContent=fmt(Math.max(0,(r.querySelector('[data-k=total]').value===''?wd:v('total'))-v('leave')-v('holiday')-v('oncall')));});
  const saveRows=()=>{
    el.querySelectorAll('.pl-leaves-r').forEach(r=>{const id=r.dataset.id,g=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0),leave=g('leave'),holiday=g('holiday'),oncall=g('oncall'),tv=r.querySelector('[data-k=total]').value,total=tv===''?wd:g('total'),custom=total!==wd;
      if(leave||holiday||oncall||custom){const o={name:(P.members.find(x=>x.id===id)||{}).name||'',leave,holiday,oncall};if(custom)o.total=total;P.plan.people[id]=o;}else delete P.plan.people[id];});
  };
  const reopen=()=>{saveRows();closeModal();drawSummary();queueSave();openLeaves();};
  el.addEventListener('click',e=>{const x=e.target.closest('[data-eng-rm]');if(!x)return;const id=x.dataset.engRm;P.plan.extraEng=(P.plan.extraEng||[]).filter(g=>g.id!==id);if(!(P.plan.hiddenEng||[]).includes(id)&&P.members.some(g=>g.id===id&&!g.extra))P.plan.hiddenEng=[...(P.plan.hiddenEng||[]),id];delete P.plan.people[id];syncExtraEng();reopen();});
  (async()=>{const pick=el.querySelector('#pl-eng-pick'),add=el.querySelector('#pl-eng-add');try{
    if(!P.allMem)P.allMem=Promise.all((H.teams||[]).map(t=>call('hub-members',{teamId:t.Id}).then(r=>r.members||[],()=>[])));
    const lists=await P.allMem;if(!pick.isConnected)return;const cur=new Set(P.members.filter(isEng).map(g=>g.id)),seen=new Map();
    lists.flat().forEach(g=>{if(g&&g.id&&!cur.has(g.id)&&!seen.has(g.id))seen.set(g.id,g.name);});
    const opts=[...seen].sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
    pick.innerHTML='<option value="">'+(opts.length?'Select a team member…':'Everyone on CFS teams is already included')+'</option>'+opts.map(([id,n])=>`<option value="${esc(id)}">${esc(n)}</option>`).join('');
    pick.onchange=()=>{add.disabled=!pick.value;};
    add.onclick=()=>{const id=pick.value,n=seen.get(id);if(!id)return;const ro=P.members.find(g=>g.id===id&&!g.extra);
      P.plan.hiddenEng=(P.plan.hiddenEng||[]).filter(h=>h!==id);
      if((!ro||H.leaderRank(ro.name)>=0)&&!(P.plan.extraEng||[]).some(g=>g.id===id))P.plan.extraEng=[...(P.plan.extraEng||[]),{id,name:n}];
      syncExtraEng();reopen();};
  }catch(_){pick.innerHTML='<option value="">Could not load team members</option>';}})();
  el.querySelector('#pl-leaves-save').onclick=()=>{saveRows();
    closeModal();drawSummary();queueSave();
  };
}
async function openCommit(btl){
  const opener=document.getElementById('pl-commit');await flush();
  if(P.state==='conflict'||P.state==='error')return window.toast?.('Resolve the save problem before saving to GUS.',true);
  const el=openModal('Save to GUS','<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Checking the plan…</div>',opener);
  try{
    const {preview}=await call('plan-commit',{teamId:H.team.Id,confirm:false,includeBtl:!!btl}),it=preview.items,bl=preview.blockers.length;
    const rels=[...new Set(it.map(x=>x.release).filter(Boolean))],tot=it.reduce((a,x)=>a+(Number(x.effort)||0),0),nc=it.filter(x=>x.action==='create').length,nu=it.filter(x=>x.action==='update').length,nn=it.filter(x=>x.action==='unchanged').length,np=new Set(it.filter(x=>x.projectAction==='create-or-link').map(x=>x.project)).size;
    const wsRows=x=>x.workstreams.length?`<table class="pl-rv-ws"><thead><tr><th>Workstream</th><th>Engineer(s)</th><th>Days</th><th>Status</th></tr></thead><tbody>${x.workstreams.map(w=>`<tr><td>${esc(w.name||'(unnamed)')}</td><td>${esc(w.eng||'Unassigned')}</td><td>${fmt(w.days)}</td><td>${esc(w.status||'—')}</td></tr>`).join('')}</tbody></table>`:'<p class="note">No workstreams.</p>';
    const kv=(k,v)=>v?`<span><i>${k}</i>${esc(v)}</span>`:'';
    el.querySelector('#pl-mb').innerHTML=`<label class="pl-btl-opt"><input type="checkbox" id="pl-incl-btl"${btl?' checked':''}><span>Also save below-the-line (BTL) epics to GUS</span></label>
    ${it.length?`<div class="pl-rv-sum" role="group" aria-label="Summary"><div><b>${it.length}</b><span>epic${it.length===1?'':'s'}</span></div><div><b>${nc}</b><span>to create</span></div><div><b>${nu}</b><span>to update</span></div><div><b>${nn}</b><span>unchanged (skipped)</span></div><div><b>${np}</b><span>new project${np===1?'':'s'}</span></div><div><b>${fmt(tot)}</b><span>planned days</span></div></div><p class="pl-rv-rel"><i>Planned release${rels.length===1?'':'s'}</i> ${esc(rels.join(', ')||'None set')}</p>`:`<div class="pl-rv-empty"><b>Nothing to save yet</b><span>${preview.skipped?`${preview.skipped} below-the-line epic(s) are not included. Tick the box above to include them.`:'No epics are above the line (ABL) yet. Mark an epic ABL in the planner, then come back.'}</span></div>`}
    ${it.length?`<p class="note">Review every epic below. Nothing is written to GUS until you accept; only new or changed epics are sent (a new workstream on a saved epic updates that epic's effort and description, never creates another epic) and each epic is created (or updated) under its planned release, with its project, priority, planned effort, development lead and a description of all plan details.${preview.skipped?` ${preview.skipped} below-the-line epic(s) stay in the dashboard.`:''}</p>`:''}
    ${it.length?`<div class="pl-review pl-rv-list">${it.map((x,i)=>`<details class="pl-review-r pl-rv${x.problems.length?' bad':''}"${i<3||x.problems.length?' open':''}><summary><b>${esc(x.name||'(unnamed epic)')}</b><span class="pl-rv-tag ${x.action==='create'?'new':'upd'}">${x.action==='create'?'Create':x.action==='update'?'Update existing':'Unchanged — not re-sent'}</span><span class="pl-rv-tag">${esc(x.line||'')}</span><span class="pl-rv-eff">${fmt(x.effort)} days</span></summary>
      <div class="pl-rv-kv">${kv('Project',(x.project||'—')+(x.projectAction==='create-or-link'?' (created or linked)':''))}${kv('Program',x.program||'—')}${kv('Planned release',x.release||'—')}${kv('Priority',x.priority==null?'—':String(x.priority))}${kv('Owner(s)',(x.owners||[]).join(', '))}${kv('Status',x.status)}${kv('Theme',x.theme)}${kv('HRP',x.hrp)}${kv('V2MOM',x.v2mom)}${kv('Design doc',x.doc)}</div>
      ${wsRows(x)}${x.problems.map(p=>`<em>⚠ ${esc(p)}</em>`).join('')}</details>`).join('')}</div>`:''}
    ${it.length&&!bl?`<label class="pl-ack"><input type="checkbox" id="pl-ack"> I have reviewed this summary and accept creating/updating the ${it.length} epic${it.length===1?'':'s'} above in GUS under the planned release${rels.length===1?'':'s'} shown.</label>`:''}
    <div class="nd-actions"><button type="button" class="button" data-close>${it.length?'Cancel':'Close'}</button>${it.length?'<button type="button" class="button primary" id="pl-confirm" disabled>Accept &amp; create in GUS</button>':''}</div>`;
    const ack=el.querySelector('#pl-ack'),cf=el.querySelector('#pl-confirm');if(ack)ack.onchange=()=>{cf.disabled=!ack.checked;};
    el.querySelector('#pl-incl-btl').onchange=ev=>{closeModal();openCommit(ev.target.checked);};
    if(cf)cf.onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Saving to GUS…';
      try{const r=await call('plan-commit',{teamId:H.team.Id,confirm:true,includeBtl:!!btl,acknowledged:true});showResult(r);}catch(err){el.querySelector('#pl-mb').insertAdjacentHTML('afterbegin',`<p class="nd-msg error">${esc(err.message)}</p>`);b.disabled=false;b.textContent='Accept & create in GUS';}};
  }catch(err){el.querySelector('#pl-mb').innerHTML=`<p class="nd-msg error">${esc(err.message)}</p><div class="nd-actions"><button type="button" class="button" data-close>Close</button></div>`;}
}
function showResult(r){
  if(r.plan){P.plan=r.plan;P.rev=r.revision;draw();}else load(P.el);
  snapGus();
  const ok=r.results.filter(x=>x.ok).length;
  openModal(r.failed?'Saved with errors':'Saved to GUS',`<p class="note">${ok} of ${r.results.length} epic(s) saved to GUS${r.failed?`; ${r.failed} failed and can be retried — saved ones are not duplicated`:''}.${r.saveError?` The draft could not record the GUS ids (${esc(r.saveError)}); reload before retrying.`:''}</p>
  <div class="pl-review">${r.results.map(x=>`<div class="pl-review-r${x.ok?'':' bad'}"><b>${esc(x.name)}</b><span>${x.ok?esc([x.project,x.action,x.note].filter(Boolean).join(' · ')):'⚠ '+esc(x.error)}</span>${x.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(x.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:''}</div>`).join('')}</div>
  <div class="nd-actions"><button type="button" class="button primary" data-close>Done</button></div>`,null);
}

// ── Page ────────────────────────────────────────────────────────────────────
// The shared HRP projects exist in each team's own GUS program: link them here by exact name so epics commit under the team's own project.
function linkSharedProjects(){
  const prog=P.refs&&P.refs.program;if(!prog||!P.plan)return;
  const byName=new Map((P.refs.projects||[]).filter(r=>r.programId===prog.id).map(r=>[r.name,r]));let n=0;
  for(const p of P.plan.projects){if(!/^hrp-m/.test(p.id)||(p.gusId&&p.programId===prog.id))continue;const r=byName.get(p.name);if(r){p.gusId=r.id;p.programId=prog.id;p.programName=prog.name;n++;}}
  return n;
}
async function load(el){
  const my=++P.seq;clearTimeout(P.timer);P.state='idle';P.plan=null;
  el.querySelector('#pl-sum').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading plan…</div>';el.querySelector('#pl-planner').innerHTML='';
  try{
    const id=H.team.Id,[g,refs,members]=await Promise.all([call('plan-get',{teamId:id}),call('plan-refs',{teamId:id}).catch(e=>({releases:[],programs:[],projects:[],sprints:[],warnings:[e.message]})),H.members().catch(()=>[])]);
    if(my!==P.seq)return;
    P.noGusSync=false;P.plan=g.plan.window.start?g.plan:{...g.plan,window:emptyPlan().window};setTimeout(snapGus,0);P.rev=g.revision;P.plan.epics.forEach(deriveLine);P.refs=refs;P.members=members;syncExtraEng();const linked=linkSharedProjects();
    const w=refs.warnings||[];el.querySelector('#pl-warn').innerHTML=w.length?`<p class="note pl-warn">Some GUS lists did not load (${esc(w.join('; '))}). Pickers may be incomplete.</p>`:'';
    fillRel();syncCommitBtn();
    el.querySelector('#pl-last').textContent=P.plan.lastCommit&&P.plan.lastCommit.at?`Last saved to GUS ${new Date(P.plan.lastCommit.at).toLocaleString()} (${P.plan.lastCommit.created} created, ${P.plan.lastCommit.updated} updated)`:'';
    draw();setState('idle');if(linked)queueSave(); // after idle, or the save would be skipped
    fillLeads();
  }catch(e){if(my===P.seq)el.querySelector('#pl-sum').innerHTML=`<div class="empty-state hub-empty"><h3>Could not load the plan</h3><p>${esc(e.message)}</p></div>`;}
}
H.register({id:'plan',label:'Release Planning (Quarterly)',icon:'plan',tone:'green',desc:'Plan projects, epics and effort against team capacity',needsTeam:true,
  stat:()=>({text:'Planned vs available capacity, ABL and BTL'}),
  render(el){
    P.el=el;
    el.innerHTML=`<div class="executive-heading"><div><h2>${icon('plan','green')} Release Planning (Quarterly)</h2><p>Plan projects, epics and workstreams for ${esc(H.team.Name)}. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.</p></div><div class="heading-actions"><span id="pl-state" class="pl-state" role="status" aria-live="polite"></span><div class="pl-dates"><label>Planned Release <select class="hub-inline" id="pl-rel" aria-label="Planned release"></select></label><span class="pl-win" id="pl-win"><label>Release Window <input type="date" class="hub-inline" id="pl-start" aria-label="Release Window start"></label><span aria-hidden="true">→</span><input type="date" class="hub-inline" id="pl-end" aria-label="Release Window end"></span><span class="note" id="pl-last"></span></div><button type="button" class="button pl-hb pl-hb-leaves" id="pl-leaves"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> Leaves &amp; on-call</button><button type="button" class="button pl-hb pl-hb-save" id="pl-save" title="Save your entries to the shared GUS Apps backend (also saved automatically)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l4 4v14H5zM8 3v6h8V3M8 21v-7h8v7"/></svg> Save</button><button type="button" class="button primary" id="pl-commit">Review &amp; save to GUS</button></div></div>
    <div id="pl-warn"></div>
    <div class="pl-tabs" role="tablist" aria-label="Release planning views"><button type="button" role="tab" data-tab="plan" class="on" aria-selected="true"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 8.5h14M8 8.5V16"/></svg>Release Planner</button><button type="button" role="tab" data-tab="rps" aria-selected="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5"/></svg>Planned Release Summary</button></div>
    <div id="pl-main"><div id="pl-sum"></div>
    <section id="pl-fs" class="pl-fs"><div class="pl-hdr"><div class="pl-planner-h"><h3>${icon('plan','green')} V2MOM Measures &amp; Epics Plan</h3><span class="pl-planner-btns"><button type="button" class="button" id="pl-fs-btn" aria-pressed="false" title="Show Projects &amp; epics full screen">Full screen</button><span class="pl-dm"><button type="button" class="button" data-dm-toggle aria-haspopup="menu" aria-expanded="false">Import / Export ▾</button><span class="pl-dm-list" role="menu" hidden><button type="button" role="menuitem" data-v2mom-open title="Import V2MOM measures from a sheet as GUS projects for this team"><b>V2MOM Import</b><small>Create projects from a V2MOM sheet, link or HTML</small></button><button type="button" role="menuitem" id="pl-import" title="Import plan rows from the exported template"><b>Import plan from file</b><small>Excel template (.xlsx)</small></button><button type="button" role="menuitem" id="pl-export" title="Download an Excel template with the current plan, column headers and dropdown lists"><b>Export template</b><small>Current plan with column headers and lists</small></button></span></span><input type="file" id="pl-import-file" accept=".xlsx" hidden></span></div><div id="pl-tools" class="pl-tools"></div></div><div id="pl-planner"></div></section></div><div id="pl-rps" hidden></div>`;
    {const hd=el.querySelector('.executive-heading'),tb=el.querySelector('.pl-tabs'),ac=hd&&hd.querySelector('.heading-actions');if(hd&&tb&&ac){tb.title='Plan projects, epics and workstreams for '+H.team.Name+'. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.';tb.appendChild(ac);hd.remove();}}
    P.tab='plan';
    // Review & save to GUS is limited to the plan administrators (also enforced by the backend); disabled until the backend confirms.
        el.oninput=onInput;
    el.onchange=ev=>{if(ev.target.id==='pl-rel'){pickRel(ev.target.value);return;}if(ev.target.closest('#pl-start,#pl-end')){const s=el.querySelector('#pl-start').value,e=el.querySelector('#pl-end').value;if(P.plan&&P.plan.window.releaseId){P.plan.window.releaseId='';const rs=el.querySelector('#pl-rel');if(rs)rs.value='';}if(s&&e&&s<=e&&P.plan){P.plan.window={start:s,end:e};drawSummary();queueSave();}else if(s&&e&&s>e)window.toast?.('End date must be on or after the start date.',true);return;}onInput(ev);};
    document.querySelectorAll('#pl-back').forEach(x=>x.remove());
    const bar=document.querySelector('.dashboard-bar');if(bar){const bk=document.createElement('a');bk.href='#/home';bk.id='pl-back';bk.className='pl-back';bk.title='Back to Team Hub — Team Hub for this team';bk.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4 6 10l6 6M6 10h10"/></svg><span>Back to Team Hub</span>';
      bk.onclick=async ev=>{ev.preventDefault();if(P.state==='dirty'&&!await H.confirm({title:'Unsaved changes',message:'You have unsaved changes. Leave without saving?',ok:'Leave',cancel:'Stay',danger:true}))return;if(P.state==='dirty')P.state='saved';const m=location.pathname.match(/^.*\/applets\/cfs-release-review-tracker\//);if(m){try{(window.top||window).location.assign(m[0]);}catch(_){location.assign(m[0]);}}else H.go('home');};bar.appendChild(bk);}el.onclick=onClick;wireDrag(el);wireColDrag(el);el.querySelector('#pl-import-file').onchange=ev=>{const f=ev.target.files[0];ev.target.value='';if(f)f.arrayBuffer().then(b=>openImport(b,el.querySelector('#pl-import')));};load(el);
  }});
H.onEsc('plan',()=>{closeModal();return true;});
window.addEventListener('beforeunload',e=>{if(P.state==='dirty'||P.state==='saving'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hub:team',()=>{closeModal();clearTimeout(P.timer);});
})();
