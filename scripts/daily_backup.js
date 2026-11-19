#!/usr/bin/env node
'use strict';
// Daily backup of the GUS Apps shared backend (plans, preferences, releases, epics) into a PRIVATE git repo.
// Never point BACKUP_DIR at this (public) repository.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {ContentStore,PREFIX}=require('../backend/store');
const sha=t=>createHash('sha256').update(t).digest('hex');
const git=(dir,...a)=>execFileSync('git',['-C',dir,...a],{encoding:'utf8',timeout:120000}).trim();
async function main(){
  const dir=process.env.BACKUP_DIR||path.join(os.homedir(),'Desktop','AI - TPM','Release-Review-Tracker-backups');
  if(!fs.existsSync(path.join(dir,'.git')))throw Error('Backup repo not found at '+dir);
  const remote=git(dir,'remote','get-url','origin'),vis=JSON.parse(execFileSync('gh',['repo','view',remote,'--json','isPrivate'],{encoding:'utf8',timeout:60000}));
  if(!vis.isPrivate)throw Error('Refusing to back up: the backup repository is not private.');
  const org=JSON.parse(execFileSync('sf',['org','display','--target-org',process.env.GUS_ORG||'GusProduction','--json'],{encoding:'utf8',timeout:45000,env:{...process.env,SF_DISABLE_LOG_FILE:'true'}}));
  if(org.status!==0||!org.result?.accessToken||!/^https:\/\/[A-Za-z0-9.-]+\.salesforce\.com\/?$/.test(org.result.instanceUrl||''))throw Error('Authenticated GUS Salesforce session is required (run: sf org login web).');
  const token=org.result.accessToken,host=org.result.instanceUrl.replace(/\/$/,'');
  const request=async route=>{const r=await fetch(host+route,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('Salesforce request failed (HTTP '+r.status+').');return r.json();};
  async function journal(){let page=await request('/services/data/v60.0/query?q='+encodeURIComponent("SELECT Id, Title, Description, CreatedDate FROM ContentVersion WHERE Title LIKE 'CFSMonthlyReview%' ORDER BY CreatedDate DESC, Id DESC")),rows=[...page.records];
    while(page.done===false){if(!page.nextRecordsUrl||rows.length>200000)throw Error('Pagination could not be completed safely.');page=await request(page.nextRecordsUrl);rows.push(...page.records);}
    return rows.filter(r=>r.Title.startsWith(PREFIX)).map(({Id,Title,Description,CreatedDate})=>({Id,Title,Description,CreatedDate}));}
  let rows;for(let i=0;i<3;i++){const a=await journal(),b=await journal();if(sha(JSON.stringify(a))===sha(JSON.stringify(b))){rows=b;break;}}
  if(!rows)throw Error('Backend kept changing; no snapshot written.');if(!rows.length)throw Error('Backend returned no records; refusing to write an empty snapshot.');
  const docs=new ContentStore({}).decode(rows),out={};for(const t of [...docs.keys()].sort())out[t]=docs.get(t);
  const day=new Date().toLocaleDateString('en-CA'),file=path.join(dir,'snapshots',day.slice(0,4),day+'.json');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,JSON.stringify({format:'cfs-daily-backup/v1',date:day,records:rows.length,documents:Object.keys(out).length,docs:out},null,1)+'\n');
  git(dir,'pull','-q','--rebase','--autostash','origin','main');
  git(dir,'add','-A');
  if(!git(dir,'status','--porcelain')){console.log('No change since the last snapshot ('+day+').');return;}
  git(dir,'commit','-qm','Backup '+day+' ('+Object.keys(out).length+' documents)');git(dir,'push','-q','origin','main');
  console.log('Backed up '+Object.keys(out).length+' documents to '+path.relative(os.homedir(),file));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
