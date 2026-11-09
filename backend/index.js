'use strict';
const {Gus,safeError,validId}=require('./gus');const {ContentStore}=require('./store');const {Service}=require('./service');
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
    const {sf,source}=connection(ctx),gus=ctx.gus||new Gus(sf),store=ctx.store||new ContentStore(sf,{shared:true}),service=new Service(store,gus,{shared:store.shared===true});
    const action=b.action;
    if(ctx.demo&&!['connection','state','work-items','preview','executive','executive-blurb','executive-plan','list-catalog'].includes(action))throw Error('Sample preview is read-only. Open the GUS Apps deployment to save changes.');
    let payload;
    switch(action){
      case 'connection':{
        if(!ctx.gus)await sf.query('SELECT Id FROM ADM_Epic__c LIMIT 1');
        let who={};if(typeof sf?.identity==='function'){try{who=await sf.identity();}catch{/* Identity permission is optional. */}}
        payload={connected:true,source,username:who.username||null,organizationId:who.organization_id||null,storage:store.shared?'Shared GUS ContentVersion':'GUS ContentVersion',sharedBackend:store.shared===true,demo:!!ctx.demo,testMode:!!ctx.testMode,conditionalWrites:typeof sf?.request==='function',methods:Object.keys(sf||{}).filter(k=>typeof sf[k]==='function'),version:'2.0.0-GA'};break;
      }
      case 'state':payload=await service.state();break;
      case 'list-catalog':payload={lists:(gus.definitions||require('./list-definitions')).map(d=>({name:d.developerName,label:d.label,url:'https://gus.lightning.force.com/lightning/o/ADM_Epic__c/list?filterName='+encodeURIComponent(d.developerName),verifiedAt:d.verifiedAt}))};break;
      case 'inspect-list':payload=await gus.resolveEpicInputs(b.links);break;
      case 'save-release':payload=await service.saveRelease(b);break;
      case 'delete-release':payload=await service.deleteRelease(b);break;
      case 'save-settings':payload=await service.saveSettings(b);break;
      case 'fetch':payload=await service.fetch(b.releaseId,{cursor:b.cursor,fetchRevision:b.fetchRevision,automatic:b.automatic===true});break;
      case 'finish-fetch':payload=await service.finishFetch(b);break;
      case 'save-draft':payload=await service.saveDraft(b);break;
      case 'publish-month':payload=await service.publishMonth(b);break;
      case 'set-year':payload=await service.setYear(b);break;
      case 'monthly-summary':payload=await service.monthlySummary(b);break;
      case 'executive-plan':payload=await service.executivePlan(b);break;
      case 'executive-blurb':payload=await service.executiveBlurb(b);break;
      case 'executive':payload=await service.executive(b);break;
      case 'slack-nudge':payload=await require('./nudge').prepareNudge(gus,ctx.slack,b,(await store.get('epic',validId(b.epicId)))||{});break;
      case 'work-items':payload=await gus.workItems(validId(b.epicId));break;
      case 'preview':payload=await service.preview(b.releaseId,validId(b.epicId));break;
      case 'sync':if(!Array.isArray(b.approved)||!b.approved.length||b.approved.length>1)throw Error('Review the preview before syncing.');payload=await service.sync(b.releaseId,b.approved);break;
      default:throw Error('Unknown dashboard action.');
    }
    return {ok:true,payload};
  }catch(e){return {ok:false,error:safeError(e)};}
}
module.exports={handleRequest,executionContext:'USER',handlerExecutionContext:'USER'};
