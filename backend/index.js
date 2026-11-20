'use strict';
const {Gus,safeError,validId}=require('./gus');const {ContentStore}=require('./store');const {Service}=require('./service');const sprint=require('./sprint');const hub=require('./hub');const planner=require('./plan');
const pref=require('./pref');const post=require('./post');
// Anyone signed in to GUS may review and save plans and create records; GUS itself still enforces its own permissions.
async function canCommit(){return true;}
function connection(ctx){
  const roots=[['ctx',ctx],['request',ctx.request],['invocation',ctx.invocation],['runtime',ctx.runtime],['context',ctx.context],['applet',ctx.applet],['auth',ctx.auth],['user',ctx.user],['salesforce',ctx.salesforce],['request.context',ctx.request?.context]].filter(([,r])=>r&&typeof r==='object');
  // Prefer delegated clients across every known host root before the generic facade.
  // Request bodies and headers are deliberately never inspected for connections.
  const keys=['userConnection','viewerConnection','userSf','viewerSf','sfAsUser','sfUser','connectionAsUser','orgAsUser','salesforceUser','salesforceConnection','connection','conn','jsforce','sf'];
  for(const key of keys)for(const [path,root] of roots){const client=root[key];if(client&&typeof client.query==='function')return {sf:client,source:path==='ctx'?key:path+'.'+key};}
  if(typeof ctx.query==='function')return {sf:ctx,source:'ctx'};
  if(typeof ctx.salesforce?.query==='function')return {sf:ctx.salesforce,source:'salesforce'};
  return {sf:null,source:'none'};
}
async function handleRequest(ctx){
  try{
    const req=ctx.request||ctx;let b=req.body||{};if(typeof b==='string')b=JSON.parse(b);
    if(!b||typeof b!=='object'||Array.isArray(b))throw Error('Invalid request.');
    const {sf,source}=connection(ctx),gus=ctx.gus||new Gus(sf),store=ctx.store||new ContentStore(sf,{shared:true}),service=new Service(store,gus,{shared:store.shared===true,readOnly:ctx.demo===true,googleSheets:ctx.googleSheets||ctx.google?.sheets});
    const action=b.action;
    if(ctx.demo&&!['connection','state','work-items','preview','executive','executive-blurb','executive-plan','list-catalog'].includes(action))throw Error('Sample preview is read-only. Open the GUS Apps deployment to save changes.');
    let payload;
    switch(action){
      case 'connection':{
        if(!ctx.gus)await sf.query('SELECT Id FROM ADM_Epic__c LIMIT 1');
        let who={};if(typeof sf?.identity==='function'){try{who=await sf.identity();}catch{/* Identity permission is optional. */}}
        payload={connected:true,source,username:who.username||null,organizationId:who.organization_id||null,storage:store.shared?'Shared GUS ContentVersion':'GUS ContentVersion',sharedBackend:store.shared===true,demo:!!ctx.demo,testMode:!!ctx.testMode,conditionalWrites:typeof sf?.request==='function',methods:Object.keys(sf||{}).filter(k=>typeof sf[k]==='function'),version:'5.0.0-GA',canCommit:await canCommit(sf,ctx),userIdKnown:!!(sf&&sf.userId)};break;
      }
      case 'state':payload=await service.state();break;
      case 'list-catalog':payload={lists:(gus.definitions||require('./list-definitions')).map(d=>({name:d.developerName,label:d.label,url:'https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName='+encodeURIComponent(d.developerName),verifiedAt:d.verifiedAt}))};break;
      case 'inspect-list':payload=await gus.resolveEpicInputs(b.links);break;
      case 'save-release':payload=await service.saveRelease(b);break;
      case 'delete-release':payload=await service.deleteRelease(b);break;
      case 'save-v2mom-mapping':payload=await service.saveMapping(b);break;
      case 'save-v2mom-reference':payload=await service.saveReference(b);break;
      case 'save-path-to-green':payload=await service.savePath(b);break;
      case 'epic-status-options':payload={options:await gus.epicStatusOptions()};break;
      case 'save-epic-status':payload=await service.saveEpicStatus(b);break;
      case 'save-review-status':payload=await service.saveReviewStatus(b);break;
      case 'save-settings':payload=await service.saveSettings(b);break;
      case 'fetch':payload=await service.fetch(b.releaseId,{cursor:b.cursor,fetchRevision:b.fetchRevision,automatic:b.automatic===true});break;
      case 'finish-fetch':payload=await service.finishFetch(b);break;
      case 'save-draft':payload=await service.saveDraft(b);break;
      case 'publish-month':payload=await service.publishMonth(b);break;
      case 'set-year':payload=await service.setYear(b);break;
      case 'monthly-summary':payload=await service.monthlySummary(b);break;
      case 'executive-cache-save':payload=await require('./summary-cache').save(service,b);break;
      case 'measure-summary-cache':payload=await require('./summary-cache').measure(service,b);break;
      case 'executive-plan':payload=await service.executivePlan(b);break;
      case 'executive-blurb':payload=await service.executiveBlurb(b);break;
      case 'executive':payload=await service.executive(b);break;
      case 'slack-nudge':case 'slack-nudge-plan':{const {nudgeIds,prepareNudge,nudgePlan}=require('./nudge'),ids=nudgeIds(b),saved={};for(let i=0;i<ids.length;i+=100){const chunk=ids.slice(i,i+100);if(typeof store.getMany==='function'){for(const [id,e] of await store.getMany('epic',chunk))if(e)saved[id]=e;}else for(const id of chunk){const e=await store.get('epic',id);if(e)saved[id]=e;}}payload=action==='slack-nudge-plan'?await nudgePlan(gus,b,saved):await prepareNudge(gus,ctx.slack,b,saved);break;}
      case 'sprint-teams':payload=await sprint.getTeams(sf);break;
      case 'sprint-initial':payload=await sprint.getInitial(sf,b.teamId);break;
      case 'sprint-sprints':payload=await sprint.getSprints(sf,b.teamId);break;
      case 'sprint-data':payload=await sprint.loadSprintData(sf,b.teamId,b.sprintId);break;
      case 'sprint-next':payload=await sprint.getNextSprint(sf,b.teamId,b.sprintId);break;
      case 'sprint-move-next':payload=await sprint.moveToNextSprint(sf,b.teamId,b.sprintId,b.ids);break;
      case 'sprint-history':payload=await sprint.getHistory(sf,b.teamId);break;
      case 'hub-people':payload=await hub.getPeople(sf,ctx.slack,String(b.group||''));break;
      case 'hub-tests':payload=await hub.getTests(sf,b.teamId);break;
      case 'post-users':payload=await post.searchUsers(sf,b.q);break;
      case 'post-slack':payload=await post.slackTarget(sf,ctx.slack,b.userId);{const sc=require('./slack-channels'),L=await sc.list(sf,store);payload.channels=L.teams.filter(t=>t.channel).map(t=>({teamId:t.teamId,team:t.name,name:t.channel.name||t.channel.id}));payload.canSend=!!payload.slackUserId&&payload.channels.length>0&&!!ctx.slack&&(typeof ctx.slack.postMessage==='function'||typeof ctx.slack.apiCall==='function');}break;
      case 'slack-channels':payload=await require('./slack-channels').list(sf,store);break;
      case 'slack-channels-save':payload=await require('./slack-channels').save(sf,store,ctx.slack,b);break;
      case 'post-slack-send':payload=await post.sendSlack(sf,ctx.slack,store,b);break;
      case 'post-chatter':payload=await post.postChatter(sf,b);break;
      case 'hub-teams':payload=await hub.getTeams(sf);break;
      case 'sal-list':payload=await require('./actions').list(store,b.teamId);break;
      case 'sal-save':payload=await require('./actions').save(store,sf,b.teamId,b);break;
      case 'sal-resolve':payload=await require('./actions').resolve(store,b.teamId,b);break;
      case 'sal-edit':payload=await require('./actions').update(store,sf,b.teamId,b);break;
      case 'sal-eta':payload=await require('./actions').setEta(store,b.teamId,b);break;
      case 'sal-delete':payload=await require('./actions').remove(store,b.teamId,b);break;
      case 'hub-members':payload=await hub.getMembers(sf,b.teamId);break;
      case 'hub-home':payload=await hub.getHome(sf,b.teamId);break;
      case 'hub-bugs':payload=await hub.getBugs(sf,b.teamId,b);break;
      case 'hub-bug-trend':payload=await hub.getBugTrend(sf,b.teamId);break;
      case 'hub-bug-trend-items':payload=await hub.getBugTrendItems(sf,b.teamId,b);break;
      case 'hub-sla':payload=await hub.getSla(sf,b.teamId);break;
      case 'hub-pd-alerts':payload=await require('./pagerduty').getAlerts(sf,ctx.slack,b.teamId,b.fresh===true);break;
      case 'hub-pd-thread':payload=await require('./pagerduty').getThread(sf,ctx.slack,b.teamId,b.ts);break;
      case 'hub-pd-summary':payload=await require('./pagerduty').summarize(sf,ctx.slack,b.teamId,b.ts,b.fresh===true);break;
      case 'hub-champion':payload=await hub.getChampion(store,b.teamId);break;
      case 'hub-champion-save':payload=await hub.saveChampion(store,b.teamId,b.champion,b.revision);break;
      case 'pref-get':payload=await pref.getPref(sf,store);break;
      case 'pref-set':payload=await pref.setPref(sf,store,b.defaultTeam||null);break;
      case 'plan-get':payload=await planner.getPlan(store,b.teamId);break;
      case 'plan-save':payload=await planner.savePlan(store,b.teamId,b.plan,b.revision);break;
      case 'plan-refs':payload=await planner.getRefs(sf,b.teamId);break;
      case 'plan-commit':payload=await planner.commitPlan(sf,store,b.teamId,b.confirm===true,b.includeBtl===true,b.confirm===true?b.acknowledged===true:undefined);break;
      case 'plan-v2mom-parse':{const v2=require('./v2mom-import'),sheets=b.sheets&&typeof b.sheets==='object'?b.sheets:await v2.readSheetUrl(b.url,b.tabs,ctx.googleSheets||ctx.google?.sheets);const parsed=v2.parseSheets(sheets,{owners:b.owners});const prog=await planner.resolveProgram(sf,b.teamId,'').catch(()=>null);payload={...parsed,teamProgram:prog};break;}
      case 'plan-v2mom-import':payload=await planner.importV2mom(sf,store,b.teamId,b);break;
      case 'plan-program-projects':payload=await planner.programProjects(sf,b.teamId,b.programName);break;
      case 'plan-create-project':payload=await planner.createProject(sf,b.teamId,b.project);break;
      case 'plan-sync-epics':payload=await planner.syncEpics(sf,b.teamId,b.epics);break;
      case 'v2mom-measures':payload=await require('./v2mom-measures').getMeasures(ctx.googleSheets||ctx.google?.sheets,!!b.refresh);break;
      case 'hrp-measures':payload=await require('./hrp').getMeasures(sf,!!b.refresh);break;
      case 'plan-smart-goal-gen':payload=await planner.generateSmartGoal(sf,b.teamId,b.epic);break;
      case 'plan-smart-goal-save':payload=await planner.saveSmartGoal(sf,b.teamId,b.gusId,b.goal);break;
      case 'plan-refresh-epics':payload=await planner.refreshEpics(sf,b.teamId,b.ids);break;
      case 'plan-gus-epics':payload=await planner.listEpics(sf,b.teamId);break;
      case 'plan-find-epics':payload=await planner.findEpics(sf,b.teamId,b.query);break;
      case 'plan-create-workstream':payload=await planner.createWorkstream(sf,b.teamId,b.workstream);break;
      case 'plan-create-epic':payload=await planner.createEpic(sf,b.teamId,b.epic);break;
      case 'plan-epic-workstreams':payload=await planner.epicWorkstreams(sf,b.teamId,b.ids);break;
      case 'plan-epic-leads':payload=await planner.epicLeads(sf,b.teamId,b.ids);break;
      case 'plan-delete-epic':payload=await planner.deleteEpic(sf,b.teamId,b.epic);break;
      case 'plan-delete-workstream':payload=await planner.deleteWorkstream(sf,b.teamId,b.workstream);break;
      case 'plan-delete-project':payload=await planner.deleteProject(sf,b.teamId,b.project,store);break;
      case 'hub-tds':payload=await hub.getTds(sf,b.teamId);break;
      case 'hub-picklists':payload=await hub.getPicklists(sf);break;
      case 'hub-rotation':payload=await hub.getRotation(store,b.teamId);break;
      case 'hub-rotation-save':payload=await hub.saveRotation(store,b.teamId,b.rota,b.revision);break;
      case 'gus-update':payload=await hub.updateGus(sf,b.updates);break;
      case 'work-items':payload=await gus.workItems(validId(b.epicId));break;
      case 'preview':payload=await service.preview(b.releaseId,validId(b.epicId));break;
      case 'sync':if(!Array.isArray(b.approved)||!b.approved.length||b.approved.length>1)throw Error('Review the preview before syncing.');payload=await service.sync(b.releaseId,b.approved);break;
      default:throw Error('Unknown dashboard action.');
    }
    return {ok:true,payload};
  }catch(e){return {ok:false,error:safeError(e)};}
}
module.exports={handleRequest,executionContext:'USER',handlerExecutionContext:'USER'};
