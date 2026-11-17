/* Release Planning: engineers plan projects, epics and workstreams (effort in days), mark epics above/below the line (ABL/BTL),
 * and the dashboard derives planned vs available capacity live. The draft saves to GUS Apps; only ABL epics are written to GUS on confirm.
 * Every interpolated value in the templates below goes through esc() or is a number from fmt(). */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const P={plan:null,rev:null,refs:{releases:[],programs:[],projects:[],sprints:[]},members:[],seq:0,timer:0,state:'idle',stateAt:'',inflight:null,el:null};
P.open={theme:false,eng:false,exec:false};
P.view={q:'',release:[],line:[],eng:[],theme:[],group:'project',flag:'',kpi:''};
const MF=['release','line','eng','theme'],FKEY='pl-filters-';
const filtersOn=V=>!!(V.q||V.flag||MF.some(k=>V[k].length));
/** Saved filter selections per team: kept in memory for the session and in localStorage when the frame allows it. */
const memFilters={};
function restoreFilters(){const t=H.team&&H.team.Id;if(!t||P.view._team===t)return;P.view._team=t;let v=memFilters[t];if(!v){try{v=JSON.parse(localStorage.getItem(FKEY+t));}catch(_){}}MF.forEach(k=>{P.view[k]=v&&Array.isArray(v[k])?v[k].slice():[];});}
function saveFilters(){P.view.flag='';P.view.kpi='';const t=H.team&&H.team.Id;if(!t)return;const v={};MF.forEach(k=>{v[k]=P.view[k].slice();});memFilters[t]=v;try{localStorage.setItem(FKEY+t,JSON.stringify(v));}catch(_){}}
// Grid columns: chooser order = default order; the first GDEF are shown until the user picks their own (saved in this browser).
const GCOL={project:'Project',name:'Epic Name',ws:'Workstream',owners:'Epic Owner',engs:'Workstream Owner(s)',estimate:'Epic Est',days:'WS Est',line:'ATL/BTL',sprint:'Sprint',priority:'Priority',status:'Status',release:'Release',theme:'Theme',wstatus:'WS status',doc:'Doc',gus:'GUS',hrp:'HRP V2MOM method',v2mom:'CFS V2MOM',pmethod:'V2MOM method (project)'};
const GW={project:112,name:230,ws:200,owners:120,priority:84,estimate:84,status:116,engs:170,days:72,sprint:120,release:150,line:104,theme:130,wstatus:116,doc:150,gus:84,hrp:130,v2mom:130,pmethod:240,act:92};
const GDEF=['project','name','ws','owners','engs','days','estimate','line','sprint'],GKEY='pl-grid-cols';
let memCols; // in-memory source of truth: localStorage can be blocked inside the GUS Apps frame, so the session always works and storage is best-effort persistence
const gridCols=()=>{let v=memCols;if(v===undefined){try{v=JSON.parse(localStorage.getItem(GKEY));}catch(_){}}const keep=Array.isArray(v)?v.filter(k=>GCOL[k]):null;if(!keep||!keep.length)return GDEF.slice();const o=[...new Set(keep)],i=o.indexOf('estimate');if(i>=0&&o[i+1]==='days'){o[i]='days';o[i+1]='estimate';}return o;};
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
// "+ Project" / "+ Epic": a sectioned dialog that creates the record in GUS right away (plan administrators only).
const crField=(label,hint,ctl,cls)=>`<label class="pl-cr-f${cls?' '+cls:''}"><span>${label}${hint?` <small>${hint}</small>`:''}</span>${ctl}</label>`;
const crSection=(title,body)=>`<section class="pl-cr-s"><h3>${title}</h3><div class="pl-cr-g">${body}</div></section>`;
const crAuto=rows=>`<dl class="pl-cr-auto">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
function crDialog(title,sub,bodyHtml,okLabel,submit){
  const el=openModal(title,`<p class="pl-cr-sub">${esc(sub)}</p>${bodyHtml}<p class="pl-cr-err" role="alert" hidden></p><div class="pl-cr-foot"><span class="note">Created in GUS immediately when you confirm.</span><span class="toolbar-spacer"></span><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" data-ok disabled>${esc(okLabel)}</button></div>`);
  el.querySelector('.nd-modal').classList.add('pl-cr');
  const ok=el.querySelector('[data-ok]'),err=el.querySelector('.pl-cr-err');
  const fail=m=>{err.textContent=m;err.hidden=!m;};
  let allowed=false,busy=false;
  el._gate=true;const sync=()=>{ok.disabled=(el._gate&&!allowed)||busy;};el._sync=sync;el._deny=()=>fail(el._gate&&!allowed?'Creating records in GUS is restricted to the plan administrators.':'');
  call('connection',{}).then(c=>{allowed=!!(c&&c.canCommit);if(!allowed&&el._gate)fail('Creating records in GUS is restricted to the plan administrators.');sync();},()=>{allowed=true;sync();});
  const go=async()=>{if(ok.disabled)return;fail('');busy=true;ok.textContent='Creating…';sync();
    try{await submit(el,fail);}catch(e){fail(String(e&&e.message||e));}finally{busy=false;ok.textContent=okLabel;sync();}};
  ok.onclick=go;
  el.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&ev.target.tagName==='INPUT'){ev.preventDefault();go();}});
  return el;
}
const crUser=()=>(P.user&&P.user.name)||'You (signed-in GUS user)';
function newProjectAt(){
  const pl=P.plan,prog=P.refs.program,methods=ioLists().methods;
  const inPlan=g=>pl.projects.some(x=>(g.id&&x.gusId===g.id)||x.name.toLowerCase()===g.name.toLowerCase());
  const avail=P.refs.projects.filter(g=>!inPlan(g));
  const mode=`<div class="pl-cr-seg" role="tablist" aria-label="Project source"><button type="button" role="tab" data-mode="pick">Pick from GUS</button><button type="button" role="tab" data-mode="new">Enter new project</button></div>`;
  const body=
    crSection('Project',mode+
      crField('GUS project',`${avail.length} not yet in this plan`,`<select class="hub-inline" data-g>${avail.length?avail.map(g=>opt(g.id,g.name,false)).join(''):opt('','No other projects found in GUS',true)}</select>`,'wide pl-cr-pick')+
      crField('Measure name','new project in GUS',`<input class="hub-inline" type="text" data-n maxlength="120" placeholder="e.g. M1.1.3: Baseline reliability" autocomplete="off">`,'wide pl-cr-new')+
      crField('Project Shortform','e.g. HRP M1.1.3',`<input class="hub-inline" type="text" data-s maxlength="60" placeholder="e.g. HRP M1.1.3">`,'wide')+`<p class="pl-cr-hint" data-hint hidden></p>`)+
    crSection('V2MOM',crField('V2MOM method','saved on the project in GUS',`<input class="hub-inline" type="text" list="pl-cr-methods" data-m maxlength="1000" placeholder="Pick an existing method or type a new one" autocomplete="off"><datalist id="pl-cr-methods">${methods.map(m=>`<option value="${esc(m)}"></option>`).join('')}</datalist>`,'wide'))+
    crSection('Set automatically',crAuto([['Team',H.team.Name],['Program',prog?prog.name:'Not found for this team'],['Owner',crUser()]]));
  let md=avail.length?'pick':'new';
  const el=crDialog('Add project','Pick a project that already exists in GUS, or enter a new one. Either way it is shared with every team.',body,'Add project',async(el,fail)=>{
    const sh=el.querySelector('[data-s]').value.trim(),method=el.querySelector('[data-m]').value.trim();let name,gusId='',r;
    if(md==='pick'){
      const g=avail.find(x=>x.id===el.querySelector('[data-g]').value);if(!g)throw new Error('Pick a project, or switch to “Enter new project”.');
      name=g.name;gusId=g.id;
      r={gusId:g.id,created:false,programId:g.programId,programName:g.programName};
      if(method&&method!==g.method)await call('plan-create-project',{teamId:H.team.Id,project:{name,method,gusId}}).catch(()=>{});
    }else{
      name=el.querySelector('[data-n]').value.trim();
      if(!name){el.querySelector('[data-n]').focus();throw new Error('Enter the measure (project) name.');}
      if(!prog)throw new Error('This team has no GUS program for the planning release, so a project cannot be created.');
      r=await call('plan-create-project',{teamId:H.team.Id,project:{name,method}});
    }
    let p=pl.projects.find(x=>x.gusId===r.gusId);
    if(!p){p={id:uid('p'),name,short:sh||shortProj(name),theme:'',gusId:r.gusId};pl.projects.push(p);}
    Object.assign(p,{name,short:sh||p.short||shortProj(name),method:method||p.method||'',gusId:r.gusId,programId:r.programId,programName:r.programName});
    if(!P.refs.projects.some(x=>x.id===r.gusId))P.refs.projects.push({id:r.gusId,name,programId:r.programId,programName:r.programName,method});
    closeModal();draw();queueSave();window.toast?.(r.created?`Created project “${name}” in GUS.`:`Added GUS project “${name}” to the plan.`,false);
  });
  const g=el.querySelector('[data-g]'),n=el.querySelector('[data-n]'),sh=el.querySelector('[data-s]'),m=el.querySelector('[data-m]'),hint=el.querySelector('[data-hint]'),ok=el.querySelector('[data-ok]');let shTouched=false;
  const known=new Map(P.refs.projects.map(x=>[x.name.toLowerCase(),x]));
  const fillPick=()=>{const x=avail.find(a=>a.id===g.value);if(!x)return;if(!shTouched)sh.value=shortProj(x.name);m.value=x.method||m.value;};
  const setMode=k=>{md=k;sh.value='';m.value='';n.value='';shTouched=false;hint.hidden=true;el._gate=k==='new';el._sync();el._deny();el.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===k;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));});
    el.querySelector('.pl-cr-pick').hidden=k!=='pick';el.querySelector('.pl-cr-new').hidden=k!=='new';ok.textContent=k==='pick'?'Add project':'Create in GUS';
    el.querySelector('.pl-cr-foot .note').textContent=k==='pick'?'Links the existing GUS project; nothing new is created.':'Created in GUS immediately when you confirm.';
    if(k==='pick')fillPick();(k==='pick'?g:n).focus();};
  el.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>setMode(b.dataset.mode);});
  g.onchange=fillPick;sh.oninput=()=>{shTouched=true;};
  n.oninput=()=>{const v=n.value.trim(),hit=known.get(v.toLowerCase()),local=pl.projects.find(x=>x.name.toLowerCase()===v.toLowerCase());
    if(!shTouched)sh.value=(local&&local.short)||(v?shortProj(v):'');
    if(local&&local.method&&!m.value)m.value=local.method;
    hint.hidden=!hit&&!local;hint.textContent=hit||local?'This project already exists in GUS. It will be linked, not duplicated.':'';};
  setMode(md);
}
function newWorkstreamAt(){
  const pl=P.plan;if(!pl.epics.length){window.toast?.('Add an epic first, then add workstreams under it.',true);newEpicAt();return;}
  const prj=new Map(pl.projects.map(p=>[p.id,p])),eng=P.members.filter(isEng).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name)));
  const body=
    crSection('Workstream',crField('Epic','workstream is added under this epic',`<select class="hub-inline" data-e>${pl.epics.map((e,i)=>opt(e.id,`${projShort(prj.get(e.projectId)||{name:''})} › ${e.name||'(unnamed epic)'}`,i===pl.epics.length-1)).join('')}</select>`,'wide')+crField('Workstream name','',`<input class="hub-inline" type="text" data-n maxlength="255" placeholder="e.g. API changes" autocomplete="off">`,'wide'))+
    crSection('Assignment',crField('Engineer','optional',`<select class="hub-inline" data-g><option value="">Unassigned</option>${eng.map(m=>opt(m.id,m.name,false)).join('')}</select>`)+crField('Planned effort','days',`<input class="hub-inline" type="number" min="0" max="1000" step="0.5" data-d placeholder="0">`));
  const el=crDialog('New workstream','Adds a workstream under an epic in this plan. It is written to GUS with the epic when the plan is committed.',body,'Add workstream',async(el)=>{
    const e=pl.epics.find(x=>x.id===el.querySelector('[data-e]').value),name=el.querySelector('[data-n]').value.trim(),gid=el.querySelector('[data-g]').value,days=Number(el.querySelector('[data-d]').value)||0;
    if(!e)throw new Error('Choose the epic.');
    if(!name){el.querySelector('[data-n]').focus();throw new Error('Enter the workstream name.');}
    const m=eng.find(x=>x.id===gid),w={id:uid('w'),name,priority:0,engId:m?m.id:'',engName:m?m.name:'',engIds:m?[m.id]:[],engNames:m?[m.name]:[],days,sprint:''};
    e.workstreams.push(w);closeModal();draw();queueSave();P.el.querySelector(`[data-w="${w.id}"]`)?.scrollIntoView({block:'nearest'});
    window.toast?.(`Added workstream “${name}”.`,false);
  });
  el._gate=false;el._sync();el._deny();el.querySelector('.pl-cr-foot .note').textContent='Saved to the plan immediately.';
  el.querySelector('[data-n]').focus();
}
function newEpicAt(){
  const pl=P.plan;if(!pl.projects.length){newProjectAt();return;}
  const rel=P.refs.releases,dr=defRel(),prog=P.refs.program;
  const body=
    crSection('Epic',crField('Project','',`<select class="hub-inline" data-p>${pl.projects.map((p,i)=>opt(p.id,projShort(p)+(p.gusId?'':'  (new — created with the epic)'),i===pl.projects.length-1)).join('')}</select>`,'wide')+crField('Epic name','',`<input class="hub-inline" type="text" data-n maxlength="255" placeholder="Epic name" autocomplete="off">`,'wide'))+
    crSection('Planning',crField('Development lead','required · also the epic owner',`<select class="hub-inline" data-o><option value="" selected>Select a team member…</option>${P.members.slice().sort((a,b)=>String(a.name).localeCompare(b.name)).map(m=>opt(m.id,m.name,false)).join('')}</select>`,'wide')+crField('Planned release','',`<select class="hub-inline" data-r>${rel.map(r=>opt(r.id,r.name,r.id===dr.releaseId)).join('')||opt('','No releases',true)}</select>`)+crField('ATL/BTL','',`<select class="hub-inline" data-l><option value="ABL">ABL (above the line)</option><option value="BTL" selected>BTL (below the line)</option></select>`)+crField('Planned effort','days',`<input class="hub-inline" type="number" min="0" max="1000" step="0.5" data-d placeholder="0">`))+
    crSection('Set automatically',crAuto([['Team',H.team.Name],['Program',prog?prog.name:'—'],['Epic owner','Same as the development lead']]));
  const el=crDialog('New epic','Creates the epic in GUS under the chosen project and adds it to this plan.',body,'Create in GUS',async(el)=>{
    const pr=pl.projects.find(x=>x.id===el.querySelector('[data-p]').value),name=el.querySelector('[data-n].hub-inline').value.trim(),releaseId=el.querySelector('[data-r]').value,effort=Number(el.querySelector('[data-d]').value)||0,line=el.querySelector('[data-l]').value,leadId=el.querySelector('[data-o]').value,leadName=(P.members.find(m=>m.id===leadId)||{}).name||'';
    if(!pr)throw new Error('Choose a project.');
    if(!name){el.querySelector('[data-n]').focus();throw new Error('Enter the epic name.');}
    if(!leadId){el.querySelector('[data-o]').focus();throw new Error('Select the development lead.');}
    if(!releaseId)throw new Error('Choose the planned release.');
    const r=await call('plan-create-epic',{teamId:H.team.Id,epic:{name,releaseId,effort,leadId,project:{gusId:pr.gusId,name:pr.name,method:pr.method}}});
    pr.gusId=r.projectGusId||pr.gusId;
    const e=newEpic(pr.id),rr=rel.find(x=>x.id===releaseId);e.name=name;e.gusId=r.gusId;if(rr){e.releaseId=rr.id;e.releaseName=rr.name;}
    e.owners=[leadId];e.ownerNames=[leadName];e.line=line;e.workstreams.forEach(x=>{x.line=line;});if(e.workstreams[0])e.workstreams[0].days=effort;
    pl.epics.push(e);closeModal();draw();queueSave();P.el.querySelector(`[data-e="${e.id}"]`)?.scrollIntoView({block:'nearest'});
    window.toast?.(r.created?`Created epic “${name}” in GUS.`:`Epic “${name}” already existed in GUS and was linked.`,false);
  });
  el.querySelector('[data-n].hub-inline').focus();
}
// ── Export template / import (xlsx) ────────────────────────────────────────
// Engineers for planning/allocation: non-leaders plus leaders the backend flags (Ram/Jayant on MQ & MAPS, Jayant on VegaCache).
const isEng=m=>H.leaderRank(m.name)<0||m.alloc;
const IO_COLS=['Method Name (V2MOM Field in Project)','Measure Name (project in GUS)','Project (short form)','Epic Name','Workstream','Epic Owner','Workstream Owner(s)','WS Est (days)','ATL/BTL','Priority','Sprint','Planned Release'];
const IO_ROWS=300;
const projShort=p=>p.short||shortProj(p.name);
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
  document.body.appendChild(d);
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
const memName=id=>(P.members.find(m=>m.id===id)||{}).name||'';
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
const emptyPlan=()=>{const s=new Date(),e=new Date(Date.now()+91*864e5);return {window:{start:iso(s),end:iso(e)},people:{},projects:[],epics:[],lastCommit:null};};

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
  const themes=new Map();let ablT=0,btlT=0;
  for(const e of pl.epics){
    const slices=e.workstreams.filter(w=>(w.days||0)>0).map(w=>({ids:wsEngs(w),d:w.days,nm:w.engName,k:wl(e,w)==='ABL'?'abl':'btl'}));
    for(const {ids,d,nm,k} of slices){const share=d/(ids.length||1),t=epicTheme(e);
      for(const id of ids.length?ids:['']){const x=id?row(id,memName(id)||nm||'Engineer'):row('none','Unassigned');if(!id)x.cap=false;x[k]+=share;
        const tm=x.th.get(t)||x.th.set(t,{abl:0,btl:0,ep:new Map()}).get(t),ep=tm.ep.get(e.id)||tm.ep.set(e.id,{name:e.name||'Untitled epic',abl:0,btl:0}).get(e.id);tm[k]+=share;ep[k]+=share;}
      if(!themes.has(t))themes.set(t,{name:t,abl:0,btl:0});
      if(k==='abl')ablT+=d;else btlT+=d;themes.get(t)[k]+=d;}
  }
  const rows=[...eng.values()],avail=rows.reduce((a,x)=>a+x.avail,0);
  return {wd,rows,avail,abl:r2(ablT),btl:r2(btlT),total:r2(ablT+btlT),themes:[...themes.values()].sort((a,b)=>(b.abl+b.btl)-(a.abl+a.btl))};
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
  el.innerHTML=`<div class="pl-rps-top">${donut}${prio}</div>${health}${boardHtml}${execHtml}${savedHtml}`;
  /* every summary section starts collapsed; the heading toggles it (state kept in P.open) */
  [['.pl-donut-card','r-donut'],['.pl-prio-card','r-prio'],['.pl-board','r-board'],['.pl-saved','r-saved']].forEach(([q,k])=>{const c=el.querySelector('section'+q);if(c)c.dataset.fk=k;});
  const hc=[...el.querySelectorAll(':scope > section.pl-card')].find(c=>!c.dataset.fk&&!c.classList.contains('pl-exec'));if(hc)hc.dataset.fk='r-health';
  el.querySelectorAll('section.pl-card[data-fk]').forEach(c=>{const k=c.dataset.fk,h=c.querySelector(':scope > h3'),on=P.open[k]===true;if(!h)return;
    h.innerHTML=`<button type="button" class="pl-fold" data-fold="${k}" aria-expanded="${on}"><span aria-hidden="true">${on?'▾':'▸'}</span> ${h.innerHTML}</button>`;c.classList.toggle('collapsed',!on);});
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
async function flush(quiet){
  clearTimeout(P.timer);if(P.inflight)await P.inflight;if(P.state!=='dirty'&&P.state!=='error')return P.inflight;
  const my=P.seq;setState('saving');
  P.inflight=call('plan-save',{teamId:H.team.Id,plan:P.plan,revision:P.rev}).then(r=>{if(my!==P.seq)return;P.rev=r.revision;if(P.state==='saving')setState('saved');},e=>{if(my!==P.seq)return;setState(/changed/i.test(e.message)?'conflict':'error');if(!quiet)window.toast?.(e.message,true);});
  return P.inflight;
}

