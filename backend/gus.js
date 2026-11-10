'use strict';
const {URL}=require('url');
const {plainText}=require('./comments');
const EPIC_FIELDS={name:'Name',project:'Project__r.Name',health:'Health__c',comments:'Epic_Health_Comments__c',pathToGreen:'Path_to_Green__c',completion:'Percent_Of_Work_Items_Complete__c',planned:'Planned_Story_Points__c',actual:'Actual_Story_Points_on_Epic__c',closed:'Storypoints_Closed__c',inProgress:'Storypoints_In_Progress__c',newPoints:'Storypoints_New__c',waiting:'Storypoints_In_Waiting__c',owner:'Owner.Name',lead:'Development_Lead__r.Name',team:'Team__r.Name',modified:'LastModifiedDate'};
const WORK_FIELDS={number:'Name',title:'Subject__c',status:'Status__c',assignee:'Assignee__r.Name',sprint:'Sprint__r.Name',sprintStart:'Sprint__r.Start_Date__c',sprintEnd:'Sprint__r.End_Date__c',points:'Story_Points__c',priority:'Priority__c'};
const FIELD_PATH=/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
function validId(id){if(typeof id!=='string'||!/^([a-zA-Z0-9]{15}|[a-zA-Z0-9]{18})$/.test(id))throw Error('Use a GUS epic record link or a 15/18-character Salesforce record ID.');return id.slice(0,15);}
function parseEpicLinks(input){
  if(typeof input!=='string'||input.length>100000)throw Error('Paste up to 500 epic links.');
  const ids=[];
  for(const word of input.split(/[\s,]+/).filter(Boolean)){
    let id=word;
    if(word.includes('://')){
      let u;try{u=new URL(word);}catch{throw Error('Invalid epic link.');}
      if(u.protocol!=='https:'||!['gus.my.salesforce.com','gus.lightning.force.com'].includes(u.hostname))throw Error('Only GUS Salesforce epic links are supported.');
      const lightning=u.pathname.match(/^\/lightning\/r\/ADM_Epic__c\/([a-zA-Z0-9]+)\/view\/?$/);
      const classic=u.pathname.match(/^\/([a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?)\/?$/);
      if(!lightning&&!classic)throw Error('Paste individual epic links, rather than list views or work item links.');
      id=(lightning||classic)[1];
    }
    id=validId(id);if(!ids.includes(id))ids.push(id);
  }
  if(ids.length>500)throw Error('A release supports up to 500 epics.');return ids;
}
function getPath(obj,path){return path.split('.').reduce((v,k)=>v?.[k],obj)??null;}
function safeError(e){return String(e?.message||e||'GUS request failed').replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/00D[a-zA-Z0-9]{12,15}![a-zA-Z0-9._-]+/g,'[redacted]').slice(0,600);}
class Gus{
  constructor(sf,options={}){if(!sf||typeof sf.query!=='function')throw Error('GUS Apps has no Salesforce connection. Enable user-context Salesforce access for this applet.');this.sf=sf;this.schemas=new Map();this.definitions=options.definitions??require('./list-definitions');}
  savedDefinition(ref){return this.definitions.find(d=>d.objectApiName==='ADM_Epic__c'&&(d.id.slice(0,15)===ref.slice(0,15)||d.developerName.toLowerCase()===ref.toLowerCase()));}
  async listIdByName(name){
    // SOQL ListView metadata can be empty even for a visible Lightning list.
    // Fall back to the authenticated object's list-view catalog, not a sharing guess.
    try{const rows=await this.queryAll(`SELECT Id FROM ListView WHERE SobjectType = 'ADM_Epic__c' AND DeveloperName = '${name}' LIMIT 1`);if(rows[0]?.Id)return rows[0].Id;}catch{/* The REST catalog is authoritative for this API session. */}
    const catalog=[];let page;
    if(typeof this.sf.request==='function'){
      let path='/services/data/v62.0/sobjects/ADM_Epic__c/listviews';const visited=new Set();
      for(let i=0;i<20;i++){
        if(visited.has(path))throw Error('GUS list-view catalog repeated a page. No list was imported.');visited.add(path);
        page=await this.sf.request(path);catalog.push(...(page.listviews||page.listViews||[]));
        const next=page.nextRecordsUrl||page.nextPageUrl||page.nextPageToken;
        if(!next){if(page.done===false)throw Error('GUS returned an incomplete list-view catalog without a continuation.');break;}
        if(typeof next!=='string'||!/^\/services\/data\/v\d+\.\d+\/sobjects\/ADM_Epic__c\/listviews(?:\?|$)/.test(next))throw Error('GUS returned an unsupported list-view continuation. No list was imported.');
        if(i===19)throw Error('The list-view catalog exceeds the import page bound. Use the specific list ID.');path=next;
      }
    }else if(typeof this.sf.sobject==='function'){
      const object=this.sf.sobject('ADM_Epic__c');if(typeof object.listviews==='function'){page=await object.listviews();catalog.push(...(page.listviews||page.listViews||[]));if(page.done===false||page.nextRecordsUrl)throw Error('The GUS host must expose REST pagination to complete list-view lookup.');}
    }else {const saved=this.savedDefinition(name);if(saved)return saved.id;throw Error('This GUS Apps connection cannot read list-view metadata. Connect a verified list definition for this list before importing it.');}
    const wanted=name.toLowerCase();
    const exact=catalog.filter(v=>[v.developerName,v.apiName,v.name,v.fullName].some(n=>typeof n==='string'&&n.toLowerCase().replace(/^ADM_Epic__c\./i,'')===wanted));
    const normalize=value=>String(value||'').toLowerCase().replace(/[\s_-]+/g,'');
    const matching=exact.length?exact:catalog.filter(v=>normalize(v.label)===normalize(name));
    const ids=[...new Set(matching.map(v=>v.id||v.Id).filter(Boolean))];
    if(ids.length>1)throw Error(`Multiple saved epic lists match '${name}'. Copy a URL containing the list's 00B record ID to select the exact one.`);
    if(ids.length===1)return ids[0];
    let who='the current Salesforce API connection';if(typeof this.sf.identity==='function'){try{const info=await this.sf.identity();if(info.username)who=`API user ${String(info.username).slice(0,160)}${info.organization_id?' in org '+String(info.organization_id).slice(0,40):''}`;}catch{/* Optional identity is not required for lookup. */}}
    throw Error(`GUS Apps could not resolve epic list '${name}' through ${who}. Check that the applet is running as your signed-in GUS user in the same org as Lightning. This does not establish a list-sharing problem.`);
  }
  async listDescription(view){
    if(typeof this.sf.request==='function')return this.sf.request(`/services/data/v62.0/sobjects/ADM_Epic__c/listviews/${view}/describe`);
    if(typeof this.sf.sobject==='function'){
      const object=this.sf.sobject('ADM_Epic__c');if(typeof object.listview==='function')return object.listview(view).describe();
    }
    const saved=this.savedDefinition(view);
    if(saved)return {...saved,definitionSource:'verified-definition'};
    throw Error('This saved list-view has no verified definition connected to the app. Import its actual GUS definition; the filters will not be guessed.');
  }
  async resolveEpicInputs(input){
    if(typeof input!=='string'||input.length>100000)throw Error('Paste GUS epic links or a saved epic list-view URL.');
    const ids=[],sources=[],columns=[];
    const normalized=input.replace(/\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g,'$1');
    for(const item of normalized.split(/[\s,]+/).filter(Boolean)){
      let list=null;
      if(item.includes('://')){
        let u;try{u=new URL(item);}catch{throw Error('Invalid GUS link.');}
        if(u.protocol!=='https:'||!['gus.my.salesforce.com','gus.lightning.force.com'].includes(u.hostname))throw Error('Only GUS Salesforce links are supported.');
        if(/^\/lightning\/o\//.test(u.pathname)){
          if(!/^\/lightning\/o\/ADM_Epic__c\/list\/?$/.test(u.pathname))throw Error('Use a saved epic list view, not a work-item list.');
          list=u.searchParams.get('filterName');if(!list)throw Error('Select a saved epic list in GUS and copy its URL including filterName.');
        }else if(u.searchParams.has('fcf'))list=u.searchParams.get('fcf');
      }
      if(list!==null){
        if(/^(recent|recentlyviewed)$/i.test(list))throw Error('Recently Viewed is not a saved list with stable filters. Choose a saved epic list view in GUS.');
        if(!/^(?:00B[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?|[A-Za-z][A-Za-z0-9_]{0,79})$/.test(list))throw Error('Invalid saved list-view identifier.');
        let listId=list;
        if(!/^00B[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(list)){
          listId=await this.listIdByName(list);
        }
        if(!/^00B[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(listId))throw Error('GUS returned an invalid list-view ID.');
        if(sources.some(s=>s.id===listId.slice(0,15)))continue;
        const description=await this.listDescription(listId);
        if(typeof description.query!=='string'||!/^SELECT\b[\s\S]*?\bFROM\s+ADM_Epic__c\b/i.test(description.query)||description.query.includes(';'))throw Error('GUS did not return an executable epic query for this saved list.');
        let query=description.query.replace(/^SELECT\b[\s\S]*?\bFROM\s+ADM_Epic__c\b/i,'SELECT Id FROM ADM_Epic__c');
        // Inspect clauses outside SOQL string literals; words inside filters are data.
        const masked=query.replace(/'(?:\\.|[^'\\])*'/g,value=>' '.repeat(value.length));
        const limit=masked.match(/\bLIMIT\s+(\d+)(?=\s*(?:FOR\s+(?:VIEW|REFERENCE))?\s*$)/i);
        if(limit)query=query.slice(0,limit.index)+'LIMIT '+Math.min(501,Number(limit[1]))+query.slice(limit.index+limit[0].length);
        else {const suffix=masked.search(/\s+FOR\s+(?:VIEW|REFERENCE)\s*$/i);query=suffix<0?query.trim()+' LIMIT 501':query.slice(0,suffix)+' LIMIT 501'+query.slice(suffix);}
        const records=await this.queryAll(query);if(records.length>500)throw Error('This epic list contains more than 500 epics. Narrow the saved list filters to import the full list.');
        for(const row of records){const id=validId(row.Id);if(!ids.includes(id))ids.push(id);}
        sources.push({url:item,id:listId.slice(0,15),label:description.label||list,definitionSource:description.definitionSource||'live-gus',definitionVerifiedAt:description.verifiedAt||null,definitionDigest:description.digest||null});
        for(const col of description.columns||[]){const field=col.fieldNameOrPath;if(col.hidden||typeof field!=='string'||!FIELD_PATH.test(field)||field==='Id')continue;
          const key=field==='Epic_Health_Comments__c'?'months':Object.keys(EPIC_FIELDS).find(k=>EPIC_FIELDS[k]===field)||'gus:'+field;
          if(!columns.some(c=>c.key===key))columns.push({key,field,label:String(col.label||field).slice(0,120)});
        }
      }else for(const id of parseEpicLinks(item)){if(!ids.includes(id))ids.push(id);}
      if(ids.length>500)throw Error('A release supports up to 500 epics. Narrow the saved list or remove extra links.');
    }
    if(columns.length>50)throw Error('Use saved lists with up to 50 distinct visible fields.');
    return {ids,sources,columns};
  }
  async queryAll(q){let page=await this.sf.query(q);const records=[...(page.records||[])];let pages=0;
    while(page.done===false){if(!page.nextRecordsUrl)throw Error('GUS returned an incomplete page without a continuation URL.');if(++pages>100)throw Error('Too many results. Narrow the release.');
      if(typeof this.sf.queryMore==='function')page=await this.sf.queryMore(page.nextRecordsUrl);
      else if(typeof this.sf.request==='function')page=await this.sf.request(page.nextRecordsUrl);
      else throw Error('GUS Apps must expose queryMore() or request() to retrieve all work items.');
      records.push(...(page.records||[]));}
    return records;
  }
  async fields(object,candidates){
    const cacheKey=object+':'+candidates.join(',');if(this.schemas.has(cacheKey))return this.schemas.get(cacheKey);
    let schema=null;
    if(typeof this.sf.describe==='function')schema=await this.sf.describe(object);
    else if(typeof this.sf.sobject==='function')schema=await this.sf.sobject(object).describe();
    let fields;
    if(schema?.fields){
      const known=new Set(schema.fields.map(f=>f.name));
      const rels=new Set(schema.fields.filter(f=>f.relationshipName).map(f=>f.relationshipName));
      fields=candidates.filter(f=>f.includes('.')?rels.has(f.split('.')[0]):known.has(f));
      const related=await Promise.all(fields.filter(f=>f.includes('.')).map(async f=>{try{await this.sf.query(`SELECT Id, ${f} FROM ${object} LIMIT 1`);return f;}catch{return null;}}));
      fields=fields.filter(f=>!f.includes('.')||related.includes(f));
      const comment=schema.fields.find(f=>f.name==='Epic_Health_Comments__c');
      if(comment)this.commentWriteable=comment.updateable!==false;
    }else{
      // The lightweight GUS Apps Salesforce facade may expose query/create/update only.
      // Probe each known field once so inaccessible optional fields remain visible as unavailable.
      try{await this.sf.query(`SELECT Id, ${candidates.join(', ')} FROM ${object} LIMIT 1`);this.schemas.set(cacheKey,candidates);return candidates;}catch{/* Isolate inaccessible optional fields below. */}
      const checks=await Promise.all(candidates.map(async f=>{try{await this.sf.query(`SELECT Id, ${f} FROM ${object} LIMIT 1`);return f;}catch{return null;}}));
      fields=checks.filter(Boolean);
    }
    if(!fields.includes('Name'))throw Error(`Cannot read ${object}. Check GUS Apps user context and object permissions.`);
    this.schemas.set(cacheKey,fields);return fields;
  }
  async epics(ids,columns=[]){
    const extras=columns.filter(c=>typeof c.field==='string'&&FIELD_PATH.test(c.field));
    ids=ids.map(validId);const candidates=[...new Set([...Object.values(EPIC_FIELDS),...extras.map(c=>c.field)])];const fields=await this.fields('ADM_Epic__c',candidates);
    if(!fields.includes('Epic_Health_Comments__c')||!fields.includes('LastModifiedDate'))throw Error('Read access to Epic Health Comments and Last Modified Date is required.');
    const rows=[];for(let i=0;i<ids.length;i+=100){const batch=ids.slice(i,i+100);rows.push(...await this.queryAll(`SELECT Id, ${fields.join(', ')} FROM ADM_Epic__c WHERE Id IN (${batch.map(id=>`'${id}'`).join(',')})`));}
    const unavailable=Object.entries(EPIC_FIELDS).filter(([,f])=>!fields.includes(f)).map(([k])=>k);
    return {epics:rows.map(row=>{const e={id:validId(row.Id),unavailable,extra:{}};for(const [key,field] of Object.entries(EPIC_FIELDS))e[key]=fields.includes(field)?getPath(row,field):null;for(const c of extras)e.extra[c.field]=fields.includes(c.field)?getPath(row,c.field):null;e.name=e.name||e.id;e.comments=e.comments||'';return e;}),unavailable};
  }
  async epic(id){const result=await this.epics([id]);if(!result.epics.length)throw Error('Epic is not visible in this GUS org. Check the epic link, user context, and sharing.');return result.epics[0];}
  async comments(id){
    id=validId(id);const rows=await this.queryAll(`SELECT Id, Name, Epic_Health_Comments__c, LastModifiedDate FROM ADM_Epic__c WHERE Id = '${id}' LIMIT 1`);
    if(!rows.length)throw Error('Epic is not visible in this GUS session.');
    return {id,name:rows[0].Name,comments:rows[0].Epic_Health_Comments__c||'',modified:rows[0].LastModifiedDate};
  }
  async workItems(id,options={}){
    const mapping={...WORK_FIELDS,...(options.details?{description:'Description__c',details:'Details__c',modified:'LastModifiedDate',created:'CreatedDate',closedAt:'Closed_On__c'}:{})};
    id=validId(id);const fields=await this.fields('ADM_Work__c',[...Object.values(mapping),'Epic__c']);
    if(!fields.includes('Epic__c'))throw Error('Cannot read the work item Epic relationship.');
    const rows=await this.queryAll(`SELECT Id, ${fields.join(', ')} FROM ADM_Work__c WHERE Epic__c = '${id}' ORDER BY Name ASC LIMIT 2001`);
    const unavailable=Object.entries(mapping).filter(([,v])=>!fields.includes(v)).map(([k])=>k);
    const items=rows.slice(0,2000).map(row=>{const w={id:row.Id};for(const [k,f] of Object.entries(mapping))w[k]=getPath(row,f);w.title=plainText(w.title||w.number);return w;});let historyUnavailable=false,historyTruncated=false;
    if(options.details&&options.month){if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(options.month))throw Error('Choose a valid review month.');const [year,month]=options.month.split('-').map(Number),start=new Date(Date.UTC(year,month-1,1)).toISOString().replace('.000Z','Z'),end=new Date(Date.UTC(year,month,1)).toISOString().replace('.000Z','Z');
      try{const history=await this.queryAll(`SELECT ParentId, CreatedDate, Field, OldValue, NewValue FROM ADM_Work__History WHERE ParentId IN (SELECT Id FROM ADM_Work__c WHERE Epic__c = '${id}') AND Field = 'Status__c' AND CreatedDate >= ${start} AND CreatedDate < ${end} ORDER BY CreatedDate ASC LIMIT 2001`);historyTruncated=history.length>2000;const byId=new Map(items.map(w=>[w.id.slice(0,15),w]));for(const h of history.slice(0,2000)){const item=byId.get(String(h.ParentId||'').slice(0,15));if(item)(item.statusChanges||=[]).push({at:h.CreatedDate,from:String(h.OldValue??''),to:String(h.NewValue??'')});}}catch{historyUnavailable=true;}
    }
    return {items,unavailable,truncated:rows.length>2000,limit:2000,historyUnavailable,historyTruncated};
  }
  async epicStatusOptions(){
    let schema;if(typeof this.sf.describe==='function')schema=await this.sf.describe('ADM_Epic__c');else if(typeof this.sf.sobject==='function')schema=await this.sf.sobject('ADM_Epic__c').describe();
    const field=schema?.fields?.find(f=>f.name==='Health__c');if(field?.updateable===false)throw Error('Epic Status is read-only for your GUS user.');
    return field?.picklistValues?.filter(v=>v.active!==false).map(v=>({value:v.value,label:v.label||v.value}))||['Not Started','On Track','Watch','Blocked','Completed','Canceled'].map(value=>({value,label:value}));
  }
  async updateEpicStatus(id,value,modified){
    id=validId(id);const fields={Health__c:value};
    if(typeof this.sf.request==='function'){await this.sf.request({method:'PATCH',url:`/services/data/v62.0/sobjects/ADM_Epic__c/${id}`,headers:{'Content-Type':'application/json','If-Unmodified-Since':new Date(modified).toUTCString()},body:JSON.stringify(fields)});return {conditional:true};}
    const latest=await this.epic(id);if(latest.modified!==modified)throw Error('This epic changed. Refresh before saving Epic Status.');if(typeof this.sf.update!=='function')throw Error('GUS Apps does not expose Salesforce update().');const out=await this.sf.update('ADM_Epic__c',id,fields);if(!out||out.success===false||out.errors?.length)throw Error('GUS rejected Epic Status.');return {conditional:false};
  }
  async updatePathToGreen(id,text,modified){
    id=validId(id);const fields={Path_to_Green__c:text};
    if(typeof this.sf.request==='function'){await this.sf.request({method:'PATCH',url:`/services/data/v62.0/sobjects/ADM_Epic__c/${id}`,headers:{'Content-Type':'application/json','If-Unmodified-Since':new Date(modified).toUTCString()},body:JSON.stringify(fields)});return {conditional:true};}
    const latest=await this.epic(id);if(latest.modified!==modified)throw Error('This epic changed. Refresh before saving Path to Green.');if(typeof this.sf.update!=='function')throw Error('GUS Apps does not expose Salesforce update().');const out=await this.sf.update('ADM_Epic__c',id,fields);if(!out||out.success===false||out.errors?.length)throw Error('GUS rejected Path to Green.');return {conditional:false};
  }
  async updateComments(id,text,modified){
    id=validId(id);if(this.commentWriteable===false)throw Error('Epic Health Comments is read-only for your GUS user.');
    if(typeof this.sf.request==='function'){
      await this.sf.request({method:'PATCH',url:`/services/data/v62.0/sobjects/ADM_Epic__c/${id}`,headers:{'Content-Type':'application/json','If-Unmodified-Since':new Date(modified).toUTCString()},body:JSON.stringify({Epic_Health_Comments__c:text})});
      return {conditional:true};
    }
    // Facades without REST access cannot offer an atomic conditional PATCH.
    // Re-read immediately before DML and verify afterwards; surface the limitation to the UI.
    const latest=await this.comments(id);if(latest.modified!==modified)throw Error('This epic changed during sync. Preview again.');
    if(typeof this.sf.update!=='function')throw Error('GUS Apps Salesforce connection does not expose update().');
    const result=await this.sf.update('ADM_Epic__c',id,{Epic_Health_Comments__c:text});
    if(!result||result.success===false||result.errors?.length)throw Error('GUS rejected the update: '+JSON.stringify(result?.errors||[]));
    return {conditional:false};
  }
}
module.exports={Gus,validId,parseEpicLinks,safeError};
