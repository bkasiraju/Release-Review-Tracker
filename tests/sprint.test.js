'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const sprint=require('../backend/sprint'),{handleRequest}=require('../backend');
const MQ='a00B0000000w4ZhIAI';
function fakeSf(){const queries=[];return {queries,async query(q){queries.push(q);
  if(q.includes('FROM ADM_Sprint__c')&&q.includes('Start_Date__c <= TODAY')&&q.includes('End_Date__c'))return {records:[{Id:'a0lEE000002C32bYAC',Name:'2026.11a - MQ',Start_Date__c:'2000-01-01',End_Date__c:'2999-01-01'}]};
  if(q.includes('FROM ADM_Work_Commitment__c'))return {records:[
    {Work__c:'a07A',Item_Status__c:'Forecasted',Committed_Story_Points__c:3,Work__r:{Name:'W-1',Subject__c:'s',Status__c:'Closed',Story_Points__c:3,Priority__c:'P2',RecordType:{Name:'User Story'},Assignee__r:{Name:'Ann'}}},
    {Work__c:'a07B',Item_Status__c:'Forecasted',Committed_Story_Points__c:2,Work__r:{Name:'W-2',Subject__c:'t',Status__c:'In Progress',Story_Points__c:5,Priority__c:'P2',RecordType:{Name:'Bug'},Assignee__r:{Name:'Ann'}}},
    {Work__c:'a07C',Item_Status__c:'Added',Committed_Story_Points__c:1,Work__r:{Name:'W-3',Subject__c:'u',Status__c:'Closed - Done',Story_Points__c:1,Priority__c:'P3',RecordType:{Name:'User Story'},Assignee__r:null}}]};
  if(q.includes('FROM ADM_Sprint__c WHERE Id'))return {records:[{Id:'a0lEE000002C32bYAC',Name:'2026.11a - MQ',Goals__c:'g'}]};
  return {records:[]};}};}
test('rejects unknown team and malformed sprint id',async()=>{
  await assert.rejects(()=>sprint.getSprints(fakeSf(),"x' OR 1=1"),/Unknown team/);
  await assert.rejects(()=>sprint.loadSprintData(fakeSf(),MQ,"a' OR '1'='1"),/Invalid sprint id/);
});
test('groups commitments by assignee and counts spillover/added',async()=>{
  const d=await sprint.loadSprintData(fakeSf(),MQ,'a0lEE000002C32bYAC'),ann=d.members.find(m=>m.name==='Ann'),un=d.members.find(m=>m.name==='Unassigned');
  assert.equal(ann.initialPts,5);assert.equal(ann.completedPts,3);assert.equal(ann.closedCount,1);assert.equal(ann.spilloverCount,1);assert.equal(ann.ptsChangedCount,1);
  assert.equal(un.addedCount,1);assert.equal(un.closedCount,1);
});
test('handler routes sprint actions and returns errors safely',async()=>{
  const r=await handleRequest({request:{body:{action:'sprint-data',teamId:'bad',sprintId:'a0lEE000002C32bYAC'}},sf:fakeSf(),gus:{},store:{shared:true}});
  assert.equal(r.ok,false);
  const t=await handleRequest({request:{body:{action:'sprint-teams'}},sf:fakeSf(),gus:{},store:{shared:true}});
  assert.equal(t.ok,true);assert.equal(t.payload.teams.length,2);
});