// ── Rendering ───────────────────────────────────────────────────────────────
const opt=(v,l,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(l)}</option>`;
const KPI_ACT={'Available':'all','Planned ABL':'abl','Planned BTL':'btl','Total planned':'all','Headroom (ABL)':'abl','Over capacity':'abl','Time off & on-call':'off','Over-allocated':'over','Unassigned effort':'unassigned','Incomplete epics':'incomplete','Pending GUS save':'pending'};
const KPI_HINT={all:'Show every epic',abl:'Show above-the-line work',btl:'Show below-the-line work',off:'Show epics worked by engineers with time off or on-call',over:'Show epics of over-allocated engineers',unassigned:'Show epics with workstreams that have days but no engineer',incomplete:'Show epics missing an owner or an estimate',pending:'Show ABL epics not yet saved to GUS'};
const kpi=(label,val,sub,cls='',ic='chart',tone='blue',chip='')=>{const a=KPI_ACT[label]||'';return `<div class="pl-kpi pl-t-${tone} ${cls}${a&&P.view.kpi===a?' pl-kpi-on':''}"${a?` data-kpi="${a}" role="button" tabindex="0" title="${KPI_HINT[a]} in the grid" aria-pressed="${P.view.kpi===a}"`:''}>${icon(ic,tone)}<div class="pl-kpi-b"><span>${esc(label)}</span><b>${val}</b><small>${sub}</small></div>${chip?`<em class="pl-chip">${esc(chip)}</em>`:''}</div>`;};
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
  hideTip();ttEl=document.createElement('div');ttEl.className='pl-tt';ttEl.setAttribute('role','tooltip');ttEl.innerHTML=engTipHtml(x);document.body.appendChild(ttEl);
  const r=host.getBoundingClientRect(),w=ttEl.offsetWidth,h=ttEl.offsetHeight;
  let left=Math.min(Math.max(8,r.right-w),innerWidth-w-8),top=r.top-h-8;if(top<8)top=Math.min(r.bottom+8,innerHeight-h-8);
  ttEl.style.left=left+'px';ttEl.style.top=top+'px';
}
/** Extra planning-risk tiles: capacity lost to time off, engineers planned beyond availability, effort with no engineer, epics missing an owner or estimate. */
const extraKpis=m=>{const cap=m.rows.filter(x=>x.cap),sum=k=>r2(cap.reduce((a,x)=>a+(x[k]||0),0)),lost=r2(sum('leave')+sum('holiday')+sum('oncall')),
  over=cap.filter(x=>x.abl+x.btl>x.avail+0.001),un=m.rows.find(x=>!x.cap),unD=un?r2(un.abl+un.btl):0,
  inc=P.plan.epics.filter(e=>!(e.owners&&e.owners.length)||!e.workstreams.some(w=>(w.days||0)>0)),short=a=>a.slice(0,2).map(x=>esc(x.name.split(' ')[0])).join(', ')+(a.length>2?` +${a.length-2}`:'');
  return kpi('Time off & on-call',fmt(lost)+'<i>d</i>',`${fmt(sum('leave'))} leave · ${fmt(sum('holiday'))} holidays · ${fmt(sum('oncall'))} on-call`,'','calendar','amber','RoB/KTLO')
   +kpi('Over-allocated',String(over.length)+'<i> eng</i>',over.length?`Planned beyond availability: ${short(over)}`:'Everyone is within availability',over.length?'over':'ok','users',over.length?'rose':'green',over.length?'Review':'Balanced')
   +kpi('Unassigned effort',fmt(unD)+'<i>d</i>',unD?'Workstreams with days but no engineer':'Every workstream has an engineer',unD?'warn':'ok','risk',unD?'amber':'green',unD?'Assign':'Covered')
   +kpi('Incomplete epics',String(inc.length)+'<i> of '+P.plan.epics.length+'</i>',inc.length?'Missing an owner or an estimate':'All epics have an owner and an estimate',inc.length?'warn':'ok','scope',inc.length?'amber':'green',inc.length?'Fix':'Complete')
   +(()=>{const abl=P.plan.epics.filter(e=>e.line==='ABL'),pend=abl.filter(e=>!e.gusId).length;
     return kpi('Pending GUS save',String(pend)+'<i> of '+abl.length+' ABL</i>',!abl.length?'No above-the-line epics yet':pend?`${pend} ABL epic${pend===1?'':'s'} not yet created in GUS`:'All ABL epics are saved in GUS',pend?'warn':'ok','database',pend?'amber':'green',!abl.length?'Plan':pend?'Review & save':'In sync');})();};
/** A summary tile filters the grid below to the data behind it; clicking the active tile again clears the filter. */
function applyKpi(a){
  const V=P.view,cap=(P.engRows||[]).filter(x=>x.cap);
  if(V.kpi===a){Object.assign(V,{q:'',release:[],line:[],eng:[],theme:[]});saveFilters();}
  else{
    let eng=[];
    if(a==='over')eng=cap.filter(x=>x.abl+x.btl>x.avail+0.001).map(x=>x.id);
    if(a==='off')eng=cap.filter(x=>(x.leave||0)+(x.holiday||0)+(x.oncall||0)>0).map(x=>x.id);
    if((a==='over'||a==='off')&&!eng.length){window.toast?.(a==='over'?'No engineers are over-allocated.':'No engineer has time off or on-call.',false);return;}
    Object.assign(V,{q:'',release:[],line:a==='abl'?['ABL']:a==='btl'?['BTL']:[],eng,theme:[]});saveFilters();
    V.flag=['unassigned','incomplete','pending'].includes(a)?a:'';V.kpi=a;
  }
  drawSummary();drawTools();drawPlanner();wire();
  const g=P.el.querySelector('#pl-planner');if(g&&P.tab!=='rps')g.scrollIntoView({block:'nearest'});
}
function drawSummary(){
  if(P.tab==='rps')drawRps();
  const el=P.el&&P.el.querySelector('#pl-sum');if(!el)return;
  const m=model();P.engRows=m.rows;const pctA=m.avail?Math.round(m.abl/m.avail*100):0,pctT=m.avail?Math.round(m.total/m.avail*100):0,head=r2(m.avail-m.abl);
  const maxT=Math.max(1,...m.themes.map(t=>t.abl+t.btl));
  el.innerHTML=`<div class="pl-kpis">${kpi('Available',fmt(m.avail)+'<i>d</i>',`${m.wd} working days × ${m.rows.filter(x=>x.cap).length} engineers, less leaves, holidays and on-call`,'','users','blue',m.wd+' working days')}${kpi('Planned ABL',fmt(m.abl)+'<i>d</i>',`${pctA}% of available`,tone(pctA),'flag','green','ABL '+pctA+'%')}${kpi('Planned BTL',fmt(m.btl)+'<i>d</i>','stretch work below the line','','clock','amber','BTL')}${kpi('Total planned',fmt(m.total)+'<i>d</i>',`${pctT}% of available`,tone(pctT),'chart','violet',pctT+'% used')}${kpi(head<0?'Over capacity':'Headroom (ABL)',fmt(Math.abs(head))+'<i>d</i>',head<0?'ABL exceeds what the team can deliver':'available after ABL',head<0?'over':'ok',head<0?'risk':'bolt',head<0?'rose':'teal',head<0?'Over':'On track')}${extraKpis(m)}</div>
  <div class="pl-sum-grid"><section class="pl-card${P.open.theme?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="theme" aria-expanded="${P.open.theme}"><span aria-hidden="true">${P.open.theme?'▾':'▸'}</span> ${icon('chart','violet')} By theme / method</button><small>${P.open.theme?'Collapse':'Expand'}</small></h3>${m.themes.length?m.themes.map(t=>`<div class="pl-bar-row"><span class="pl-bar-l" title="${esc(t.name)}">${esc(t.name)}</span><div class="pl-bar"><i class="abl" style="width:${t.abl/maxT*100}%"></i><i class="btl" style="width:${t.btl/maxT*100}%"></i></div><span class="pl-bar-v">${fmt(t.abl)}<small> ABL</small> · ${fmt(t.btl)}<small> BTL</small></span></div>`).join(''):'<p class="note">Add effort to workstreams to see the split.</p>'}<p class="pl-legend"><i class="abl"></i>ABL <i class="btl"></i>BTL</p></section>
  <section class="pl-card${P.open.eng?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="eng" aria-expanded="${P.open.eng}"><span aria-hidden="true">${P.open.eng?'▾':'▸'}</span> ${icon('users','blue')} Engineer bandwidth</button><small>${P.open.eng?'Collapse':'Expand'}</small></h3><div class="pl-eng" role="table" aria-label="Engineer bandwidth"><div class="pl-eng-h" role="row"><span>Engineer</span><span class="b">Total</span><span>Leave</span><span>Holidays</span><span>On-call</span><span class="b">Available</span><span class="b">Prioritised (ABL)</span><span title="Planned, Not Priority (BTL)">Not Priority (BTL)</span><span class="pl-alloc-h">Allocation % <small><i class="a"></i>Prioritised (ABL) <i class="b"></i>Planned, Not Priority (BTL) <i class="f"></i>Unplanned</small></span></div>${m.rows.length?m.rows.map(x=>{const pct=x.avail?Math.round((x.abl+x.btl)/x.avail*100):((x.abl+x.btl)?999:0),pa=x.avail?Math.round(x.abl/x.avail*100):0,pb=x.avail?Math.round(x.btl/x.avail*100):0,pf=Math.max(0,100-pa-pb),sa=Math.min(pa,100),sb=Math.max(0,Math.min(pb,100-sa));
    return `<div class="pl-eng-r${x.cap?'':' pl-eng-un'}${!x.cap&&P.view.kpi==='unassigned'?' pl-eng-un-on':''}" role="row"${x.cap?'':' data-kpi="unassigned" tabindex="0" title="Show epics with unassigned workstream effort"'}><span class="pl-eng-n" title="${esc(x.name)}">${H.avatarHtml?H.avatarHtml(x.id,x.name,22):''}<span>${esc(x.name)}</span></span><span class="b">${x.cap?fmt(x.total):'—'}</span><span>${x.cap?fmt(x.leave||0):'—'}</span><span>${x.cap?fmt(x.holiday||0):'—'}</span><span>${x.cap?fmt(x.oncall||0):'—'}</span><span class="b">${x.cap?fmt(x.avail):'—'}</span><span class="b">${fmt(x.abl)}</span><span>${fmt(x.btl)}</span><span class="pl-alloc ${x.cap?tone(pct):'over'}" tabindex="0" data-tip-eng="${esc(x.id)}" aria-label="${x.cap?`${esc(x.name)}: Prioritised (ABL) ${fmt(x.abl)}d = ${pa}%, Planned, Not Priority (BTL) ${fmt(x.btl)}d = ${pb}%, Unplanned ${pf}%, of ${fmt(x.avail)}d available`:'No availability set'}">${x.cap?`<span class="pl-alloc-bar"><i class="a" style="width:${sa}%"></i><i class="b" style="width:${sb}%"></i></span><b><em class="a">${pa}%</em> + <em class="b">${pb}%</em> + <em class="f">${pf}%</em> = <strong>${pa+pb+pf>=999?'—':(pa+pb+pf)+'%'}</strong></b>`:'<b>unassigned</b>'}</span></div>`;}).join(''):'<p class="note">No team members loaded.</p>'}${(()=>{const cr=m.rows.filter(x=>x.cap&&x.avail),av=cr.reduce((t,x)=>t+x.avail,0),ta=cr.reduce((t,x)=>t+x.abl,0),tb=cr.reduce((t,x)=>t+x.btl,0);if(!av)return '';const qa=Math.round(ta/av*100),qb=Math.round(tb/av*100),qf=Math.max(0,100-qa-qb);return `<div class="pl-eng-r pl-eng-tot" role="row"><span class="pl-eng-n">Team total</span><span class="b">${fmt(cr.reduce((t,x)=>t+x.total,0))}</span><span>${fmt(cr.reduce((t,x)=>t+(x.leave||0),0))}</span><span>${fmt(cr.reduce((t,x)=>t+(x.holiday||0),0))}</span><span>${fmt(cr.reduce((t,x)=>t+(x.oncall||0),0))}</span><span class="b">${fmt(av)}</span><span class="b">${fmt(ta)}</span><span>${fmt(tb)}</span><span class="pl-alloc ${tone(qa+qb)}"><span class="pl-alloc-bar"><i class="a" style="width:${Math.min(qa,100)}%"></i><i class="b" style="width:${Math.max(0,Math.min(qb,100-qa))}%"></i></span><b><em class="a">${qa}%</em> + <em class="b">${qb}%</em> + <em class="f">${qf}%</em> = <strong>${qa+qb+qf}%</strong></b></span></div>`;})()}</div></section></div>`;
}
function drawPlanner(){
  const el=P.el.querySelector('#pl-planner'),pl=P.plan,rel=P.refs.releases;
  const projOpts=sel=>pl.projects.map(p=>opt(p.id,p.name||'(unnamed project)',p.id===sel)).join('');
  const engOpts=sel=>'<option value="">Unassigned</option>'+P.members.filter(isEng).map(m=>opt(m.id,m.name,m.id===sel)).join('');
  const V=P.view,prj=new Map(pl.projects.map(p=>[p.id,p])),q=V.q.trim().toLowerCase(),filtering=!!(q||V.flag||MF.some(k=>V[k].length));
  const FLAG={unassigned:e=>e.workstreams.some(w=>(w.days||0)>0&&!wsEngs(w).length),incomplete:e=>!(e.owners&&e.owners.length)||!e.workstreams.some(w=>(w.days||0)>0),pending:e=>e.line==='ABL'&&!e.gusId};
  const match=e=>{const p=prj.get(e.projectId);
    if(V.flag&&FLAG[V.flag]&&!FLAG[V.flag](e))return false;
    if(V.release.length&&!V.release.includes(e.releaseId))return false;if(V.line.length&&!(e.workstreams.length?e.workstreams.some(w=>V.line.includes(wl(e,w))):V.line.includes(e.line)))return false;
    if(V.eng.length&&!e.workstreams.some(w=>wsEngs(w).some(i=>V.eng.includes(i))))return false;if(V.theme.length&&!V.theme.includes(epicTheme(e)))return false;
    if(q&&!((e.name||'')+' '+(p&&p.name||'')+' '+e.workstreams.map(w=>w.name).join(' ')).toLowerCase().includes(q))return false;return true;};
  const shown=pl.epics.filter(match);
  const cnt=P.el.querySelector('#pl-count');if(cnt)cnt.textContent=filtering?`${shown.length} of ${pl.epics.length} epics${V.flag?' · '+({unassigned:'unassigned effort',incomplete:'incomplete',pending:'pending GUS save'})[V.flag]:''}`:`${pl.epics.length} epic${pl.epics.length===1?'':'s'}`;
  const gsum=es=>{const d=l=>fmt(es.filter(e=>e.line===l).reduce((a,e)=>a+epicDays(e),0));return `<span class="pl-gsum">${es.length} epic${es.length===1?'':'s'} · ABL ${d('ABL')}d · BTL ${d('BTL')}d</span>`;};
  const groupKey={release:e=>e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||'No planned release',line:e=>e.line==='ABL'?'Above the line (ABL)':'Below the line (BTL)',theme:e=>epicTheme(e)}[V.group];
  const cols=gridCols();
  const gridHtml=()=>{
    const order=new Map(pl.projects.map((p,i)=>[p.id,i])),key=e=>V.group==='project'?String(1e4+(order.has(e.projectId)?order.get(e.projectId):9999)):groupKey(e);
    const es=[...shown].sort((a,b)=>String(key(a)).localeCompare(String(key(b)),undefined,{numeric:true}));
    const sel=(f,html,lbl)=>`<select class="sp-select pl-g" aria-label="${lbl}" data-f="${f}">${html}</select>`;
    const rows=[];let last=null;
    es.forEach(e=>{
      if(V.group!=='project'&&key(e)!==last){last=key(e);const g=es.filter(x=>key(x)===last);rows.push(`<tr class="pl-g-grp"><td colspan="${cols.length+1}"><b>${esc(last)}</b> ${gsum(g)}</td></tr>`);}
      const ws=e.workstreams.length?e.workstreams:[null];
      ws.forEach((w,j)=>{
        const first=j===0,tail=j===ws.length-1;
        const txt=(f,v,ph,max,w2)=>`<input class="hub-inline" type="text" aria-label="${ph}" data-f="${f}" value="${esc(v||'')}" maxlength="${max}" placeholder="${ph}" style="width:${w2}px">`;
        const tdE=(k,h)=>first?`<td class="c-${k}">${h}</td>`:`<td class="c-${k}"></td>`,tdW=(k,h)=>w?`<td class="c-${k}" data-w="${esc(w.id)}">${h}</td>`:`<td class="c-${k}"></td>`;
        const C={
          project:()=>tdE('project',sel('projectId',pl.projects.map(p=>`<option value="${esc(p.id)}" data-short="${esc(p.short||shortProj(p.name))}"${p.id===e.projectId?' selected':''}>${esc(p.name||'(unnamed project)')}</option>`).join(''),'Project')),
          name:()=>tdE('name',`<input class="hub-inline" type="text" aria-label="Epic name" data-f="name" value="${esc(e.name)}" maxlength="255" placeholder="Epic name">`),
          ws:()=>tdW('ws',`<input class="hub-inline" type="text" aria-label="Workstream" data-f="name" value="${esc(w&&w.name)}" maxlength="120" placeholder="Workstream">`),
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
        const act=`<td class="pl-g-act"><span class="pl-acts"${w?` data-w="${esc(w.id)}"`:''}>${w?`<button type="button" class="pl-ib pl-grip" draggable="true" data-grip aria-label="Move workstream: drag within this epic or into another epic (or press Up/Down)" title="Drag to move this workstream, within this epic or into another">${ico('<g fill="currentColor" stroke="none"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></g>')}</button>`:ib('pl-grip','','',' ',false)}${ib('pl-add','data-add-ws','Add workstream','<path d="M10 4v12M4 10h12"/>',tail)}${ib('pl-rm','data-del-ws','Remove workstream','<circle cx="10" cy="10" r="7"/><path d="M6.8 10h6.4"/>',!!w)}${ib('pl-trash','data-del-epic','Delete epic','<path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6M8.5 9v4M11.5 9v4"/>',first)}</span></td>`;
        rows.push(`<tr data-e="${esc(e.id)}"${w?` data-wr="${esc(w.id)}"`:''} style="--pc:${projColor(e.projectId)}" class="${wl(e,w)==='ABL'?'abl':'btl'}${first?' pl-g-first':''}">${ep}${wc}${act}</tr>`);
      });
    });
    const pmenu=P.projOpen?`<div class="pl-pmenu" role="dialog" aria-label="Projects"><b>Projects</b><div class="pl-ph" aria-hidden="true"><span>Project Shortform</span><span>Project name</span><span>V2MOM method</span><span></span></div>${pl.projects.map(p=>`<span class="pl-pchip" data-p="${esc(p.id)}"><input class="hub-inline pl-pshort" type="text" placeholder="e.g. HRP M1.1.3" aria-label="Project Shortform" title="${esc(p.short||'')}" data-f="short" value="${esc(p.short||'')}" maxlength="60"><input class="hub-inline pl-pname" type="text" list="pl-projects" placeholder="Project name (type to link a GUS project)" aria-label="Project name" title="${esc(p.name)}" data-f="name" value="${esc(p.name)}" maxlength="120"><input class="hub-inline pl-pmeth" type="text" placeholder="V2MOM method" aria-label="V2MOM method for this project" title="${esc(p.method||'')}" data-f="method" value="${esc(p.method||'')}" maxlength="1000"><span class="pl-pact">${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">New</em>'}<button type="button" class="pl-x" data-add-epic aria-label="Add epic to this project" title="Add epic to this project">+</button><button type="button" class="pl-x" data-del-proj aria-label="Delete project" title="Delete project">×</button></span></span>`).join('')}<p class="note">Names are shown in short form; hover a field to see the full text. Edit in place, or use + Project to add one.</p></div>`:'';

    return `<div class="pl-grid-tools"><span class="pl-tl"><button type="button" class="button" data-grid-add-epic>+ Epic</button><button type="button" class="button" data-grid-add-ws>+ Workstream</button><button type="button" class="button" id="pl-add-proj">+ Project</button><span class="pl-pwrap"><button type="button" class="button" data-proj-toggle aria-haspopup="true" aria-expanded="${P.projOpen?'true':'false'}">Projects ▾</button>${pmenu}</span></span><span class="pl-cols"><button type="button" class="button" data-cols-toggle aria-haspopup="true" aria-expanded="${P.colsOpen?'true':'false'}">Columns ▾</button>${P.colsOpen?`<div class="pl-cols-menu" role="menu">${[...cols,...Object.keys(GCOL).filter(k=>!cols.includes(k))].map(k=>{const on=cols.includes(k),i=cols.indexOf(k);return `<div class="pl-colrow" data-colrow="${k}"${on?' draggable="true"':''}><span class="pl-colgrip" aria-hidden="true">${on?'⠿':''}</span><label><input type="checkbox" data-col="${k}"${on?' checked':''}> ${esc(GCOL[k])}</label>${on?`<button type="button" class="pl-colmv" data-colmv="${k}" data-d="-1" aria-label="Move ${esc(GCOL[k])} left"${i===0?' disabled':''}>▲</button><button type="button" class="pl-colmv" data-colmv="${k}" data-d="1" aria-label="Move ${esc(GCOL[k])} right"${i===cols.length-1?' disabled':''}>▼</button>`:''}</div>`;}).join('')}<div class="pl-cols-foot"><button type="button" class="pl-cols-reset" data-cols-reset>Reset to default</button><button type="button" class="button primary" data-cols-done>Done</button></div></div>`:''}</span></div><div class="pl-grid-wrap"><table class="pl-grid"><colgroup>${cols.map(k=>`<col class="${k==='name'||k==='ws'?'w-grow':'w-fit'}">`).join('')}<col class="w-fit"></colgroup><thead><tr>${cols.map(k=>`<th class="c-${k}">${esc(GCOL[k])}</th>`).join('')}<th class="c-actions">Actions</th></tr></thead><tbody>${rows.join('')||`<tr><td colspan="${cols.length+1}" class="note">${pl.projects.length?'No epics match the filters.':'No epics yet.'}</td></tr>`}</tbody></table></div>`;};
  el.innerHTML=`<datalist id="pl-projects">${P.refs.projects.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist><datalist id="pl-sprints">${P.refs.sprints.map(s=>`<option value="${esc(s.name)}"></option>`).join('')}</datalist>`+
    (!pl.projects.length?'<div class="empty-state hub-empty pl-empty"><h3>No projects yet</h3><p>Use + Project, then + Epic, or Import a filled template.</p></div>':'')+gridHtml();
  hoistTools();
}
// The grid action buttons (+ Epic, + Project, Projects, Columns) live on the filter bar's right so everything sits on one line.
function hoistTools(){
  const box=P.el.querySelector('#pl-tools'),gt=P.el.querySelector('#pl-planner .pl-grid-tools');if(!box)return;
  box.querySelectorAll(':scope > .pl-grid-tools').forEach(x=>{if(x!==gt)x.remove();});if(gt)box.appendChild(gt);
}
const wire=()=>P.el.querySelectorAll('#pl-planner select').forEach(s=>H.customSelect(s));
function drawTools(){
  const box=P.el.querySelector('#pl-tools'),pl=P.plan;if(!box||!pl)return;const V=P.view;
  const themes=[...new Set(pl.epics.map(epicTheme))].sort(),engs=P.members.filter(isEng);
  restoreFilters();
  const mfLabel=(k,list)=>{const sel=V[k];if(!sel.length)return 'All';const nm=v=>(list.find(x=>x[0]===v)||[v,v])[1];return sel.length===1?nm(sel[0]):sel.length+' selected';};
  const sel=(k,label,list)=>`<div class="pl-tf pl-mf${V[k].length?' on':''}" data-mf="${k}"><span>${label}</span><button type="button" class="pl-mf-btn" aria-haspopup="true" aria-expanded="false" aria-label="${label} filter"><b>${esc(mfLabel(k,list))}</b><i aria-hidden="true">▾</i></button><div class="pl-mf-pop" hidden><input type="search" class="hub-inline" placeholder="Search ${label.toLowerCase()}…" aria-label="Search ${label}"><div class="pl-mf-acts"><button type="button" data-mf-all>Select all</button><button type="button" data-mf-none>Clear</button></div><ul>${list.map(([v,l])=>`<li data-t="${esc(String(l).toLowerCase())}"><label><input type="checkbox" value="${esc(v)}"${V[k].includes(v)?' checked':''}> <span>${esc(l)}</span></label></li>`).join('')||'<li class="note">Nothing to filter yet</li>'}</ul></div></div>`;
  const rels=[...new Map(pl.epics.filter(e=>e.releaseId).map(e=>[e.releaseId,e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||e.releaseId])).entries()];
  const keepGt=box.querySelector(':scope > .pl-grid-tools');
  box.innerHTML=`<label class="pl-tf pl-q"><span>Search</span><input type="search" class="hub-inline" data-v="q" placeholder="Epic, workstream or project…" aria-label="Search epics" value="${esc(V.q)}"></label>`+
    sel('release','Release',rels)+sel('line','ATL/BTL',[['ABL','ABL'],['BTL','BTL']])+sel('eng','Engineer',engs.map(m=>[m.id,m.name]))+sel('theme','Theme',themes.map(t=>[t,t]))+
    `<label class="pl-tf"><span>Group by</span><select class="sp-select" data-v="group" aria-label="Group by">${[['project','Project'],['release','Planned release'],['line','ABL / BTL'],['theme','Theme']].map(([v,l])=>opt(v,l,V.group===v)).join('')}</select></label>`+
    `<button type="button" class="button small pl-clear${filtersOn(V)?' pl-clear-on':''}" data-clear-view${filtersOn(V)?'':' disabled'}>Clear filters</button><span class="note pl-count" id="pl-count"></span>`;
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
  const mem=P.members.filter(isEng),pop=document.createElement('div');pop.className='pl-mspop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',f==='owners'?'Epic owners':'Workstream owners');
  pop.innerHTML=`<b>${f==='owners'?'Epic owners':'Workstream owners'}</b><div class="pl-ms-l">${mem.map(m=>`<label><input type="checkbox" value="${esc(m.id)}"${cur.includes(m.id)?' checked':''}> ${esc(m.name)}</label>`).join('')||'<p class="note">No team members</p>'}</div><div class="pl-ms-a"><button type="button" class="button" data-x>Cancel</button><button type="button" class="button primary" data-ok>Save</button></div>`;
  document.body.appendChild(pop);
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
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)toggleFs(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.pl-fs-on')&&!document.querySelector('.cs.open,.ms.open')){toggleFs(false);e.stopImmediatePropagation();}},true);
function onClick(ev){
  const t=ev.target,c=ctxOf(t),pl=P.plan;
  if(t.closest('#pl-fs-btn'))return toggleFs();
  const ct=t.closest('input[data-col]');if(ct){const cur=gridCols(),k=ct.dataset.col,n=ct.checked?[...cur.filter(x=>x!==k),k]:cur.filter(x=>x!==k);if(n.length)setGridCols(n);redrawCols();return;}
  if(t.closest('.pl-colrow')&&!t.closest('button'))return;
  if(t.closest('[data-cols-done]')){P.colsOpen=false;drawPlanner();wire();return;}
  const mv=t.closest('[data-colmv]');if(mv){const cur=gridCols(),i=cur.indexOf(mv.dataset.colmv),j=i+Number(mv.dataset.d);if(i>=0&&j>=0&&j<cur.length){[cur[i],cur[j]]=[cur[j],cur[i]];setGridCols(cur);}redrawCols();P.el.querySelector(`[data-colmv="${mv.dataset.colmv}"][data-d="${mv.dataset.d}"]:not([disabled])`)?.focus();return;}
  if(t.closest('[data-cols-toggle]')){P.colsOpen=!P.colsOpen;drawPlanner();wire();return;}
  if(t.closest('[data-cols-reset]')){setGridCols(null);redrawCols();return;}
  if((P.colsOpen&&!t.closest('.pl-cols'))||(P.projOpen&&!t.closest('.pl-pwrap'))){P.colsOpen=false;P.projOpen=false;drawPlanner();wire();}
  if(t.closest('[data-reload]'))return load(P.el);
  if(t.closest('[data-retry]'))return flush();
  if(!pl)return;
  if(t.closest('#pl-export')){exportTemplate();return;}
  if(t.closest('#pl-import')){P.el.querySelector('#pl-import-file').click();return;}
  if(t.closest('#pl-add-proj')){newProjectAt(t.closest('#pl-add-proj'));return;}
  const mb=t.closest('.ms .cs-btn');if(mb){openMsPop(mb,c);return;}
  const tb=t.closest('[data-tab]');if(tb){setTab(tb.dataset.tab);return;}
  const rp=t.closest('[data-rps]');if(rp){openRps(rp.dataset.rps,rp);return;}
  const fd=t.closest('[data-fold]')||(t.closest('.pl-card>h3>small')?.parentElement.querySelector('[data-fold]'));if(fd){P.open[fd.dataset.fold]=!P.open[fd.dataset.fold];drawSummary();return;}
  if(t.closest('[data-grid-add-ws]')){newWorkstreamAt();return;}
  if(t.closest('[data-grid-add-epic]')){newEpicAt(t.closest('[data-grid-add-epic]'));return;}
  if(t.closest('[data-proj-toggle]')){P.projOpen=!P.projOpen;drawPlanner();wire();return;}
  const kp=t.closest('[data-kpi]');if(kp){applyKpi(kp.dataset.kpi);return;}
  if(t.closest('[data-clear-view]')){P.view=Object.assign(P.view,{q:'',release:[],line:[],eng:[],theme:[]});saveFilters();drawTools();drawPlanner();wire();return;}
  if(t.closest('#pl-save')){const b=t.closest('#pl-save');b.disabled=true;P.state='dirty';flush().then(()=>{b.disabled=false;if(P.state==='saved')window.toast?.('Plan saved to GUS Apps for the whole team.');else window.toast?.('Could not save the plan.',true);},()=>{b.disabled=false;});return;}
  if(t.closest('#pl-leaves'))return openLeaves();
  if(t.closest('#pl-commit'))return openCommit(false);
  if(t.closest('[data-add-epic]')){const e=newEpic(c.p);pl.epics.push(e);draw();queueSave();P.el.querySelector(`[data-e="${e.id}"] .pl-ename`)?.focus();return;}
  if(t.closest('[data-add-ws]')){const e=findE(c.e);if(!e)return;const w={id:uid('w'),name:'',priority:0,engId:'',engName:'',engIds:[],engNames:[],days:0,sprint:''};e.workstreams.push(w);draw();queueSave();P.el.querySelector(`[data-w="${w.id}"] input`)?.focus();return;}
  const line=t.closest('[data-line]');if(line){const e=findE(c.e);if(e){const v=line.dataset.line,w=c.w&&e.workstreams.find(x=>x.id===c.w);if(w){e.workstreams.forEach(x=>{x.line=x.line||e.line;});w.line=v;deriveLine(e);}else{e.line=v;e.workstreams.forEach(x=>{x.line=v;});}draw();queueSave();}return;}
  if(t.closest('[data-del-ws]')){const e=findE(c.e);if(e){e.workstreams=e.workstreams.filter(w=>w.id!==c.w);draw();queueSave();}return;}
  if(t.closest('[data-del-epic]')){const e=findE(c.e);if(!e)return;const go=()=>{pl.epics=pl.epics.filter(x=>x.id!==c.e);draw();queueSave();};if(!e.gusId&&!e.name&&!epicDays(e))go();else confirmAt(t.closest('[data-del-epic]'),e.gusId?'This epic is already in GUS. Delete only the draft here? The GUS epic stays.':'Delete this epic and its workstreams?',go);return;}
  if(t.closest('[data-del-proj]')){const n=pl.epics.filter(e=>e.projectId===c.p).length,go=()=>{pl.projects=pl.projects.filter(p=>p.id!==c.p);pl.epics=pl.epics.filter(e=>e.projectId!==c.p);draw();queueSave();};if(!n)go();else confirmAt(t.closest('[data-del-proj]'),`Delete this project and its ${n} epic draft(s)? Anything already in GUS stays there.`,go);}
}

// ── Dialogs ─────────────────────────────────────────────────────────────────
let modal=null;
function closeModal(){if(!modal)return false;document.removeEventListener('keydown',modal.key,true);modal.el.remove();modal.opener&&modal.opener.focus&&modal.opener.focus();modal=null;return true;}
document.addEventListener('mouseover',e=>{const i=e.target.closest&&e.target.closest('.pl-pmenu input');if(i)i.title=i.value;});
function openModal(title,body,opener){
  closeModal();const el=document.createElement('div');el.className='nd-overlay';
  el.innerHTML=`<div class="nd-modal pl-modal" role="dialog" aria-modal="true" aria-labelledby="pl-mt"><div class="nd-head"><h2 id="pl-mt">${esc(title)}</h2><button type="button" class="nd-x" data-close aria-label="Close">×</button></div><div id="pl-mb">${body}</div></div>`;
  document.body.appendChild(el);
  modal={el,opener,key:e=>{if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();closeModal();}}};document.addEventListener('keydown',modal.key,true);
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-close]'))closeModal();});
  (el.querySelector('input,button.primary')||el.querySelector('[data-close]')).focus();return el;
}
function openLeaves(){
  const m=P.members.filter(isEng),wd=workdays(P.plan.window.start,P.plan.window.end);
  const el=openModal('Leaves, holidays & on-call',`<p class="note">Days off for each engineer inside the planning window (${esc(P.plan.window.start)} → ${esc(P.plan.window.end)}, ${wd} working days). On-call is the effort each engineer spends on rotation (not available for planned work). Total days default to the weekdays in the window and can be edited per engineer. Available days = total − leave − holidays − on-call.</p>
  <div class="pl-leaves"><div class="pl-leaves-h"><span>Engineer</span><span><b>Total (days)</b></span><span>Leave (days)</span><span>Holidays (days)</span><span>On-call (days)</span><span><b>Available</b></span></div>${m.map(x=>{const p=P.plan.people[x.id]||{};return `<div class="pl-leaves-r" data-id="${esc(x.id)}"><span>${esc(x.name)}</span><input class="hub-inline pl-total" type="number" min="0" max="366" step="0.5" inputmode="decimal" aria-label="Total days for ${esc(x.name)}" data-k="total" title="Weekdays in the planning window; edit if this engineer joins or leaves part-way" value="${fmt(p.total!=null?p.total:wd)}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Leave days for ${esc(x.name)}" data-k="leave" value="${p.leave?fmt(p.leave):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Holiday days for ${esc(x.name)}" data-k="holiday" value="${p.holiday?fmt(p.holiday):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="On-call days for ${esc(x.name)}" data-k="oncall" value="${p.oncall?fmt(p.oncall):''}"><b data-av>${fmt(Math.max(0,(p.total!=null?p.total:wd)-(p.leave||0)-(p.holiday||0)-(p.oncall||0)))}</b></div>`;}).join('')||'<p class="note">No team members loaded.</p>'}</div>
  <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-leaves-save">Save</button></div>`,document.getElementById('pl-leaves'));
  el.addEventListener('input',e=>{const r=e.target.closest('.pl-leaves-r');if(!r)return;const v=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0);r.querySelector('[data-av]').textContent=fmt(Math.max(0,(r.querySelector('[data-k=total]').value===''?wd:v('total'))-v('leave')-v('holiday')-v('oncall')));});
  el.querySelector('#pl-leaves-save').onclick=()=>{
    el.querySelectorAll('.pl-leaves-r').forEach(r=>{const id=r.dataset.id,g=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0),leave=g('leave'),holiday=g('holiday'),oncall=g('oncall'),tv=r.querySelector('[data-k=total]').value,total=tv===''?wd:g('total'),custom=total!==wd;
      if(leave||holiday||oncall||custom){const o={name:(P.members.find(x=>x.id===id)||{}).name||'',leave,holiday,oncall};if(custom)o.total=total;P.plan.people[id]=o;}else delete P.plan.people[id];});
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
    el.querySelector('#pl-mb').innerHTML=`<label class="pl-btl-opt"><input type="checkbox" id="pl-incl-btl"${btl?' checked':''}> Also save below-the-line (BTL) epics to GUS</label>
    <div class="pl-rv-sum" role="group" aria-label="Summary"><div><b>${it.length}</b><span>epic${it.length===1?'':'s'}</span></div><div><b>${nc}</b><span>to create</span></div><div><b>${nu}</b><span>to update</span></div><div><b>${nn}</b><span>unchanged (skipped)</span></div><div><b>${np}</b><span>new project${np===1?'':'s'}</span></div><div><b>${fmt(tot)}</b><span>planned days</span></div><div class="wide"><b>${esc(rels.join(', ')||'—')}</b><span>planned release${rels.length===1?'':'s'}</span></div></div>
    <p class="note">${it.length?`Review every epic below. Nothing is written to GUS until you accept; only new or changed epics are sent (a new workstream on a saved epic updates that epic's effort and description, never creates another epic) and each epic is created (or updated) under its planned release, with its project, priority, planned effort, development lead and a description of all plan details.`:'No epics are above the line (ABL) yet.'} ${preview.skipped?`${preview.skipped} below-the-line epic(s) stay in the dashboard.`:''}</p>
    ${it.length?`<div class="pl-review pl-rv-list">${it.map((x,i)=>`<details class="pl-review-r pl-rv${x.problems.length?' bad':''}"${i<3||x.problems.length?' open':''}><summary><b>${esc(x.name||'(unnamed epic)')}</b><span class="pl-rv-tag ${x.action==='create'?'new':'upd'}">${x.action==='create'?'Create':x.action==='update'?'Update existing':'Unchanged — not re-sent'}</span><span class="pl-rv-tag">${esc(x.line||'')}</span><span class="pl-rv-eff">${fmt(x.effort)} days</span></summary>
      <div class="pl-rv-kv">${kv('Project',(x.project||'—')+(x.projectAction==='create-or-link'?' (created or linked)':''))}${kv('Program',x.program||'—')}${kv('Planned release',x.release||'—')}${kv('Priority',x.priority==null?'—':String(x.priority))}${kv('Owner(s)',(x.owners||[]).join(', '))}${kv('Status',x.status)}${kv('Theme',x.theme)}${kv('HRP',x.hrp)}${kv('V2MOM',x.v2mom)}${kv('Design doc',x.doc)}</div>
      ${wsRows(x)}${x.problems.map(p=>`<em>⚠ ${esc(p)}</em>`).join('')}</details>`).join('')}</div>`:''}
    ${it.length&&!bl?`<label class="pl-ack"><input type="checkbox" id="pl-ack"> I have reviewed this summary and accept creating/updating the ${it.length} epic${it.length===1?'':'s'} above in GUS under the planned release${rels.length===1?'':'s'} shown.</label>`:''}
    <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-confirm" disabled>Accept &amp; create in GUS</button></div>`;
    const ack=el.querySelector('#pl-ack'),cf=el.querySelector('#pl-confirm');if(ack)ack.onchange=()=>{cf.disabled=!ack.checked;};
    el.querySelector('#pl-incl-btl').onchange=ev=>{closeModal();openCommit(ev.target.checked);};
    el.querySelector('#pl-confirm').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Saving to GUS…';
      try{const r=await call('plan-commit',{teamId:H.team.Id,confirm:true,includeBtl:!!btl,acknowledged:true});showResult(r);}catch(err){el.querySelector('#pl-mb').insertAdjacentHTML('afterbegin',`<p class="nd-msg error">${esc(err.message)}</p>`);b.disabled=false;b.textContent='Accept & create in GUS';}};
  }catch(err){el.querySelector('#pl-mb').innerHTML=`<p class="nd-msg error">${esc(err.message)}</p><div class="nd-actions"><button type="button" class="button" data-close>Close</button></div>`;}
}
function showResult(r){
  if(r.plan){P.plan=r.plan;P.rev=r.revision;draw();}else load(P.el);
  const ok=r.results.filter(x=>x.ok).length;
  openModal(r.failed?'Saved with errors':'Saved to GUS',`<p class="note">${ok} of ${r.results.length} epic(s) saved to GUS${r.failed?`; ${r.failed} failed and can be retried — saved ones are not duplicated`:''}.${r.saveError?` The draft could not record the GUS ids (${esc(r.saveError)}); reload before retrying.`:''}</p>
  <div class="pl-review">${r.results.map(x=>`<div class="pl-review-r${x.ok?'':' bad'}"><b>${esc(x.name)}</b><span>${x.ok?esc([x.project,x.action,x.note].filter(Boolean).join(' · ')):'⚠ '+esc(x.error)}</span>${x.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(x.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:''}</div>`).join('')}</div>
  <div class="nd-actions"><button type="button" class="button primary" data-close>Done</button></div>`,null);
}

// ── Page ────────────────────────────────────────────────────────────────────
async function load(el){
  const my=++P.seq;clearTimeout(P.timer);P.state='idle';P.plan=null;
  el.querySelector('#pl-sum').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading plan…</div>';el.querySelector('#pl-planner').innerHTML='';
  try{
    const id=H.team.Id,[g,refs,members]=await Promise.all([call('plan-get',{teamId:id}),call('plan-refs',{teamId:id}).catch(e=>({releases:[],programs:[],projects:[],sprints:[],warnings:[e.message]})),H.members().catch(()=>[])]);
    if(my!==P.seq)return;
    P.plan=g.plan.window.start?g.plan:{...g.plan,window:emptyPlan().window};P.rev=g.revision;P.plan.epics.forEach(deriveLine);P.refs=refs;P.members=members;
    const w=refs.warnings||[];el.querySelector('#pl-warn').innerHTML=w.length?`<p class="note pl-warn">Some GUS lists did not load (${esc(w.join('; '))}). Pickers may be incomplete.</p>`:'';
    el.querySelector('#pl-start').value=P.plan.window.start;el.querySelector('#pl-end').value=P.plan.window.end;
    el.querySelector('#pl-last').textContent=P.plan.lastCommit&&P.plan.lastCommit.at?`Last saved to GUS ${new Date(P.plan.lastCommit.at).toLocaleString()} (${P.plan.lastCommit.created} created, ${P.plan.lastCommit.updated} updated)`:'';
    draw();setState('idle');
  }catch(e){if(my===P.seq)el.querySelector('#pl-sum').innerHTML=`<div class="empty-state hub-empty"><h3>Could not load the plan</h3><p>${esc(e.message)}</p></div>`;}
}
H.register({id:'plan',label:'Release Planning (Quarterly)',icon:'plan',tone:'green',desc:'Plan projects, epics and effort against team capacity',needsTeam:true,
  stat:()=>({text:'Planned vs available capacity, ABL and BTL'}),
  render(el){
    P.el=el;
    el.innerHTML=`<div class="executive-heading"><div><h2>${icon('plan','green')} Release Planning (Quarterly)</h2><p>Plan projects, epics and workstreams for ${esc(H.team.Name)}. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.</p></div><div class="heading-actions"><span id="pl-state" class="pl-state" role="status" aria-live="polite"></span><label class="pl-team">Team <select class="hub-inline" id="pl-team" aria-label="Team whose release plan this is">${(H.teams||[]).map(t=>`<option value="${esc(t.Id)}"${t.Id===H.team.Id?' selected':''}>${esc(t.short||t.Name)}</option>`).join('')}</select></label><div class="pl-dates"><label>Release Window <input type="date" class="hub-inline" id="pl-start" aria-label="Release Window start"></label><span aria-hidden="true">→</span><input type="date" class="hub-inline" id="pl-end" aria-label="Release Window end"><span class="note" id="pl-last"></span></div><button type="button" class="button pl-hb pl-hb-leaves" id="pl-leaves"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg> Leaves &amp; on-call</button><button type="button" class="button pl-hb pl-hb-save" id="pl-save" title="Save your entries to the shared GUS Apps backend (also saved automatically)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l4 4v14H5zM8 3v6h8V3M8 21v-7h8v7"/></svg> Save</button><button type="button" class="button primary" id="pl-commit">Review &amp; save to GUS</button></div></div>
    <div id="pl-warn"></div>
    <div class="pl-tabs" role="tablist" aria-label="Release planning views"><button type="button" role="tab" data-tab="plan" class="on" aria-selected="true"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 8.5h14M8 8.5V16"/></svg>Release Planner</button><button type="button" role="tab" data-tab="rps" aria-selected="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5"/></svg>Planned Release Summary</button></div>
    <div id="pl-main"><div id="pl-sum"></div>
    <section id="pl-fs" class="pl-fs"><div class="pl-planner-h"><h3>${icon('plan','green')} Projects &amp; epics</h3><span class="pl-planner-btns"><button type="button" class="button" id="pl-fs-btn" aria-pressed="false" title="Show Projects &amp; epics full screen">Full screen</button><button type="button" class="button" id="pl-export" title="Download an Excel template with the current plan, column headers and dropdown lists">Export template</button><button type="button" class="button" id="pl-import" title="Import plan rows from the exported template">Import</button><input type="file" id="pl-import-file" accept=".xlsx" hidden></span></div><div id="pl-tools" class="pl-tools"></div><div id="pl-planner"></div></section></div><div id="pl-rps" hidden></div>`;
    {const hd=el.querySelector('.executive-heading'),tb=el.querySelector('.pl-tabs'),ac=hd&&hd.querySelector('.heading-actions');if(hd&&tb&&ac){tb.title='Plan projects, epics and workstreams for '+H.team.Name+'. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.';tb.appendChild(ac);hd.remove();}}
    el.querySelector('#pl-team').addEventListener('change',e=>H.setTeam(e.target.value));
    P.tab='plan';
    // Review & save to GUS is limited to the plan administrators (also enforced by the backend); disabled until the backend confirms.
    {const cb=el.querySelector('#pl-commit');if(cb){cb.disabled=true;cb.title='Checking permission…';call('connection',{}).then(c=>{if(c&&c.canCommit){cb.disabled=false;cb.title='';}else cb.title='Saving to GUS is restricted to the plan administrators. Your plan is still saved automatically in this app.';},()=>{cb.title='Could not verify permission to save to GUS.';});}}
    el.oninput=onInput;
    el.onchange=ev=>{if(ev.target.closest('#pl-start,#pl-end')){const s=el.querySelector('#pl-start').value,e=el.querySelector('#pl-end').value;if(s&&e&&s<=e&&P.plan){P.plan.window={start:s,end:e};drawSummary();queueSave();}else if(s&&e&&s>e)window.toast?.('End date must be on or after the start date.',true);return;}onInput(ev);};
    document.querySelectorAll('#pl-back').forEach(x=>x.remove());
    const bar=document.querySelector('.dashboard-bar');if(bar){const bk=document.createElement('a');bk.href='#/home';bk.id='pl-back';bk.className='pl-back';bk.title='Back to Team Hub — Team Hub for this team';bk.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4 6 10l6 6M6 10h10"/></svg><span>Back to Team Hub</span>';
      bk.onclick=async ev=>{ev.preventDefault();if(P.state==='dirty'&&!await H.confirm({title:'Unsaved changes',message:'You have unsaved changes. Leave without saving?',ok:'Leave',cancel:'Stay',danger:true}))return;if(P.state==='dirty')P.state='saved';const m=location.pathname.match(/^.*\/applets\/cfs-release-review-tracker\//);if(m){try{(window.top||window).location.assign(m[0]);}catch(_){location.assign(m[0]);}}else H.go('home');};bar.appendChild(bk);}el.onclick=onClick;wireDrag(el);wireColDrag(el);el.querySelector('#pl-import-file').onchange=ev=>{const f=ev.target.files[0];ev.target.value='';if(f)f.arrayBuffer().then(b=>openImport(b,el.querySelector('#pl-import')));};load(el);
  }});
H.onEsc('plan',()=>{closeModal();return true;});
window.addEventListener('beforeunload',e=>{if(P.state==='dirty'||P.state==='saving'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hub:team',()=>{closeModal();clearTimeout(P.timer);});
})();
