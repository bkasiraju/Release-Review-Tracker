'use strict';
const {randomUUID}=require('crypto');const {URL}=require('url');
const {parseComments,mergeComments,plainText,validMonth}=require('./comments');
const {parseEpicLinks,validId,safeError}=require('./gus');
function yearValue(y){y=Number(y);if(!Number.isInteger(y)||y<2000||y>2099)throw Error('Reference year must be between 2000 and 2099.');return y;}
function publicParsed(p){return {months:p.months,unassigned:p.unassigned,inferred:p.inferred,yearAmbiguous:p.yearAmbiguous};}
function listDefaults(columns=[]){const keys=columns.map(c=>c.key).filter(k=>k!=='comments');return [...new Set(keys.length?[...keys,'name','health']:['project','name','health','lead','months','pathToGreen'])];}
const CANON_COLUMNS=['project','name','owner','health','months','pathToGreen','completion','planned','actual','closed','inProgress','newPoints','waiting','lead','team'];
function releaseScope(r){const lists=Array.isArray(r.sources)?r.sources.map(s=>s?.id).filter(id=>typeof id==='string'&&/^00B[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(id)).map(id=>id.slice(0,15)).sort():[];const manual=[];if(lists.length)for(const token of String(r.inputLinks||'').replace(/\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g,'$1').split(/[\s,]+/).filter(Boolean)){let id=null;if(/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(token)&&!token.startsWith('00B'))id=token;else if(token.includes('://')){try{const path=new URL(token).pathname,idMatch=path.match(/^\/lightning\/r\/ADM_Epic__c\/([A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?)\/view\/?$/)||path.match(/^\/([A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?)\/?$/);if(idMatch)id=idMatch[1];}catch{}}if(id)manual.push(id.slice(0,15));}return JSON.stringify([lists.length?['lists',...new Set(lists)]:String(r.name||'').trim().replace(/\s+/g,' ').toLowerCase(),r.year,lists.length?[...new Set(manual)].sort():[...(r.epicIds||[])].sort(),lists.length?null:String(r.inputLinks||'').trim().replace(/\s+/g,' ').toLowerCase()]);}
function activeReleases(rows){const deleted=new Set(rows.filter(r=>r._deleted).flatMap(r=>r._deletedAliases||[r.id]));return rows.filter(r=>!r._deleted&&!deleted.has(r.id));}
class Service{
  constructor(store,gus,options={}){this.store=store;this.gus=gus;this.shared=options.shared===true;}
  async state(){const [catalog,epics]=await Promise.all([this.store.list('release'),this.store.list('epic')]);const releases=activeReleases(catalog);releases.sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));return {releases,epics:epics.map(e=>({...e,parsed:publicParsed(this.parsed(e)),pathToGreen:plainText(e.pathToGreen)}))};}
  async release(id){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Select a saved release.');const r=await this.store.get('release',id);if(!r)throw Error('Release not found. Reload the dashboard.');if(r._deleted)throw Error('This release was deleted. Reload the dashboard.');const catalog=await this.releaseCatalog();if(!activeReleases(catalog).some(x=>x.id===id))throw Error('This release was deleted. Reload the dashboard.');return r;}
  async releaseCatalog(){return this.store.list('release');}
  async deleteRelease(data){
    const r=await this.release(data.releaseId);if(data.revision!==r.revision)throw Error('This release changed. Reload before deleting.');
    if(data.confirmation!==r.name)throw Error('Confirm the exact release name before deleting.');
    const aliases=(await this.releaseCatalog()).filter(x=>!x._deleted&&releaseScope(x)===releaseScope(r));
    const results=[];for(let i=0;i<aliases.length;i+=4){results.push(...await Promise.all(aliases.slice(i,i+4).map(async old=>{try{await this.store.put('release',old.id,{...old,_deleted:true,_deletedAliases:aliases.map(x=>x.id),_deletedAt:new Date().toISOString()},old.revision);return {id:old.id,deleted:true};}catch(error){return {id:old.id,deleted:false,error:safeError(error)};}})));}
    if(!results.some(x=>x.deleted))throw Error(results[0]?.error||'Could not delete this release.');
    return {results};
  }
  async saveRelease(data){
    const name=String(data.name||'').trim();if(!name||name.length>100)throw Error('Enter a release name (up to 100 characters).');
    const old=data.id?await this.release(data.id):null;
    const year=yearValue(data.year),inputLinks=String(data.links??'').trim();const resolved=typeof this.gus.resolveEpicInputs==='function'?await this.gus.resolveEpicInputs(inputLinks):{ids:parseEpicLinks(inputLinks),sources:[],columns:[]};const ids=resolved.ids;const id=data.id||randomUUID();
    if(old&&data.revision!==old.revision)throw Error('This release changed. Reload before saving.');
    const months=(data.months??old?.months??[]);if(!Array.isArray(months)||months.length>120)throw Error('Use up to 120 review months.');months.forEach(validMonth);
    const sourceChanged=JSON.stringify(old?.sourceColumns||[])!==JSON.stringify(resolved.columns);const columnMode=data.columns?'custom':old?.columnMode==='custom'&&!sourceChanged?'custom':'gus';const columns=data.columns??(columnMode==='custom'?old.columns:listDefaults(resolved.columns));
    const allowedColumns=new Set([...CANON_COLUMNS,...resolved.columns.map(c=>c.key)]);
    if(columns!==null&&(!Array.isArray(columns)||columns.some(c=>typeof c!=='string'||!allowedColumns.has(c))))throw Error('Invalid column settings. Choose a supported dashboard or source-list column.');
    const value={id,name,year,epicIds:ids,inputLinks,sources:resolved.sources,sourceColumns:resolved.columns,columnMode,months:[...new Set(months)],hiddenMonths:old?.hiddenMonths||[],visibleMonths:old?.visibleMonths,columns,_storageConflicts:data.resolveStorage?[]:(old?._storageConflicts||[])};return this.store.put('release',id,value,old?data.revision:null);
  }
  async executive(data){
    const id=validId(data.epicId),month=validMonth(data.month),r=await this.release(data.releaseId);if(!r.epicIds.includes(id))throw Error('Epic is not part of this release.');
    const [result,stored]=await Promise.all([this.gus.epics([id],[{field:'Project__r.Name',key:'gus:Project__r.Name'}]),this.store.get('epic',id)]);const row=result.epics[0];if(!row)throw Error('Epic is not visible in GUS.');
    const epic={...stored,...row,year:stored?.year??r.year,yearMapping:stored?.yearMapping||{}};return require('./executive').healthSource(epic,this.parsed(epic),month);
  }
  async monthlySummary(data){
    const id=validId(data.epicId),month=validMonth(data.month),r=await this.release(data.releaseId);if(!r.epicIds.includes(id))throw Error('Epic is not part of this release.');
    if(data.previewOnly===true&&(typeof data.displayedText!=='string'||data.displayedText.length>50000))throw Error('Monthly preview supports up to 50,000 characters.');
    const columns=['Description__c','Success_Criteria__c','Goal__c','Goals__c','Acceptance_Criteria__c'].map(field=>({field,key:'gus:'+field}));
    const [result,work,old]=await Promise.all([this.gus.epics([id],columns),this.gus.workItems(id,{details:true,month}),this.store.get('epic',id)]),row=result.epics[0];if(!row)throw Error('Epic is not visible in GUS.');
    const e={...old,...row,year:old?.year??r.year,yearMapping:old?.yearMapping||{}};let parsed=this.parsed(e);if(data.previewOnly===true){parsed={...parsed,months:{...parsed.months,[month]:data.displayedText}};}const health=require('./executive').healthSource(e,parsed,month);
    return {epicId:id,month,...await require('./monthly').monthlyDraft(this.gus.sf,{epic:e,health,work,month},{prepare:data.useSdk===true})};
  }
  async executivePlan(data){
    validMonth(data.month);
    if(!Array.isArray(data.releaseIds)||!data.releaseIds.length||data.releaseIds.length>100)throw Error('Choose releases before generating a summary.');
    const catalog=activeReleases(await this.releaseCatalog()),releases=data.releaseIds.map(id=>{const r=catalog.find(r=>r.id===id);if(!r)throw Error('Release no longer available. Refresh and retry.');return r;});
    const ids=[...new Set(releases.flatMap(r=>r.epicIds))],groups=new Map();
    if(ids.length>500)throw Error('Choose releases containing up to 500 unique epics.');
    for(let start=0;start<ids.length;start+=50){const batch=ids.slice(start,start+50),result=await this.gus.epics(batch,[{field:'Project__r.Name',key:'gus:Project__r.Name'}]);
      if(result.epics.length!==batch.length)throw Error('Some epics are not visible in GUS. Refresh the release before summarizing.');
      for(const e of result.epics){const measure=e.project||e.extra?.['Project__r.Name']||'Measure not set in GUS',team=e.team||'Team not set in GUS',key=JSON.stringify([measure,team]);if(!groups.has(key))groups.set(key,{measure,team,epicIds:[]});groups.get(key).epicIds.push(e.id);}
    }
    return {groups:[...groups.values()].flatMap(g=>g.epicIds.map(id=>({...g,epicIds:[id]})))};
  }
  async executiveBlurb(data){
    const month=validMonth(data.month);if(!Array.isArray(data.releaseIds)||!data.releaseIds.length||data.releaseIds.length>100||!Array.isArray(data.epicIds)||!data.epicIds.length||data.epicIds.length>500)throw Error('Choose a supported release scope for the executive update.');
    const catalog=activeReleases(await this.releaseCatalog()),releases=data.releaseIds.map(id=>{const r=catalog.find(r=>r.id===id);if(!r)throw Error('Release no longer available. Refresh and retry.');return r;});
    const ids=[...new Set(data.epicIds.map(validId))];if(ids.some(id=>!releases.some(r=>r.epicIds.includes(id))))throw Error('Epic is not part of the selected releases.');
    const sources=[];const {healthSource,summarizeGroup}=require('./executive');
    for(let start=0;start<ids.length;start+=50){const batch=ids.slice(start,start+50);const [result,saved]=await Promise.all([this.gus.epics(batch,[{field:'Project__r.Name',key:'gus:Project__r.Name'}]),typeof this.store.getMany==='function'?this.store.getMany('epic',batch):Promise.all(batch.map(async id=>[id,await this.store.get('epic',id)])).then(entries=>new Map(entries))]);
      if(result.epics.length!==batch.length)throw Error('Some epics are not visible in GUS. Refresh the release before summarizing.');
      for(const row of result.epics){const old=saved.get(row.id),r=releases.find(r=>r.epicIds.includes(row.id)),e={...old,...row,year:old?.year??r.year,yearMapping:old?.yearMapping||{}};const source=healthSource(e,this.parsed(e),month);if(source.measure!==data.measure||source.team!==data.team)throw Error('The GUS measure or team changed. Fetch the latest data and regenerate.');sources.push(source);}
    }
    return {measure:data.measure,team:data.team,epicId:sources.length===1?sources[0].epicId:null,epicName:sources.length===1?sources[0].name:null,...await summarizeGroup(this.gus.sf,sources,{prepare:data.useSdk===true}),reportedMonths:[...new Set(sources.flatMap(s=>s.reportedMonths||[]))].sort(),hasUndated:sources.some(s=>!!s.undated),generatedAt:new Date().toISOString()};
  }
  async saveSettings(data){
    const r=await this.release(data.releaseId);
    if(data.revision!==r.revision)throw Error('This release changed. Reload its latest settings before saving.');
    const patch={};
    if(data.columns!==undefined){const allowed=new Set([...CANON_COLUMNS,...(r.sourceColumns||[]).map(c=>c.key)]);
      if(!Array.isArray(data.columns)||!data.columns.includes('name')||data.columns.some(c=>typeof c!=='string'||!allowed.has(c)))throw Error('Invalid column settings. Choose supported dashboard columns.');
      patch.columns=[...new Set([...data.columns,'name','health'])];patch.columnMode=data.columnMode==='gus'?'gus':'custom';if(patch.columnMode==='gus')patch.columns=listDefaults(r.sourceColumns||[]);
    }
    if(data.months!==undefined){if(!Array.isArray(data.months)||data.months.length>120)throw Error('Use up to 120 review months.');data.months.forEach(validMonth);patch.months=[...new Set(data.months)];}
    if(data.visibleMonths!==undefined){if(!Array.isArray(data.visibleMonths)||data.visibleMonths.length>120)throw Error('Use up to 120 visible months.');data.visibleMonths.forEach(validMonth);patch.visibleMonths=[...new Set(data.visibleMonths)];}
    if(data.hiddenMonths!==undefined){if(!Array.isArray(data.hiddenMonths)||data.hiddenMonths.length>120)throw Error('Use up to 120 hidden months.');data.hiddenMonths.forEach(validMonth);patch.hiddenMonths=[...new Set(data.hiddenMonths)];}
    if(!Object.keys(patch).length)throw Error('Choose columns or review months to save.');
    return this.store.put('release',r.id,{...r,...patch},r.revision);
  }
  async cachedRefreshTime(r){
    if(!r.epicIds.length)return r.lastGusRefreshAt||null;
    const times=[];for(let start=0;start<r.epicIds.length;start+=100){const ids=r.epicIds.slice(start,start+100),rows=typeof this.store.getMany==='function'?await this.store.getMany('epic',ids):new Map(await Promise.all(ids.map(async id=>[id,await this.store.get('epic',id)])));for(const id of ids){const time=Date.parse(rows.get(id)?.fetchedAt);if(!Number.isFinite(time))return null;times.push(time);}}
    return new Date(Math.min(...times)).toISOString();
  }
  async finishFetch(data){
    const r=await this.release(data.releaseId);if(data.fetchRevision!==r.revision)throw Error('Release changed during fetch. Start Fetch again.');
    const time=r.epicIds.length?await this.cachedRefreshTime(r):new Date().toISOString();if(!time)throw Error('Some epics were not saved. Retry Fetch before marking the release refreshed.');
    return this.store.put('release',r.id,{...r,lastGusRefreshAt:time},r.revision);
  }
  async fetch(releaseId,page=null){
    let r=await this.release(releaseId);
    if(page?.automatic===true&&page.cursor===undefined){const cachedAt=await this.cachedRefreshTime(r),refreshedAt=cachedAt?new Date(Math.min(Date.parse(cachedAt),Date.parse(r.lastGusRefreshAt||cachedAt))).toISOString():null,age=Date.now()-Date.parse(refreshedAt);if(refreshedAt&&age>=0&&age<3600000)return {cached:true,results:[],nextCursor:null,total:0,fetchRevision:r.revision,release:r};}
    if((!page||page.cursor===undefined)&&r.sources?.length){const resolved=await this.gus.resolveEpicInputs(r.inputLinks);const sourceChanged=JSON.stringify(r.sourceColumns||[])!==JSON.stringify(resolved.columns),columnMode=r.columnMode==='custom'&&!sourceChanged?'custom':'gus',columns=columnMode==='custom'?r.columns:listDefaults(resolved.columns);if(JSON.stringify([r.epicIds,r.sources,r.sourceColumns,r.columns,r.columnMode])!==JSON.stringify([resolved.ids,resolved.sources,resolved.columns,columns,columnMode]))r=await this.store.put('release',r.id,{...r,epicIds:resolved.ids,sources:resolved.sources,sourceColumns:resolved.columns,columns,columnMode},r.revision);}
    if(page&&page.cursor===undefined&&!r.epicIds.length)r=await this.finishFetch({releaseId:r.id,fetchRevision:r.revision});
    if(page&&page.cursor===undefined)return {results:[],nextCursor:r.epicIds.length?0:null,fetchRevision:r.revision,total:r.epicIds.length,release:r};
    if(page&&(!Number.isInteger(page.cursor)||page.cursor<0||page.cursor>=r.epicIds.length||page.fetchRevision!==r.revision))throw Error('Release changed during fetch. Start Fetch again.');
    if(!r.epicIds.length)return {results:[],nextCursor:null};
    const ids=page?r.epicIds.slice(page.cursor,page.cursor+1):r.epicIds;
    const {epics}=await this.gus.epics(ids,r.sourceColumns||[]);const results=[];
    for(const id of ids){const row=epics.find(e=>e.id===id);if(!row){results.push({epicId:id,status:'error',error:'Epic not found or not visible. Check the link and GUS sharing.'});continue;}
      try{const old=await this.store.get('epic',id);const saved=await this.store.put('epic',id,{...old,...row,extra:{...old?.extra,...row.extra},year:old?.year??r.year,yearConfirmed:old?.yearConfirmed??false,yearMapping:old?.yearMapping??{},drafts:old?.drafts??{},fetchedAt:new Date().toISOString()},old?.revision??null);results.push({epicId:id,status:'fetched',name:saved.name,epic:{...saved,parsed:publicParsed(this.parsed(saved)),pathToGreen:plainText(saved.pathToGreen)}});}
      catch(e){results.push({epicId:id,status:'error',error:safeError(e)});}
    }
    return {results,...(page?{nextCursor:page.cursor+1<r.epicIds.length?page.cursor+1:null,fetchRevision:r.revision,total:r.epicIds.length}:{})};
  }
  async saveDraft(data){
    const id=validId(data.epicId),month=validMonth(data.month);if(typeof data.value!=='string'||data.value.length>50000)throw Error('Monthly updates support up to 50,000 characters.');
    let r=null;
    if(data.releaseId){r=await this.release(data.releaseId);if(!r.epicIds.includes(id))throw Error('Epic is not part of this release.');}
    if(data.autoSync===true&&(!r||typeof data.base!=='string'||data.base.length>50000))throw Error('A release and displayed monthly baseline are required.');
    let e=await this.store.get('epic',id);
    if(!e){if(!r)throw Error('Fetch this epic before editing.');const row=await this.gus.epic(id);e=await this.store.put('epic',id,{...row,year:r.year,yearConfirmed:false,yearMapping:{},drafts:{},fetchedAt:new Date().toISOString()},null);}
    if(data.requestId!==undefined&&(typeof data.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(data.requestId)))throw Error('Invalid save request.');
    const prior=e.drafts?.[month];
    if(data.autoSync===true&&data.requestId&&prior?.requestId===data.requestId&&prior.autoSync&&prior.releaseId===r.id&&prior.value===data.value.trim()&&prior.base===data.base&&!(e._storageConflicts||[]).some(c=>c.path==='drafts.'+month))return e;
    if((prior?.revision??null)!==(data.revision??null))throw Error('This monthly draft changed in another window. Reload before saving.');
    const storageConflicts=e._storageConflicts||[];
    if(storageConflicts.some(c=>c.path==='drafts.'+month)&&!data.resolveStorage)throw Error('This month has competing saved drafts. Resolve them from Review & sync.');
    if(data.resolveStorage&&data.epicRevision!==e.revision)throw Error('Saved drafts changed again. Reload and review the conflict.');
    let baseline=prior?.base??(data.autoSync===true?data.base:this.parsed(e).months[month])??'';
    if(data.resolve){const remote=await this.gus.epic(id);baseline=this.parsed({...e,comments:remote.comments}).months[month]??'';if(typeof data.expectedRemote!=='string'||baseline!==data.expectedRemote)throw Error('This GUS month changed again. Preview the latest conflict before resolving.');}
    const drafts={...e.drafts};
    if(data.discard)delete drafts[month];else drafts[month]={value:data.value.trim(),base:baseline,revision:randomUUID(),updatedAt:new Date().toISOString(),...(data.autoSync===true?{autoSync:true,releaseId:r.id,...(data.requestId?{requestId:data.requestId}:{})}:{})};
    return this.store.put('epic',id,{...e,drafts,_storageConflicts:data.resolveStorage?storageConflicts.filter(c=>c.path!=='drafts.'+month):storageConflicts},e.revision);
  }
  async publishMonth(data){
    const id=validId(data.epicId),month=validMonth(data.month),r=await this.release(data.releaseId);
    if(!r.epicIds.includes(id))throw Error('Epic is not part of this release.');
    const e=await this.store.get('epic',id),draft=e?.drafts?.[month];
    if(!draft||draft.revision!==data.draftRevision)throw Error('This monthly draft changed. Reload before retrying.');
    if(this.shared&&(!draft.requestId||data.requestId!==draft.requestId||data.value!==draft.value))throw Error('Review and approve this shared draft before publishing it in a new session.');
    const releases=activeReleases(await this.store.list('release'));
    const item=await this.buildItem({...e,drafts:{[month]:draft}},releases,month);
    if(item.status!=='ready')return {...item,month};
    const recheck=await this.store.get('epic',id);if(recheck?.drafts?.[month]?.revision!==draft.revision)throw Error('This monthly draft changed before publication. Reload before retrying.');
    let write={conditional:true};
    if(item.consolidated!==item.remote.comments)write=await this.gus.updateComments(id,item.consolidated,item.remote.modified);
    const verified=await this.readComments(id);
    if((this.parsed({...e,comments:verified.comments}).months[month]??'')!==draft.value)throw Error('GUS save could not be verified. Your saved monthly update is retained.');
    const latest=await this.store.get('epic',id),drafts={...latest.drafts};
    if(drafts[month]?.revision===draft.revision)delete drafts[month];
    const saved=await this.store.put('epic',id,{...latest,...verified,drafts,lastSyncedAt:new Date().toISOString()},latest.revision);
    return {status:'synced',epicId:id,month,conditional:write.conditional,epic:{...saved,parsed:publicParsed(this.parsed(saved))}};
  }
  async readComments(id){return typeof this.gus.comments==='function'?this.gus.comments(id):this.gus.epic(id);}
  parsed(e){
    const p=parseComments(e.comments,e.year);
    if(e.yearMapping&&Object.keys(e.yearMapping).length){
      const months={};for(const s of p.sections){const key=s.inferred?(e.yearMapping[s.month]||s.month):s.month;months[key]=[months[key],s.text].filter(Boolean).join('\n\n');}p.months=months;
    }
    return p;
  }
  async setYear(data){
    const id=validId(data.epicId),e=await this.store.get('epic',id);if(!e)throw Error('Fetch this epic first.');
    if(data.revision!==e.revision)throw Error('This epic changed. Reload before confirming years.');
    const year=yearValue(data.year);if(Object.keys(e.drafts||{}).length&&year!==e.year)throw Error('Discard pending drafts before changing the reference year.');
    const mapping=data.mapping||{};for(const [a,b] of Object.entries(mapping)){validMonth(a);validMonth(b);if(a.slice(5)!==b.slice(5))throw Error('Year mapping must preserve the month.');}
    return this.store.put('epic',id,{...e,year,yearConfirmed:true,yearMapping:mapping,_storageConflicts:(e._storageConflicts||[]).filter(c=>c.path.startsWith('drafts.'))},data.revision);
  }
  async buildItem(e,releases,onlyMonth=null){
    if(e._storageConflicts?.length)return {epicId:e.id,name:e.name,status:'draft-conflict',error:'Competing saved changes require review.',conflicts:e._storageConflicts.map(c=>({month:c.path.startsWith('drafts.')?c.path.slice(7):null,remote:c.previous?.value??JSON.stringify(c.previous),local:c.incoming?.value??JSON.stringify(c.incoming),storage:true,path:c.path}))};
    const remote=await this.readComments(e.id),p=this.parsed({...e,comments:remote.comments}),drafts=e.drafts||{};
    const years=new Set(releases.filter(r=>r.epicIds.includes(e.id)).map(r=>r.year));
    const needsYear=(p.inferred.length&&years.size>1&&!e.yearConfirmed)||
      (p.yearAmbiguous&&!p.inferred.every(m=>Object.hasOwn(e.yearMapping||{},m)));
    if(needsYear)return {epicId:e.id,name:e.name,status:'year-conflict',error:'Confirm years for undated GUS headings before syncing.',remote,months:p.months,inferred:p.inferred};
    const conflicts=[];
    for(const [month,d] of Object.entries(drafts)){const current=p.months[month]??'';if(current!==d.base&&current!==d.value)conflicts.push({month,base:d.base,remote:current,local:d.value,revision:d.revision});}
    // Canonicalize inferred headings only when the user supplied a year mapping.
    // Map each original heading independently, retaining surrounding rich text.
    let source=remote.comments;
    if(Object.keys(e.yearMapping||{}).length){
      const original=parseComments(source,e.year);const replacements=[];
      for(const section of original.sections)if(section.inferred&&e.yearMapping[section.month]&&(!onlyMonth||e.yearMapping[section.month]===onlyMonth)){
        const target=e.yearMapping[section.month];
        // Text-node aware replacement of just the heading's year avoids changing body markup.
        const position=original._positions[section.start];
        const headerEnd=section.bodyStart;
        const positions=original._positions.slice(section.start,headerEnd).filter(Boolean);
        if(positions.length){const first=positions[0][0],last=positions.at(-1)[1];const rawHeading=source.slice(first,last);const match=rawHeading.match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember|t)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i);if(match)replacements.push([first+match.index+match[0].length,target.slice(0,4)]);}
      }
      for(const [pos,y] of replacements.sort((a,b)=>b[0]-a[0]))source=source.slice(0,pos)+' '+y+source.slice(pos);
    }
    const changes=Object.fromEntries(Object.entries(drafts).map(([m,d])=>[m,d.value]));
    const consolidated=mergeComments(source,e.year,changes);
    return {epicId:e.id,name:e.name,status:conflicts.length?'conflict':'ready',conflicts,months:p.months,consolidated,preview:plainText(consolidated),remote,epicRevision:e.revision,draftRevisions:Object.fromEntries(Object.entries(drafts).map(([m,d])=>[m,d.revision]))};
  }
  async preview(releaseId,epicId=null){const r=await this.release(releaseId),releases=activeReleases(await this.store.list('release')),items=[];
    if(epicId&&!r.epicIds.includes(validId(epicId)))throw Error('Epic is not part of this release.');
    for(const id of epicId?[epicId]:r.epicIds){const e=await this.store.get('epic',id);if(!e||!Object.keys(e.drafts||{}).length)continue;try{items.push(await this.buildItem(e,releases));}catch(err){items.push({epicId:id,name:e.name,status:'error',error:safeError(err)});}}
    return {items};
  }
  async sync(releaseId,approved){
    const r=await this.release(releaseId),releases=activeReleases(await this.store.list('release')),results=[];
    for(const id of r.epicIds){if(approved&&!approved.some(a=>a.epicId===id))continue;const e=await this.store.get('epic',id);if(!e||!Object.keys(e.drafts||{}).length)continue;
      try{
        if(approved){const approval=approved.find(a=>a.epicId===id);if(!approval)continue;const versions=Object.fromEntries(Object.entries(e.drafts).map(([m,d])=>[m,d.revision]));if((approval.epicRevision&&approval.epicRevision!==e.revision)||JSON.stringify(Object.entries(versions).sort())!==JSON.stringify(Object.entries(approval.draftRevisions||{}).sort()))throw Error('Drafts changed after preview. Review the latest preview before syncing.');}
        const item=await this.buildItem(e,releases);if(item.status!=='ready'){results.push(item);continue;}
        let write={conditional:true};if(item.consolidated!==item.remote.comments)write=await this.gus.updateComments(id,item.consolidated,item.remote.modified);
        const verified=await this.gus.epic(id);const actual=this.parsed({...e,comments:verified.comments}).months;
        if(Object.entries(e.drafts).some(([month,d])=>(actual[month]??'')!==d.value))throw Error('GUS write could not be verified. Drafts are retained. Fetch and preview before retrying.');
        const latest=await this.store.get('epic',id),drafts={...latest.drafts};for(const [month,revision] of Object.entries(item.draftRevisions))if(drafts[month]?.revision===revision)delete drafts[month];
        await this.store.put('epic',id,{...latest,...verified,extra:{...latest.extra,...verified.extra},drafts,year:latest.year,yearConfirmed:latest.yearConfirmed,yearMapping:latest.yearMapping,lastSyncedAt:new Date().toISOString(),fetchedAt:new Date().toISOString()},latest.revision);
        results.push({epicId:id,name:e.name,status:'synced',conditional:write.conditional});
      }catch(err){results.push({epicId:id,name:e.name,status:'error',error:safeError(err)});}
    }
    return {results};
  }
}
module.exports={Service,releaseScope};
