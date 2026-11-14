/* Release Planning: engineers plan projects, epics and workstreams (effort in days), mark epics above/below the line (ABL/BTL),
 * and the dashboard derives planned vs available capacity live. The draft saves to GUS Apps; only ABL epics are written to GUS on confirm.
 * Every interpolated value in the templates below goes through esc() or is a number from fmt(). */
(function(){
'use strict';
const H=window.Hub,{esc,icon,call}=H;
const P={plan:null,rev:null,refs:{releases:[],programs:[],projects:[],sprints:[]},members:[],seq:0,timer:0,state:'idle',stateAt:'',inflight:null,el:null};
P.open={theme:false,eng:false};
P.view={q:'',release:'',line:'',eng:'',theme:'',group:'project'};
// Grid columns: chooser order = default order; the first GDEF are shown until the user picks their own (saved in this browser).
const GCOL={project:'Project',name:'Epic Name',ws:'Workstream',owners:'Epic Owner',engs:'Workstream Owner(s)',estimate:'Epic Est',days:'WS Est',line:'ATL/BTL',sprint:'Sprint',priority:'Priority',status:'Status',release:'Release',theme:'Theme',wstatus:'WS status',doc:'Doc',gus:'GUS',hrp:'HRP V2MOM method',v2mom:'CFS V2MOM'};
const GW={project:112,name:230,ws:200,owners:120,priority:84,estimate:84,status:116,engs:170,days:72,sprint:120,release:150,line:104,theme:130,wstatus:116,doc:150,gus:84,hrp:130,v2mom:130,act:92};
const GDEF=['project','name','ws','owners','engs','estimate','days','line','sprint'],GKEY='pl-grid-cols';
const gridCols=()=>{let v=null;try{v=JSON.parse(localStorage.getItem(GKEY));}catch(_){}const keep=Array.isArray(v)?v.filter(k=>GCOL[k]):null;return keep&&keep.length?[...new Set(keep)]:GDEF.slice();};
const setGridCols=l=>{try{if(l)localStorage.setItem(GKEY,JSON.stringify(l));else localStorage.removeItem(GKEY);}catch(_){}};
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
// Inline popover next to "+ Project": measure name (the GUS project) and its short form (e.g. HRP M1.1.3).
function newProjectAt(btn){
  document.querySelectorAll('.pl-confirm').forEach(x=>x.remove());
  const d=document.createElement('div');d.className='pl-confirm pl-newproj';d.setAttribute('role','dialog');d.setAttribute('aria-label','New project');
  d.innerHTML=`<label>Measure name <small>(project in GUS)</small><input class="hub-inline" type="text" list="pl-projects" data-n maxlength="120" placeholder="Full measure / project name"></label><label>Short form <small>e.g. HRP M1.1.3</small><input class="hub-inline" type="text" data-s maxlength="30" placeholder="HRP M1.1.3"></label><div><button type="button" class="button small" data-no>Cancel</button><button type="button" class="button small primary" data-yes>Add project</button></div>`;
  document.body.appendChild(d);
  const r=btn.getBoundingClientRect(),w=d.offsetWidth,h=d.offsetHeight;
  d.style.left=Math.max(8,Math.min(innerWidth-w-8,r.right-w))+'px';d.style.top=(r.bottom+h+8>innerHeight&&r.top-h-8>8?r.top-h-8:r.bottom+8)+'px';
  const n=d.querySelector('[data-n]'),sh=d.querySelector('[data-s]');
  const close=()=>{d.remove();document.removeEventListener('mousedown',away,true);document.removeEventListener('keydown',key,true);btn.focus();};
  const away=ev=>{if(!d.contains(ev.target)&&!ev.target.closest('.pl-confirm'))close();};
  const add=()=>{const name=n.value.trim(),short=sh.value.trim();if(!name){n.focus();n.classList.add('bad');return;}
    const hit=P.refs.projects.find(x=>x.name===name),p={id:uid('p'),name,short:short||shortProj(name),theme:'',gusId:''};
    if(hit){p.gusId=hit.id;p.programId=hit.programId;p.programName=hit.programName;}
    P.plan.projects.push(p);close();draw();queueSave();};
  const key=ev=>{if(ev.key==='Escape'){ev.stopPropagation();close();}else if(ev.key==='Enter'&&d.contains(ev.target)){ev.preventDefault();add();}};
  d.querySelector('[data-no]').onclick=close;d.querySelector('[data-yes]').onclick=add;n.oninput=()=>n.classList.remove('bad');
  document.addEventListener('mousedown',away,true);document.addEventListener('keydown',key,true);n.focus();
}
function newEpicAt(btn){
  document.querySelectorAll('.pl-confirm').forEach(x=>x.remove());
  const pl=P.plan;if(!pl.projects.length){newProjectAt(btn);return;}
  const rel=P.refs.releases,dr=defRel(),d=document.createElement('div');d.className='pl-confirm pl-newproj';d.setAttribute('role','dialog');d.setAttribute('aria-label','New epic');
  d.innerHTML=`<label>Project<select class="hub-inline" data-p>${pl.projects.map((p,i)=>opt(p.id,p.short||projShort(p.name),i===pl.projects.length-1)).join('')}</select></label><label>Epic name<input class="hub-inline" type="text" data-n maxlength="255" placeholder="Epic name"></label><label>Planned release<select class="hub-inline" data-r>${rel.map(r=>opt(r.id,r.name,r.id===dr.releaseId)).join('')||opt('','No releases',true)}</select></label><label>ATL/BTL<select class="hub-inline" data-l><option value="BTL">BTL</option><option value="ABL">ABL</option></select></label><div><button type="button" class="button small" data-no>Cancel</button><button type="button" class="button small primary" data-yes>Add epic</button></div>`;
  document.body.appendChild(d);
  const r=btn.getBoundingClientRect(),w=d.offsetWidth,h=d.offsetHeight;
  d.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left))+'px';d.style.top=(r.bottom+h+8>innerHeight&&r.top-h-8>8?r.top-h-8:r.bottom+8)+'px';
  const n=d.querySelector('[data-n]');
  const close=()=>{d.remove();document.removeEventListener('mousedown',away,true);document.removeEventListener('keydown',key,true);};
  const away=ev=>{if(!d.contains(ev.target))close();};
  const add=()=>{const e=newEpic(d.querySelector('[data-p]').value);e.name=n.value.trim();const rv=d.querySelector('[data-r]').value,rr=rel.find(x=>x.id===rv);if(rr){e.releaseId=rr.id;e.releaseName=rr.name;}
    e.line=d.querySelector('[data-l]').value;e.workstreams.forEach(x=>{x.line=e.line;});pl.epics.push(e);close();draw();queueSave();const ne=P.el.querySelector(`[data-e="${e.id}"]`);ne?.scrollIntoView({block:'nearest'});};
  const key=ev=>{if(ev.key==='Escape'){ev.stopPropagation();close();}else if(ev.key==='Enter'&&d.contains(ev.target)&&ev.target.tagName!=='SELECT'){ev.preventDefault();add();}};
  d.querySelector('[data-no]').onclick=close;d.querySelector('[data-yes]').onclick=add;
  document.addEventListener('mousedown',away,true);document.addEventListener('keydown',key,true);n.focus();
}
// ── Export template / import (xlsx) ────────────────────────────────────────
const IO_COLS=['Project (short form)','Measure name (project in GUS)','Epic Name','Workstream','Epic Owner(s)','Workstream Owner(s)','Epic Est (calculated, ignored on import)','WS Est (days)','ATL/BTL','Sprint','Priority','Status','Planned Release'];
const IO_ROWS=300;
const projShort=p=>p.short||shortProj(p.name);
function ioLists(){
  const pl=P.plan,eng=P.members.filter(m=>H.leaderRank(m.name)<0).map(m=>m.name).sort();
  return {projects:pl.projects.map(projShort),releases:P.refs.releases.map(r=>r.name),eng,line:['ABL','BTL'],pri:[0,1,2,3,4,5].map(n=>'P'+n),status:STAT};
}
function exportTemplate(){
  const pl=P.plan,L=ioLists(),prj=new Map(pl.projects.map(p=>[p.id,p]));
  const rows=[IO_COLS.slice()];
  for(const e of pl.epics){
    const p=prj.get(e.projectId)||{},names=(e.ownerNames&&e.ownerNames.length?e.ownerNames:(e.owners||[]).map(memName)).filter(Boolean);
    const ws=e.workstreams.length?e.workstreams:[null];
    ws.forEach((w,j)=>{const f=j===0,wn=w?(w.engNames&&w.engNames.length?w.engNames:wsEngs(w).map(memName)).filter(Boolean):[];
      rows.push([projShort(p),p.name||'',e.name||'',w?w.name:'',f?names.join(', '):'',wn.join(', '),f?(epicDays(e)||''):'',w&&w.days?w.days:'',w?wl(e,w):(f?e.line:''),w?w.sprint:'',f?'P'+(e.priority==null?0:e.priority):'',f?e.status:'',f?(e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||''):'']);});
  }
  const lcols=[['Projects',L.projects],['Planned releases',L.releases],['Engineers',L.eng],['ATL/BTL',L.line],['Priority',L.pri],['Status',L.status]];
  const lrows=[lcols.map(c=>c[0])],lh=Math.max(...lcols.map(c=>c[1].length));
  for(let i=0;i<lh;i++)lrows.push(lcols.map(c=>c[1][i]==null?'':c[1][i]));
  const rng=(c,n)=>`Lists!$${c}$2:$${c}$${Math.max(2,n+1)}`,last=Math.max(rows.length+IO_ROWS,IO_ROWS);
  const V=(col,c,n,o)=>Object.assign({sqref:`${col}2:${col}${last}`,formula:rng(c,n)},o);
  const help=[['Release Planning template'],[''],['One row per workstream. Rows with the same Project + Epic Name belong to the same epic.'],['Epic-level columns (Epic Owner, ATL/BTL, Priority, Status, Planned Release) are read from the first row that has a value for that epic.'],[''],
    ['Column','Expected value'],
    [IO_COLS[0],'Short form such as HRP M1.1.3. Pick from the list, or type a new one (then also fill Measure name).'],[IO_COLS[1],'Full measure / project name as in GUS. Required only for a new project.'],[IO_COLS[2],'Required.'],[IO_COLS[3],'Workstream / feature name. Leave empty for an epic without workstreams.'],
    [IO_COLS[4],'Engineer names exactly as on the Engineers list; separate several with commas.'],[IO_COLS[5],'Same as Epic Owner(s).'],[IO_COLS[6],'Calculated: the sum of WS Est of an ATL epic. It is ignored when importing.'],[IO_COLS[7],'Days, a number of 0 or more.'],
    [IO_COLS[8],'ABL (above the line, also accepted as ATL) or BTL. Only ABL epics count toward capacity and are saved to GUS.'],[IO_COLS[9],'Free text, e.g. a sprint name.'],[IO_COLS[10],'P0 to P5 (a plain number also works).'],[IO_COLS[11],'Planned, In Progress, Completed or On Hold.'],[IO_COLS[12],'Release name from the Planned releases list.'],
    [''],['Importing merges into the plan: an epic that already exists (same project and name) has its fields updated and its workstreams replaced by the rows in the file; epics that are not in the file are left alone.']];
  const bytes=PlanIO.write({sheets:[
    {name:'Plan',header:true,freeze:true,rows,widths:[16,34,34,30,28,28,18,12,10,16,10,14,24],validations:[
      V('A','A',L.projects.length,{title:'Project',prompt:'Pick a project short form, or type a new one.',error:'Not an existing project. A new project will be created if you also fill Measure name.',warn:true}),
      V('E','C',L.eng.length,{title:'Owners',prompt:'Engineer name; separate several with commas.',error:'Use engineer names from the Engineers list (comma-separated for several).',warn:true}),
      V('F','C',L.eng.length,{title:'Owners',prompt:'Engineer name; separate several with commas.',error:'Use engineer names from the Engineers list (comma-separated for several).',warn:true}),
      V('I','D',2,{error:'Use ABL or BTL.'}),V('K','E',6,{error:'Use P0 to P5.'}),V('L','F',STAT.length,{error:'Use one of the listed statuses.'}),V('M','B',L.releases.length,{error:'Pick a planned release from the list.'})]},
    {name:'Lists',header:true,rows:lrows,widths:[28,30,28,10,10,14]},
    {name:'Instructions',header:true,rows:help,widths:[40,110],wrap:[1]}]});
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.href=url;a.download=`release-plan-${(H.team.short||H.team.Name||'team').replace(/[^\w.-]+/g,'-')}-${new Date().toISOString().slice(0,10)}.xlsx`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
// Parse + validate the rows of the Plan sheet. Returns {issues, epics, stats}; nothing is changed until applyImport.
function checkImport(sheet){
  const pl=P.plan,issues=[],add=(sev,row,msg)=>issues.push({sev,row,msg});
  const norm=x=>String(x==null?'':x).replace(/\s+/g,' ').trim().toLowerCase();
  const head=(sheet[0]||[]).map(norm),idx=i=>head.findIndex(h=>h.startsWith(norm(IO_COLS[i]).split(' (')[0].toLowerCase()));
  const ci={proj:0,pname:1,epic:2,ws:3,eo:4,wo:5,days:7,line:8,sprint:9,pri:10,status:11,rel:12};
  for(const k of Object.keys(ci)){const j=idx(ci[k]);ci[k]=j;}
  if(ci.epic<0||ci.proj<0&&ci.pname<0){add('error',1,'Header row not recognised. Use “Export template” and keep its column headers (Project, Epic Name, … ).');return {issues,epics:[],stats:{}};}
  const get=(r,k)=>ci[k]<0?'':String(r[ci[k]]==null?'':r[ci[k]]).trim();
  const projBy=new Map(),projects=[...pl.projects];
  const findProj=(sh,nm)=>projects.find(p=>(sh&&norm(projShort(p))===norm(sh))||(nm&&norm(p.name)===norm(nm)))||null;
  const members=P.members.filter(m=>H.leaderRank(m.name)<0),byName=new Map(members.map(m=>[norm(m.name),m]));
  const names=(txt,row,what)=>{const ids=[],nm=[];for(const part of String(txt||'').split(/[,;\n]/).map(x=>x.trim()).filter(Boolean)){const m=byName.get(norm(part));if(m){if(!ids.includes(m.id)){ids.push(m.id);nm.push(m.name);}}else add('error',row,`${what}: “${part}” is not an engineer on this team.`);}return {ids,nm};};
  const groups=new Map(),newProj=new Map();
  for(let i=1;i<sheet.length;i++){
    const r=sheet[i]||[],row=i+1;if(!r.some(c=>String(c==null?'':c).trim()))continue;
    const sh=get(r,'proj'),pn=get(r,'pname'),en=get(r,'epic');
    if(!en){add('error',row,'Epic Name is required.');continue;}
    if(!sh&&!pn){add('error',row,'Project is required (short form or measure name).');continue;}
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
    const key=pkey+'|'+norm(en);let g=groups.get(key);
    if(!g){g={pr,name:en,row,line:'',pri:null,status:'',rel:null,eo:null,ws:[]};groups.set(key,g);}
    const take=(f,v)=>{if(v===''||v==null)return;if(g[f]===''||g[f]==null)g[f]=v;else if(String(g[f])!==String(v))add('warn',row,`Epic “${en}”: ${f==='eo'?'Epic Owner':f==='rel'?'Planned Release':f==='pri'?'Priority':f==='line'?'ATL/BTL':'Status'} differs between rows; the first value (${f==='eo'?g.eo.nm.join(', '):f==='rel'?g.rel.name:f==='pri'?'P'+g.pri:g[f]}) is used.`);};
    const ln=get(r,'line').toUpperCase();let rowLine='';if(ln){if(ln==='ABL'||ln==='ATL')rowLine='ABL';else if(ln==='BTL')rowLine='BTL';else add('error',row,`ATL/BTL: “${get(r,'line')}” is not valid (use ABL or BTL).`);if(rowLine&&!g.line)g.line=rowLine;}
    const pv=get(r,'pri');if(pv){const m=/^p?\s*(\d{1,4})$/i.exec(pv);if(m)take('pri',Number(m[1]));else add('error',row,`Priority: “${pv}” is not valid (use P0 to P5).`);}
    const sv=get(r,'status');if(sv){const st=STAT.find(x=>norm(x)===norm(sv));if(st)take('status',st);else add('error',row,`Status: “${sv}” is not one of ${STAT.join(', ')}.`);}
    const rv=get(r,'rel');if(rv){const rr=P.refs.releases.find(x=>norm(x.name)===norm(rv))||P.refs.releases.find(x=>relNum(x)>=0&&String(relNum(x))===rv);if(rr)take('rel',{id:rr.id,name:rr.name});else add('error',row,`Planned Release: “${rv}” is not a release of this team.`);}
    const eo=get(r,'eo');if(eo){const o=names(eo,row,'Epic Owner(s)');if(o.ids.length)take('eo',{ids:o.ids,nm:o.nm});}
    const wn=get(r,'ws'),wd=get(r,'days'),wo=get(r,'wo'),sp=get(r,'sprint');
    if(wn||wd||wo||sp){
      let d=0;if(wd!==''){d=Number(String(wd).replace(',','.'));if(!isFinite(d)||d<0||d>5000){add('error',row,`WS Est: “${wd}” must be a number of days between 0 and 5000.`);d=0;}}
      if(!wn)add('warn',row,'Row has effort or owners but no Workstream name; it is imported as an unnamed workstream.');
      if(g.ws.some(x=>wn&&norm(x.name)===norm(wn)))add('warn',row,`Workstream “${wn}” appears twice in epic “${en}”.`);
      const o=names(wo,row,'Workstream Owner(s)');
      g.ws.push({name:wn,days:d,line:rowLine,sprint:sp,ids:o.ids,nm:o.nm});
    }
  }
  const epics=[...groups.values()];
  for(const g of epics){if(!g.rel&&!(pl.epics.find(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name))||{}).releaseId)add('warn',g.row,`Epic “${g.name}” has no Planned Release; it will use ${defRel().releaseName||'none'}.`);
    if(!g.line)add('warn',g.row,`Epic “${g.name}” has no ATL/BTL value; ${pl.epics.some(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name))?'its current value is kept':'it is imported as BTL'}.`);}
  if(!epics.length&&!issues.some(x=>x.sev==='error'))add('error',1,'No epic rows found in the file.');
  if(pl.epics.length+epics.filter(g=>!pl.epics.some(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name))).length>300)add('error',1,'The plan would exceed 300 epics.');
  if(epics.some(g=>g.ws.length>40))add('error',1,'An epic has more than 40 workstreams.');
  const isNew=g=>!pl.epics.some(e=>e.projectId===g.pr.id&&norm(e.name)===norm(g.name));
  return {issues,epics,newProj,stats:{epics:epics.length,created:epics.filter(isNew).length,updated:epics.filter(g=>!isNew(g)).length,ws:epics.reduce((a,g)=>a+g.ws.length,0),projects:newProj.size}};
}
function applyImport(res){
  const pl=P.plan,norm=x=>String(x==null?'':x).trim().toLowerCase();
  for(const p of res.newProj.values())pl.projects.push(p);
  for(const g of res.epics){
    let e=pl.epics.find(x=>x.projectId===g.pr.id&&norm(x.name)===norm(g.name));
    if(!e){e=newEpic(g.pr.id);e.name=g.name;e.workstreams=[];pl.epics.push(e);}
    if(g.pri!=null)e.priority=g.pri;if(g.status)e.status=g.status;
    if(g.rel){e.releaseId=g.rel.id;e.releaseName=g.rel.name;}
    if(g.eo){e.owners=g.eo.ids;e.ownerNames=g.eo.nm;}
    const old=e.workstreams;
    e.workstreams=g.ws.map(x=>{const o=old.find(w=>x.name&&norm(w.name)===norm(x.name));return Object.assign({},o||{},{id:o?o.id:uid('w'),name:x.name,priority:o?o.priority:0,days:x.days,line:x.line||o&&o.line||(g.line||e.line),sprint:x.sprint,engIds:x.ids,engNames:x.nm,engId:x.ids[0]||'',engName:x.nm[0]||''});});
    deriveLine(e);
  }
  draw();queueSave();
}
function openImport(file,opener){
  PlanIO.read(file).then(book=>{
    const name=Object.keys(book).find(n=>/^plan$/i.test(n))||Object.keys(book)[0],res=checkImport(book[name]||[]);
    const errs=res.issues.filter(x=>x.sev==='error'),warns=res.issues.filter(x=>x.sev==='warn'),st=res.stats;
    const list=(a,t)=>a.length?`<h4>${t} (${a.length})</h4><ul class="pl-iss">${a.slice(0,80).map(x=>`<li><b>Row ${x.row}</b> ${esc(x.msg)}</li>`).join('')}${a.length>80?`<li>… and ${a.length-80} more</li>`:''}</ul>`:'';
    const sum=st.epics?`<p class="note">${st.epics} epic(s) in the file: ${st.created} new, ${st.updated} to update (their workstreams are replaced by the rows in the file) · ${st.ws} workstream(s)${st.projects?` · ${st.projects} new project(s)`:''}. Epics not in the file are left alone.</p>`:'';
    const el=openModal('Import release plan',`${sum}${errs.length?`<p class="pl-iss-bad">Fix ${errs.length} error(s) in the file and import again. Nothing was changed.</p>`:`<p class="pl-iss-ok">No errors found.${warns.length?' Review the warnings below, then import.':''}</p>`}${list(errs,'Errors')}${list(warns,'Warnings')}<div class="pl-iss-btns"><button type="button" class="button" data-close>${errs.length?'Close':'Cancel'}</button>${errs.length?'':'<button type="button" class="button primary" data-do-import>Import into plan</button>'}</div>`,opener);
    const go=el.querySelector('[data-do-import]');if(go)go.onclick=()=>{applyImport(res);closeModal();window.toast?.(`Imported ${st.epics} epic(s). Review the plan, then save to GUS when ready.`);};
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
const wsNames=w=>wsEngs(w).map(id=>memName(id)||(id===w.engId?w.engName:'')||'Engineer');
const shortProj=n=>{n=n||'';if(/^[^:]{1,30}:/.test(n))return n.split(':')[0].trim();const m=n.match(/^(?:[A-Za-z]{2,6}\s+)?[A-Za-z]?\d+(?:\.\d+)+/);return m?m[0]:(n||'(unnamed project)');};
const msLabel=(ids,empty)=>{const n=ids.map(memName).filter(Boolean);return n.length?(n.length>1?`${n[0].split(' ')[0]} +${n.length-1}`:n[0]):empty;};
const msel=(f,ids,label,empty)=>{const mem=P.members.filter(m=>H.leaderRank(m.name)<0);
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
const wl=(e,w)=>e.line==='BTL'?'BTL':(w&&w.line)||e.line;
const deriveLine=e=>{e.line=e.workstreams.some(w=>wl(e,w)==='ABL')?'ABL':'BTL';};
const epicDays=e=>r2(e.workstreams.filter(w=>wl(e,w)==='ABL').reduce((a,w)=>a+(w.days||0),0));
const epicTheme=e=>e.theme||themeOf((P.plan.projects.find(p=>p.id===e.projectId))||null);
const STAT=['Planned','In Progress','Completed','On Hold'];
const statOpts=v=>`<option value="">Status</option>`+STAT.map(x=>`<option value="${x}"${x===v?' selected':''}>${x}</option>`).join('');
const docOk=u=>/^https?:\/\//i.test(u||'');
function model(){
  const pl=P.plan,wd=workdays(pl.window.start,pl.window.end),prj=new Map(pl.projects.map(p=>[p.id,p]));
  const eng=new Map();
  const row=(id,name)=>{if(!eng.has(id))eng.set(id,{id,name,leave:0,holiday:0,oncall:0,avail:0,abl:0,btl:0,cap:true});return eng.get(id);};
  for(const m of P.members)if(H.leaderRank(m.name)<0){const x=row(m.id,m.name),pp=pl.people[m.id]||{};x.leave=pp.leave||0;x.holiday=pp.holiday||0;x.oncall=pp.oncall||0;x.avail=Math.max(0,wd-x.leave-x.holiday-x.oncall);}
  const themes=new Map();let ablT=0,btlT=0;
  for(const e of pl.epics){
    const slices=e.workstreams.filter(w=>(w.days||0)>0&&wl(e,w)==='ABL').map(w=>({ids:wsEngs(w),d:w.days,nm:w.engName}));
    for(const {ids,d,nm} of slices){const share=d/(ids.length||1);
      for(const id of ids.length?ids:['']){const x=id?row(id,memName(id)||nm||'Engineer'):row('none','Unassigned');if(!id)x.cap=false;x.abl+=share;}
      const t=epicTheme(e);if(!themes.has(t))themes.set(t,{name:t,abl:0,btl:0});
      ablT+=d;themes.get(t).abl+=d;}
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
  const savedHtml=`<section class="pl-card pl-saved"><h3>${icon('database','teal')} Saved epics <small>${saved.length} of ${epics.length} in GUS${lc?' · last saved '+esc(lc):''}</small></h3>${epics.length?`<table class="pl-rps-t"><thead><tr><th>Project</th><th>Epic</th><th>Release</th><th>Line</th><th>GUS</th><th>Development Lead</th><th>Planned Story Points</th></tr></thead><tbody>${epics.map(e=>{const p=prjm.get(e.projectId)||{};return `<tr><td>${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">${esc(p.name||'project')} ↗</a>`:esc(p.name||'—')}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc(rn(e))}</td><td>${esc(e.line)}</td><td>${e.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(e.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:'<em class="pl-draft">Not saved to GUS</em>'}</td><td>${esc(owners(e))}</td><td>${fmt(epicDays(e))}</td></tr>`;}).join('')}</tbody></table>`:'<p class="note">No epics yet.</p>'}</section>`;
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
  el.innerHTML=`<div class="pl-rps-top">${donut}${prio}</div>${health}${execHtml}${savedHtml}`;
}
function openRps(k,opener){
  const pl=P.plan,prj=new Map(pl.projects.map(p=>[p.id,p]));let title,list;
  if(k.startsWith('e:')){const e=findE(k.slice(2));if(!e)return;
    openModal(e.name||'(unnamed epic)',`<p class="note">${esc(epicTheme(e))} · P${esc(e.priority==null?0:e.priority)} · ${esc(e.line)} · ${esc((prj.get(e.projectId)||{}).name||'—')} · ${fmt(epicDays(e))} pts</p><table class="pl-rps-t"><thead><tr><th>Workstream</th><th>Priority</th><th>Engineers</th><th>Sprint</th><th>Status</th><th>Days</th></tr></thead><tbody>${e.workstreams.map(w=>`<tr><td>${esc(w.name||'(unnamed)')}</td><td>P${esc(w.priority==null?0:w.priority)}</td><td>${esc(wsNames(w).join(', ')||'—')}</td><td>${esc(w.sprint||'—')}</td><td>${esc(w.status||'—')}</td><td>${fmt(w.days||0)}</td></tr>`).join('')||'<tr><td colspan="6" class="note">No workstreams yet.</td></tr>'}</tbody></table>`,opener);return;}
  if(k==='abl'){title='Total payload (ABL)';list=pl.epics.filter(e=>e.line==='ABL');}
  else if(k==='btl'){title='BTL effort';list=pl.epics.filter(e=>e.line!=='ABL');}
  else if(k[0]==='p'){title=(k[1]==='3'?'P3+':'P'+k[1])+' epics';list=pl.epics.filter(e=>bucketOf(e)===Number(k[1]));}
  else{const t=k.slice(2);title='Theme: '+t;list=pl.epics.filter(e=>e.line==='ABL'&&epicTheme(e)===t);}
  list=[...list].sort((a,b)=>(a.priority==null?0:a.priority)-(b.priority==null?0:b.priority));
  const eng=e=>[...new Set(e.workstreams.flatMap(wsNames))].join(', ')||'—';
  openModal(title,list.length?`<table class="pl-rps-t"><thead><tr><th>P</th><th>Epic</th><th>Project</th><th>Release</th><th>Line</th><th>Engineers</th><th>Days</th></tr></thead><tbody>${list.map(e=>`<tr><td>P${esc(e.priority==null?0:e.priority)}</td><td>${esc(e.name||'(unnamed)')}</td><td>${esc((prj.get(e.projectId)||{}).name||'—')}</td><td>${esc(e.releaseName||'—')}</td><td>${esc(e.line)}</td><td>${esc(eng(e))}</td><td>${fmt(epicDays(e))}</td></tr>`).join('')}</tbody></table>`:'<p class="note">No epics.</p>',opener);
}
function setTab(t){P.tab=t;const q=s=>P.el.querySelector(s);q('#pl-main').hidden=t!=='plan';q('#pl-rps').hidden=t!=='rps';P.el.querySelectorAll('[data-tab]').forEach(b=>{const on=b.dataset.tab===t;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});if(t==='rps')drawRps();}
const tone=pct=>pct>100?'over':pct>85?'warn':'ok';

// ── Persistence ─────────────────────────────────────────────────────────────
const stateText=()=>({idle:'',dirty:'Unsaved changes — click Save',saving:'Saving…',saved:'Saved '+P.stateAt,conflict:'Someone else changed this plan. <button type="button" class="text-button" data-reload>Reload</button>',error:'Could not save. <button type="button" class="text-button" data-retry>Retry</button>'}[P.state]||'');
function setState(s){P.state=s;if(s==='saved')P.stateAt=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});const c=P.el&&P.el.querySelector('#pl-state');if(c){c.className='pl-state '+s;c.innerHTML=stateText();}}
function queueSave(){setState('dirty');}
window.addEventListener('beforeunload',ev=>{if(P.state==='dirty'||P.state==='error'){ev.preventDefault();ev.returnValue='';}});
async function flush(){
  clearTimeout(P.timer);if(P.inflight)await P.inflight;if(P.state!=='dirty'&&P.state!=='error')return P.inflight;
  const my=P.seq;setState('saving');
  P.inflight=call('plan-save',{teamId:H.team.Id,plan:P.plan,revision:P.rev}).then(r=>{if(my!==P.seq)return;P.rev=r.revision;if(P.state==='saving')setState('saved');},e=>{if(my!==P.seq)return;setState(/changed/i.test(e.message)?'conflict':'error');window.toast?.(e.message,true);});
  return P.inflight;
}

// ── Rendering ───────────────────────────────────────────────────────────────
const opt=(v,l,sel)=>`<option value="${esc(v)}"${sel?' selected':''}>${esc(l)}</option>`;
const kpi=(label,val,sub,cls='',ic='chart',tone='blue',chip='')=>`<div class="pl-kpi pl-t-${tone} ${cls}">${icon(ic,tone)}<div class="pl-kpi-b"><span>${esc(label)}</span><b>${val}</b><small>${sub}</small></div>${chip?`<em class="pl-chip">${esc(chip)}</em>`:''}</div>`;
function drawSummary(){
  if(P.tab==='rps')drawRps();
  const el=P.el&&P.el.querySelector('#pl-sum');if(!el)return;
  const m=model(),pctA=m.avail?Math.round(m.abl/m.avail*100):0,pctT=m.avail?Math.round(m.total/m.avail*100):0,head=r2(m.avail-m.abl);
  const maxT=Math.max(1,...m.themes.map(t=>t.abl+t.btl));
  el.innerHTML=`<div class="pl-kpis">${kpi('Available',fmt(m.avail)+'<i>d</i>',`${m.wd} working days × ${m.rows.filter(x=>x.cap).length} engineers, less leaves, holidays and on-call`,'','users','blue',m.wd+' working days')}${kpi('Planned ABL',fmt(m.abl)+'<i>d</i>',`${pctA}% of available`,tone(pctA),'flag','green','ABL '+pctA+'%')}${kpi('Planned BTL',fmt(m.btl)+'<i>d</i>','stretch work below the line','','clock','amber','BTL')}${kpi('Total planned',fmt(m.total)+'<i>d</i>',`${pctT}% of available`,tone(pctT),'chart','violet',pctT+'% used')}${kpi(head<0?'Over capacity':'Headroom (ABL)',fmt(Math.abs(head))+'<i>d</i>',head<0?'ABL exceeds what the team can deliver':'available after ABL',head<0?'over':'ok',head<0?'risk':'bolt',head<0?'rose':'teal',head<0?'Over':'On track')}</div>
  <div class="pl-sum-grid"><section class="pl-card${P.open.theme?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="theme" aria-expanded="${P.open.theme}"><span aria-hidden="true">${P.open.theme?'▾':'▸'}</span> ${icon('chart','violet')} By theme / method</button><small>${P.open.theme?'Collapse':'Expand'}</small></h3>${m.themes.length?m.themes.map(t=>`<div class="pl-bar-row"><span class="pl-bar-l" title="${esc(t.name)}">${esc(t.name)}</span><div class="pl-bar"><i class="abl" style="width:${t.abl/maxT*100}%"></i><i class="btl" style="width:${t.btl/maxT*100}%"></i></div><span class="pl-bar-v">${fmt(t.abl)}<small> ABL</small> · ${fmt(t.btl)}<small> BTL</small></span></div>`).join(''):'<p class="note">Add effort to workstreams to see the split.</p>'}<p class="pl-legend"><i class="abl"></i>ABL <i class="btl"></i>BTL</p></section>
  <section class="pl-card${P.open.eng?'':' collapsed'}"><h3><button type="button" class="pl-fold" data-fold="eng" aria-expanded="${P.open.eng}"><span aria-hidden="true">${P.open.eng?'▾':'▸'}</span> ${icon('users','blue')} Engineer bandwidth</button><small>${P.open.eng?'Collapse':'Expand'}</small></h3><div class="pl-eng" role="table" aria-label="Engineer bandwidth"><div class="pl-eng-h" role="row"><span>Engineer</span><span>Available</span><span>ABL</span><span>BTL</span><span>Load</span></div>${m.rows.length?m.rows.map(x=>{const pct=x.avail?Math.round((x.abl+x.btl)/x.avail*100):((x.abl+x.btl)?999:0),pa=x.avail?Math.round(x.abl/x.avail*100):0;
    return `<div class="pl-eng-r" role="row"><span class="pl-eng-n" title="${esc(x.name)}">${esc(x.name)}${x.cap&&(x.leave||x.holiday||x.oncall)?`<small>${[x.leave&&fmt(x.leave)+'d leave',x.holiday&&fmt(x.holiday)+'d holiday',x.oncall&&fmt(x.oncall)+'d on-call'].filter(Boolean).join(' · ')}</small>`:''}</span><span>${x.cap?fmt(x.avail):'—'}</span><span>${fmt(x.abl)}</span><span>${fmt(x.btl)}</span><span class="pl-load ${x.cap?tone(pct):'over'}"><i style="width:${Math.min(pct,100)}%"></i><em style="width:${Math.min(pa,100)}%"></em><b>${x.cap?(pct>=999?'—':pct+'%'):'unassigned'}</b></span></div>`;}).join(''):'<p class="note">No team members loaded.</p>'}</div></section></div>`;
}
function drawPlanner(){
  const el=P.el.querySelector('#pl-planner'),pl=P.plan,rel=P.refs.releases;
  const projOpts=sel=>pl.projects.map(p=>opt(p.id,p.name||'(unnamed project)',p.id===sel)).join('');
  const engOpts=sel=>'<option value="">Unassigned</option>'+P.members.filter(m=>H.leaderRank(m.name)<0).map(m=>opt(m.id,m.name,m.id===sel)).join('');
  const V=P.view,prj=new Map(pl.projects.map(p=>[p.id,p])),q=V.q.trim().toLowerCase(),filtering=!!(q||V.release||V.line||V.eng||V.theme);
  const match=e=>{const p=prj.get(e.projectId);
    if(V.release&&e.releaseId!==V.release)return false;if(V.line&&!(e.workstreams.length?e.workstreams.some(w=>wl(e,w)===V.line):e.line===V.line))return false;
    if(V.eng&&!e.workstreams.some(w=>wsEngs(w).includes(V.eng)))return false;if(V.theme&&epicTheme(e)!==V.theme)return false;
    if(q&&!((e.name||'')+' '+(p&&p.name||'')+' '+e.workstreams.map(w=>w.name).join(' ')).toLowerCase().includes(q))return false;return true;};
  const shown=pl.epics.filter(match);
  const cnt=P.el.querySelector('#pl-count');if(cnt)cnt.textContent=filtering?`${shown.length} of ${pl.epics.length} epics`:`${pl.epics.length} epic${pl.epics.length===1?'':'s'}`;
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
          v2mom:()=>tdE('v2mom',txt('v2mom',e.v2mom,'CFS V2MOM',80,80))
        };
        const ep=cols.map(k=>C[k]()).join(''),wc='';
        const ico=d=>`<svg viewBox="0 0 20 20" aria-hidden="true">${d}</svg>`,ib=(cls,attr,lbl,d,on)=>`<button type="button" class="pl-ib ${cls}${on?'':' pl-ib-off'}" ${on?attr:'tabindex="-1" disabled'} aria-label="${lbl}" title="${lbl}">${ico(d)}</button>`;
        const act=`<td class="pl-g-act"><span class="pl-acts"${w?` data-w="${esc(w.id)}"`:''}>${w?`<button type="button" class="pl-ib pl-grip" draggable="true" data-grip aria-label="Move workstream: drag within this epic or into another epic (or press Up/Down)" title="Drag to move this workstream, within this epic or into another">${ico('<g fill="currentColor" stroke="none"><circle cx="7" cy="5" r="1.4"/><circle cx="13" cy="5" r="1.4"/><circle cx="7" cy="10" r="1.4"/><circle cx="13" cy="10" r="1.4"/><circle cx="7" cy="15" r="1.4"/><circle cx="13" cy="15" r="1.4"/></g>')}</button>`:ib('pl-grip','','',' ',false)}${ib('pl-add','data-add-ws','Add workstream','<path d="M10 4v12M4 10h12"/>',tail)}${ib('pl-rm','data-del-ws','Remove workstream','<circle cx="10" cy="10" r="7"/><path d="M6.8 10h6.4"/>',!!w)}${ib('pl-trash','data-del-epic','Delete epic','<path d="M4 6h12M8 6V4h4v2M6 6l.8 10h6.4L14 6M8.5 9v4M11.5 9v4"/>',first)}</span></td>`;
        rows.push(`<tr data-e="${esc(e.id)}"${w?` data-wr="${esc(w.id)}"`:''} class="${wl(e,w)==='ABL'?'abl':'btl'}${first?' pl-g-first':''}">${ep}${wc}${act}</tr>`);
      });
    });
    const pmenu=P.projOpen?`<div class="pl-pmenu" role="dialog" aria-label="Projects"><b>Projects</b>${pl.projects.map(p=>`<span class="pl-pchip" data-p="${esc(p.id)}"><input class="hub-inline pl-pname" type="text" list="pl-projects" placeholder="Project name (type to link a GUS project)" aria-label="Project name" data-f="name" value="${esc(p.name)}" maxlength="120"><input class="hub-inline pl-pshort" type="text" placeholder="Short form" aria-label="Short form, for example HRP M1.1.3" data-f="short" value="${esc(p.short||'')}" maxlength="30">${p.gusId?`<a class="pl-gus" href="${H.GUS}PPM_Project__c/${esc(p.gusId)}/view" target="_blank" rel="noopener">GUS ↗</a>`:'<em class="pl-draft">New</em>'}<button type="button" class="pl-x" data-add-epic aria-label="Add epic to this project" title="Add epic to this project">+</button><button type="button" class="pl-x" data-del-proj aria-label="Delete project" title="Delete project">×</button></span>`).join('')}<p class="note">Rename a project, edit its short form, or delete it. Use + Project to add one.</p></div>`:'';

    return `<div class="pl-grid-tools"><span class="pl-tl"><button type="button" class="button" data-grid-add-epic>+ Epic</button><button type="button" class="button" id="pl-add-proj">+ Project</button><span class="pl-pwrap"><button type="button" class="button" data-proj-toggle aria-haspopup="true" aria-expanded="${P.projOpen?'true':'false'}">Projects ▾</button>${pmenu}</span></span><span class="pl-cols"><button type="button" class="button" data-cols-toggle aria-haspopup="true" aria-expanded="${P.colsOpen?'true':'false'}">Columns ▾</button>${P.colsOpen?`<div class="pl-cols-menu" role="menu">${[...cols,...Object.keys(GCOL).filter(k=>!cols.includes(k))].map(k=>{const on=cols.includes(k),i=cols.indexOf(k);return `<div class="pl-colrow" data-colrow="${k}"${on?' draggable="true"':''}><span class="pl-colgrip" aria-hidden="true">${on?'⠿':''}</span><label><input type="checkbox" data-col="${k}"${on?' checked':''}> ${esc(GCOL[k])}</label>${on?`<button type="button" class="pl-colmv" data-colmv="${k}" data-d="-1" aria-label="Move ${esc(GCOL[k])} left"${i===0?' disabled':''}>▲</button><button type="button" class="pl-colmv" data-colmv="${k}" data-d="1" aria-label="Move ${esc(GCOL[k])} right"${i===cols.length-1?' disabled':''}>▼</button>`:''}</div>`;}).join('')}<div class="pl-cols-foot"><button type="button" class="pl-cols-reset" data-cols-reset>Reset to default</button><button type="button" class="button primary" data-cols-done>Done</button></div></div>`:''}</span></div><div class="pl-grid-wrap"><table class="pl-grid"><colgroup>${cols.map(k=>`<col class="${k==='name'||k==='ws'?'w-grow':'w-fit'}">`).join('')}<col class="w-fit"></colgroup><thead><tr>${cols.map(k=>`<th class="c-${k}">${esc(GCOL[k])}</th>`).join('')}<th class="c-actions">Actions</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="${cols.length+1}" class="note">No epics match the filters.</td></tr>'}</tbody></table></div>`;};
  el.innerHTML=`<datalist id="pl-projects">${P.refs.projects.map(p=>`<option value="${esc(p.name)}"></option>`).join('')}</datalist><datalist id="pl-sprints">${P.refs.sprints.map(s=>`<option value="${esc(s.name)}"></option>`).join('')}</datalist>`+
    (!pl.projects.length?'<div class="empty-state hub-empty"><h3>No projects yet</h3><p>Add a project, then epics and workstreams with effort in days.</p></div>'
     :gridHtml());
}
const wire=()=>P.el.querySelectorAll('#pl-planner select').forEach(s=>H.customSelect(s));
function drawTools(){
  const box=P.el.querySelector('#pl-tools'),pl=P.plan;if(!box||!pl)return;const V=P.view;
  const themes=[...new Set(pl.epics.map(epicTheme))].sort(),engs=P.members.filter(m=>H.leaderRank(m.name)<0);
  const sel=(k,label,list)=>`<label class="pl-tf"><span>${label}</span><select class="sp-select" data-v="${k}" aria-label="${label}"><option value="">All</option>${list.map(([v,l])=>opt(v,l,V[k]===v)).join('')}</select></label>`;
  const rels=[...new Map(pl.epics.filter(e=>e.releaseId).map(e=>[e.releaseId,e.releaseName||(P.refs.releases.find(r=>r.id===e.releaseId)||{}).name||e.releaseId])).entries()];
  box.innerHTML=`<label class="pl-tf pl-q"><span>Search</span><input type="search" class="hub-inline" data-v="q" placeholder="Epic, workstream or project…" aria-label="Search epics" value="${esc(V.q)}"></label>`+
    sel('release','Release',rels)+sel('line','Line',[['ABL','ABL'],['BTL','BTL']])+sel('eng','Engineer',engs.map(m=>[m.id,m.name]))+sel('theme','Theme',themes.map(t=>[t,t]))+
    `<label class="pl-tf"><span>Group by</span><select class="sp-select" data-v="group" aria-label="Group by">${[['project','Project'],['release','Planned release'],['line','ABL / BTL'],['theme','Theme']].map(([v,l])=>opt(v,l,V.group===v)).join('')}</select></label>`+
    `<button type="button" class="button small" data-clear-view${V.q||V.release||V.line||V.eng||V.theme?'':' disabled'}>Clear filters</button><span class="note pl-count" id="pl-count"></span>`;
  box.querySelectorAll('select').forEach(x=>H.customSelect(x));
}
function draw(){drawSummary();drawTools();drawPlanner();wire();}

const closeMs=()=>document.querySelectorAll('.ms.open').forEach(w=>{w.classList.remove('open');w.querySelector('.cs-btn').setAttribute('aria-expanded','false');});
document.addEventListener('click',e=>{if(!e.target.closest('.ms'))closeMs();
  const w=e.target.closest('.pl-grid .cs.open,.pl-grid .ms.open');if(w){const b=w.querySelector('.cs-btn'),m=w.querySelector('.cs-menu'),r=b.getBoundingClientRect();m.style.position='fixed';m.style.left=Math.min(r.left,innerWidth-m.offsetWidth-8)+'px';m.style.right='auto';m.style.top=(r.bottom+4>innerHeight-200?Math.max(8,r.top-m.offsetHeight-4):r.bottom+4)+'px';}});
addEventListener('scroll',ev=>{if(ev.target.closest&&ev.target.closest('.cs-menu,.pl-mspop'))return;closeMsPop();document.querySelectorAll('.pl-grid .cs.open').forEach(w=>{w.classList.remove('open');});closeMs();},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMs();});
// ── Edits ───────────────────────────────────────────────────────────────────
const findE=id=>P.plan.epics.find(e=>e.id===id),findP=id=>P.plan.projects.find(p=>p.id===id);
function closeMsPop(){document.querySelectorAll('.pl-mspop').forEach(x=>x.remove());}
function openMsPop(btn,c){
  closeMsPop();const wd=btn.closest('.ms'),f=wd.dataset.ms;let cur;
  if(c.w){const e=findE(c.e),w=e&&e.workstreams.find(x=>x.id===c.w);if(!w)return;cur=wsEngs(w);}else if(c.e){const e=findE(c.e);if(!e)return;cur=e.owners||[];}else return;
  const mem=P.members.filter(m=>H.leaderRank(m.name)<0),pop=document.createElement('div');pop.className='pl-mspop';pop.setAttribute('role','dialog');pop.setAttribute('aria-label',f==='owners'?'Epic owners':'Workstream owners');
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
  const fd=t.closest('[data-fold]');if(fd){P.open[fd.dataset.fold]=!P.open[fd.dataset.fold];drawSummary();return;}
  if(t.closest('[data-grid-add-epic]')){newEpicAt(t.closest('[data-grid-add-epic]'));return;}
  if(t.closest('[data-proj-toggle]')){P.projOpen=!P.projOpen;drawPlanner();wire();return;}
  if(t.closest('[data-clear-view]')){P.view=Object.assign(P.view,{q:'',release:'',line:'',eng:'',theme:''});drawTools();drawPlanner();wire();return;}
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
function openModal(title,body,opener){
  closeModal();const el=document.createElement('div');el.className='nd-overlay';
  el.innerHTML=`<div class="nd-modal pl-modal" role="dialog" aria-modal="true" aria-labelledby="pl-mt"><div class="nd-head"><h2 id="pl-mt">${esc(title)}</h2><button type="button" class="nd-x" data-close aria-label="Close">×</button></div><div id="pl-mb">${body}</div></div>`;
  document.body.appendChild(el);
  modal={el,opener,key:e=>{if(e.key==='Escape'){e.stopImmediatePropagation();e.preventDefault();closeModal();}}};document.addEventListener('keydown',modal.key,true);
  el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-close]'))closeModal();});
  (el.querySelector('input,button.primary')||el.querySelector('[data-close]')).focus();return el;
}
function openLeaves(){
  const m=P.members.filter(x=>H.leaderRank(x.name)<0),wd=workdays(P.plan.window.start,P.plan.window.end);
  const el=openModal('Leaves, holidays & on-call',`<p class="note">Days off for each engineer inside the planning window (${esc(P.plan.window.start)} → ${esc(P.plan.window.end)}, ${wd} working days). On-call is the effort each engineer spends on rotation (not available for planned work). Available days = working days − leave − holidays − on-call.</p>
  <div class="pl-leaves"><div class="pl-leaves-h"><span>Engineer</span><span>Leave (days)</span><span>Holidays (days)</span><span>On-call (days)</span><span>Available</span></div>${m.map(x=>{const p=P.plan.people[x.id]||{};return `<div class="pl-leaves-r" data-id="${esc(x.id)}"><span>${esc(x.name)}</span><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Leave days for ${esc(x.name)}" data-k="leave" value="${p.leave?fmt(p.leave):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="Holiday days for ${esc(x.name)}" data-k="holiday" value="${p.holiday?fmt(p.holiday):''}"><input class="hub-inline" type="number" min="0" max="${wd}" step="0.5" inputmode="decimal" aria-label="On-call days for ${esc(x.name)}" data-k="oncall" value="${p.oncall?fmt(p.oncall):''}"><b data-av>${fmt(Math.max(0,wd-(p.leave||0)-(p.holiday||0)-(p.oncall||0)))}</b></div>`;}).join('')||'<p class="note">No team members loaded.</p>'}</div>
  <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-leaves-save">Save</button></div>`,document.getElementById('pl-leaves'));
  el.addEventListener('input',e=>{const r=e.target.closest('.pl-leaves-r');if(!r)return;const v=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0);r.querySelector('[data-av]').textContent=fmt(Math.max(0,wd-v('leave')-v('holiday')-v('oncall')));});
  el.querySelector('#pl-leaves-save').onclick=()=>{
    el.querySelectorAll('.pl-leaves-r').forEach(r=>{const id=r.dataset.id,g=k=>Math.max(0,Number(r.querySelector(`[data-k=${k}]`).value)||0),leave=g('leave'),holiday=g('holiday'),oncall=g('oncall');
      if(leave||holiday||oncall)P.plan.people[id]={name:(P.members.find(x=>x.id===id)||{}).name||'',leave,holiday,oncall};else delete P.plan.people[id];});
    closeModal();drawSummary();queueSave();
  };
}
async function openCommit(btl){
  const opener=document.getElementById('pl-commit');await flush();
  if(P.state==='conflict'||P.state==='error')return window.toast?.('Resolve the save problem before saving to GUS.',true);
  const el=openModal('Save to GUS','<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Checking the plan…</div>',opener);
  try{
    const {preview}=await call('plan-commit',{teamId:H.team.Id,confirm:false,includeBtl:!!btl}),it=preview.items,bl=preview.blockers.length;
    el.querySelector('#pl-mb').innerHTML=`<label class="pl-btl-opt"><input type="checkbox" id="pl-incl-btl"${btl?' checked':''}> Also save below-the-line (BTL) epics to GUS</label><p class="note">${it.length?`${it.length} epic(s) above the line will be saved to GUS.`:'No epics are above the line (ABL) yet.'} ${preview.skipped?`${preview.skipped} below-the-line epic(s) stay in the dashboard.`:''}</p>
    ${it.length?`<div class="pl-review">${it.map(x=>`<div class="pl-review-r${x.problems.length?' bad':''}"><b>${esc(x.name||'(unnamed epic)')}</b><span>${x.action==='update'?'Update existing':'Create'} · project ${esc(x.project||'—')}${x.projectAction==='create-or-link'?' (created or linked)':''} · program ${esc(x.program||'—')}</span><span>Release ${esc(x.release||'—')} · priority ${x.priority==null?'—':esc(x.priority)} · planned effort ${fmt(x.effort)} days</span>${x.problems.map(p=>`<em>⚠ ${esc(p)}</em>`).join('')}</div>`).join('')}</div>`:''}
    <div class="nd-actions"><button type="button" class="button" data-close>Cancel</button><button type="button" class="button primary" id="pl-confirm" ${bl||!it.length?'disabled':''}>Create in GUS</button></div>`;
    el.querySelector('#pl-incl-btl').onchange=ev=>{closeModal();openCommit(ev.target.checked);};
    el.querySelector('#pl-confirm').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Saving to GUS…';
      try{const r=await call('plan-commit',{teamId:H.team.Id,confirm:true,includeBtl:!!btl});showResult(r);}catch(err){el.querySelector('#pl-mb').insertAdjacentHTML('afterbegin',`<p class="nd-msg error">${esc(err.message)}</p>`);b.disabled=false;b.textContent='Create in GUS';}};
  }catch(err){el.querySelector('#pl-mb').innerHTML=`<p class="nd-msg error">${esc(err.message)}</p><div class="nd-actions"><button type="button" class="button" data-close>Close</button></div>`;}
}
function showResult(r){
  if(r.plan){P.plan=r.plan;P.rev=r.revision;draw();}else load(P.el);
  const ok=r.results.filter(x=>x.ok).length;
  openModal(r.failed?'Saved with errors':'Saved to GUS',`<p class="note">${ok} of ${r.results.length} epic(s) saved to GUS${r.failed?`; ${r.failed} failed and can be retried — saved ones are not duplicated`:''}.${r.saveError?` The draft could not record the GUS ids (${esc(r.saveError)}); reload before retrying.`:''}</p>
  <div class="pl-review">${r.results.map(x=>`<div class="pl-review-r${x.ok?'':' bad'}"><b>${esc(x.name)}</b><span>${x.ok?esc([x.project,x.action].filter(Boolean).join(' · ')):'⚠ '+esc(x.error)}</span>${x.gusId?`<a class="pl-gus" href="${H.GUS}ADM_Epic__c/${esc(x.gusId)}/view" target="_blank" rel="noopener">Open in GUS ↗</a>`:''}</div>`).join('')}</div>
  <div class="nd-actions"><button type="button" class="button primary" data-close>Done</button></div>`,null);
}

// ── Page ────────────────────────────────────────────────────────────────────
async function load(el){
  const my=++P.seq;clearTimeout(P.timer);P.state='idle';P.plan=null;
  el.querySelector('#pl-sum').innerHTML='<div class="hub-loading" role="status"><span class="executive-spinner" aria-hidden="true"></span> Loading plan…</div>';el.querySelector('#pl-planner').innerHTML='';
  try{
    const id=H.team.Id,[g,refs,members]=await Promise.all([call('plan-get',{teamId:id}),call('plan-refs',{teamId:id}).catch(e=>({releases:[],programs:[],projects:[],sprints:[],warnings:[e.message]})),H.members().catch(()=>[])]);
    if(my!==P.seq)return;
    P.plan=g.plan.window.start?g.plan:{...g.plan,window:emptyPlan().window};P.rev=g.revision;P.refs=refs;P.members=members;
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
    el.innerHTML=`<div class="executive-heading"><div><h2>${icon('plan','green')} Release Planning (Quarterly)</h2><p>Plan projects, epics and workstreams for ${esc(H.team.Name)}. Effort is in days; epics above the line (ABL) are saved to GUS when you confirm.</p></div><div class="heading-actions"><span id="pl-state" class="pl-state" role="status" aria-live="polite"></span><label class="pl-team">Team <select class="hub-inline" id="pl-team" aria-label="Team whose release plan this is">${(H.teams||[]).map(t=>`<option value="${esc(t.Id)}"${t.Id===H.team.Id?' selected':''}>${esc(t.short||t.Name)}</option>`).join('')}</select></label><button type="button" class="button" id="pl-leaves">Leaves, holidays &amp; on-call</button><button type="button" class="button" id="pl-save" title="Save your entries to the shared GUS Apps backend (also saved automatically)">Save</button><button type="button" class="button primary" id="pl-commit">Review &amp; save to GUS</button></div></div>
    <div id="pl-warn"></div>
    <div class="pl-tabs" role="tablist" aria-label="Release planning views"><button type="button" role="tab" data-tab="plan" class="on" aria-selected="true"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 8.5h14M8 8.5V16"/></svg>Release Planner</button><button type="button" role="tab" data-tab="rps" aria-selected="false"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5"/></svg>Planned Release Summary</button><div class="pl-dates"><label>Planning window <input type="date" class="hub-inline" id="pl-start" aria-label="Window start"></label><span aria-hidden="true">→</span><input type="date" class="hub-inline" id="pl-end" aria-label="Window end"><span class="note" id="pl-last"></span></div></div>
    <div id="pl-main"><div id="pl-sum"></div>
    <section id="pl-fs" class="pl-fs"><div class="pl-planner-h"><h3>${icon('plan','green')} Projects &amp; epics</h3><span class="pl-planner-btns"><button type="button" class="button" id="pl-fs-btn" aria-pressed="false" title="Show Projects &amp; epics full screen">Full screen</button><button type="button" class="button" id="pl-export" title="Download an Excel template with the current plan, column headers and dropdown lists">Export template</button><button type="button" class="button" id="pl-import" title="Import plan rows from the exported template">Import</button><input type="file" id="pl-import-file" accept=".xlsx" hidden></span></div><div id="pl-tools" class="pl-tools"></div><div id="pl-planner"></div></section></div><div id="pl-rps" hidden></div>`;
    el.querySelector('#pl-team').addEventListener('change',e=>H.setTeam(e.target.value));
    P.tab='plan';
    el.oninput=onInput;
    el.onchange=ev=>{if(ev.target.closest('#pl-start,#pl-end')){const s=el.querySelector('#pl-start').value,e=el.querySelector('#pl-end').value;if(s&&e&&s<=e&&P.plan){P.plan.window={start:s,end:e};drawSummary();queueSave();}else if(s&&e&&s>e)window.toast?.('End date must be on or after the start date.',true);return;}onInput(ev);};
    document.querySelectorAll('#pl-back').forEach(x=>x.remove());
    const bar=document.querySelector('.dashboard-bar');if(bar){const bk=document.createElement('a');bk.href='#/home';bk.id='pl-back';bk.className='pl-back';bk.title='Back to Release Intelligence — Team Hub for this team';bk.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12 4 6 10l6 6M6 10h10"/></svg><span>Back to Release Intelligence</span>';
      bk.onclick=ev=>{ev.preventDefault();if(P.state==='dirty'&&!confirm('You have unsaved changes. Leave without saving?'))return;H.go('home');};bar.appendChild(bk);}el.onclick=onClick;wireDrag(el);wireColDrag(el);el.querySelector('#pl-import-file').onchange=ev=>{const f=ev.target.files[0];ev.target.value='';if(f)f.arrayBuffer().then(b=>openImport(b,el.querySelector('#pl-import')));};load(el);
  }});
H.onEsc('plan',()=>{closeModal();return true;});
window.addEventListener('beforeunload',e=>{if(P.state==='dirty'||P.state==='saving'){e.preventDefault();e.returnValue='';}});
window.addEventListener('hub:team',()=>{closeModal();clearTimeout(P.timer);});
})();
