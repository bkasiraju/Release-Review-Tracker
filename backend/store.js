'use strict';
const {randomUUID}=require('crypto');const {gzipSync,gunzipSync}=require('zlib');
const {organization,shareVersion,success}=require('./sharing');
const {validateDoc}=require('./validate');
const PREFIX='CFSMonthlyReview_v1_';
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function changes(before,after){
  const result=[];
  for(const key of new Set([...Object.keys(before||{}),...Object.keys(after)])){
    if(['revision','updatedAt','_changes'].includes(key))continue;
    if(key==='drafts'){
      for(const month of new Set([...Object.keys(before?.drafts||{}),...Object.keys(after.drafts||{})])){
        const a=before?.drafts?.[month],b=after.drafts?.[month];if(!equal(a,b))result.push({path:['drafts',month],before:a,after:b,remove:b===undefined});
      }
    }else if(!equal(before?.[key],after[key]))result.push({path:[key],before:before?.[key],after:after[key],remove:after[key]===undefined});
  }
  return result;
}
function applyChanges(doc,event){
  doc=doc||{drafts:{}};
  for(const op of event._changes){
    if(!Array.isArray(op.path)||op.path.length<1||op.path.length>2||op.path.some(k=>['__proto__','constructor','prototype'].includes(k)))throw Error('Invalid saved dashboard change.');
    const [root,key]=op.path;const target=key?(doc[root]||=(Object.create(null))):doc,field=key||root,actual=target[field];
    const protectedField=root==='v2momConfirmed'||root==='v2mom'||root==='reviewStatus'||root==='drafts'||['name','year','yearMapping','epicIds','months','columns','columnMode','visibleMonths','hiddenMonths'].includes(root);
    if(protectedField&&!equal(actual,op.before)&&!equal(actual,op.after)){
      // Clearing a synced revision must never clear a newer draft saved concurrently.
      if(op.remove)continue;
      (doc._storageConflicts||=[]).push({path:op.path.join('.'),previous:actual,incoming:op.after,revision:event.revision});
    }
    // GUS Apps' isolated runtime may omit structuredClone. Journal values are JSON.
    if(op.remove)delete target[field];else target[field]=JSON.parse(JSON.stringify(op.after));
  }
  doc.revision=event.revision;doc.updatedAt=event.updatedAt;return doc;
}
class ContentStore{
  constructor(sf,options={}){this.sf=sf;this.shared=options.shared===true;}
  title(type,id){if(!['release','epic','settings'].includes(type)||!/^[a-zA-Z0-9-]{1,60}$/.test(id))throw Error('Invalid saved record key.');return PREFIX+type+'_'+id;}
  async query(q){let page=await this.sf.query(q);const rows=[...(page.records||[])];let n=0;
    while(page.done===false){if(++n>100)throw Error('Saved dashboard history is too large to load.');if(!page.nextRecordsUrl)throw Error('Incomplete dashboard storage response.');
      if(typeof this.sf.queryMore==='function')page=await this.sf.queryMore(page.nextRecordsUrl);else if(typeof this.sf.request==='function')page=await this.sf.request(page.nextRecordsUrl);else throw Error('GUS Apps must expose queryMore() to read the complete saved history.');rows.push(...(page.records||[]));}return rows;
  }
  decode(rows){
    const sets=new Map();const commits=new Map();let rank=0;
    for(const row of rows){rank++;const commit=String(row.Description||'').match(/^cfsc1:([a-f0-9-]+)$/);if(commit){commits.set(row.Title+'|'+commit[1],rank);continue;}const m=String(row.Description||'').match(/^cfs1:([a-f0-9-]+):(\d+):(\d+):(.+)$/s);if(!m)continue;
      const key=row.Title+'|'+m[1];if(!sets.has(key))sets.set(key,{title:row.Title,parts:[],total:Number(m[3])});const set=sets.get(key);set.parts[Number(m[2])]=m[4];}
    const docs=new Map();
    // Replay immutable changes oldest first. Independent month edits commute.
    // Competing edits retain both versions and are surfaced before syncing.
    for(const [key,set] of [...sets.entries()].sort((a,b)=>(commits.get(b[0])||0)-(commits.get(a[0])||0))){
      if(!commits.has(key))continue;
      if(set.total<1||set.total>1000||Array.from({length:set.total},(_,i)=>set.parts[i]).some(p=>!p))throw Error('Latest saved dashboard record is incomplete. Retry before making changes.');
      try{const event=JSON.parse(gunzipSync(Buffer.from(set.parts.join(''),'base64'),{maxOutputLength:5_000_000}).toString('utf8'));docs.set(set.title,event._changes?applyChanges(docs.get(set.title),event):event);}catch{throw Error('Saved dashboard record cannot be decoded. No changes were made.');}
    }
    for(const doc of docs.values())validateDoc(doc);
    return docs;
  }
  async get(type,id){const title=this.title(type,id);const rows=await this.query(`SELECT Id, Title, Description, CreatedDate FROM ContentVersion WHERE Title = '${title}' ORDER BY CreatedDate DESC, Id DESC LIMIT 10001`);if(rows.length>10000)throw Error('Saved history needs archive maintenance before it can be loaded safely. No revisions were discarded.');return this.decode(rows).get(title)||null;}
  async getMany(type,ids){
    if(!Array.isArray(ids)||ids.length>100)throw Error('Read up to 100 saved records at a time.');if(!ids.length)return new Map();
    const titles=ids.map(id=>this.title(type,id)),rows=await this.query(`SELECT Id, Title, Description, CreatedDate FROM ContentVersion WHERE Title IN (${titles.map(t=>"'"+t+"'").join(',')}) ORDER BY CreatedDate DESC, Id DESC LIMIT 10001`);
    if(rows.length>10000)throw Error('Saved history needs archive maintenance. No records were truncated.');const docs=this.decode(rows);return new Map(ids.map((id,i)=>[id,docs.get(titles[i])||null]));
  }
  async list(type){
    const prefix=this.title(type,'x').slice(0,-1);
    // Aggregate queries cannot use queryMore. Stay within one aggregate batch and
    // refuse the boundary rather than silently missing saved titles.
    let page;try{page=await this.sf.query(`SELECT Title FROM ContentVersion WHERE Title LIKE '${prefix.replace(/_/g,'\\_')}%' GROUP BY Title LIMIT 2000`);}catch(error){if(/aggregate|EXCEEDED_ID_LIMIT/i.test(error.message||''))throw Error('Saved-record catalog needs archive maintenance; it exceeds the 2000-record aggregate bound.');throw error;}
    const titles=[...new Set((page.records||[]).map(r=>r.Title))];if(page.done===false||titles.length>=2000)throw Error('Saved-record catalog reached the 2000-record bound. Archive completed releases before loading this workspace.');
    const result=[];
    for(let i=0;i<titles.length;i+=4){const docs=await Promise.all(titles.slice(i,i+4).map(title=>this.get(type,title.slice(prefix.length))));result.push(...docs.filter(Boolean));}
    return result;
  }
  async createVersion(values){
    const result=success(await this.sf.create('ContentVersion',values),'Could not save dashboard state to GUS Apps. Check ContentVersion create/read access.');
    if(this.shared){this.orgPromise||=organization(this.sf);await shareVersion(this.sf,result.id||result.Id,await this.orgPromise);}
    return result;
  }
  async put(type,id,value,expected){
    const title=this.title(type,id),current=await this.get(type,id);
    if(expected!==undefined&&(current?.revision??null)!==expected)throw Error('This record changed. Reload and try again.');
    const revision=randomUUID();const doc={revision,updatedAt:new Date().toISOString(),_changes:changes(current,value)};
    const data=JSON.stringify(doc),encoded=gzipSync(Buffer.from(data)).toString('base64'),parts=encoded.match(/.{1,850}/g)||[];
    if(parts.length>500)throw Error('Saved record is too large. Split this release into smaller lists.');
    for(let i=0;i<parts.length;i+=4){
      const written=await Promise.allSettled(parts.slice(i,i+4).map((part,j)=>this.createVersion({Title:title,PathOnClient:`${title}-${i+j}.txt`,VersionData:Buffer.from(part).toString('base64'),Description:`cfs1:${revision}:${i+j}:${parts.length}:${part}`})));
      const failed=written.find(r=>r.status==='rejected');if(failed)throw failed.reason;
    }
    // Activate only after every part AND the commit file are shared. Failed sharing
    // leaves an ignored pending marker, never a private committed owner-only update.
    const committed=await this.createVersion({Title:title,PathOnClient:`${title}-commit.txt`,VersionData:Buffer.from(revision).toString('base64'),Description:this.shared?`cfs-pending:${revision}`:`cfsc1:${revision}`});
    if(this.shared)success(await this.sf.update('ContentVersion',committed.id||committed.Id,{Description:`cfsc1:${revision}`}), 'The shared dashboard update could not be committed. Retry after reloading.');
    const check=await this.get(type,id);if(check?.revision!==revision)throw Error('Saved dashboard state could not be verified. Reload before retrying.');return check;
  }
}
module.exports={ContentStore,PREFIX};
