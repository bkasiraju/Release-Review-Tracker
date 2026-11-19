const t=require('node:test'),a=require('node:assert'),p=require('../backend/plan.js');
const TEAM='a00B0000000w4ZhIAI',EP='a3QB0000000EPIC01A',WS='a07B0000000WSTRY01';
const mk=(workCount)=>{const gone=[];return {gone,query:async q=>q.includes('COUNT()')?{totalSize:q.includes('Parent__c')?0:workCount(gone)}:q.includes('FROM ADM_Epic__c')?{records:[{Id:EP,Name:'E'}]}:{records:[{Id:WS,Subject__c:'WS: x'}]},delete:async(o,i)=>{gone.push(o+':'+i);}};};
t('deleteWorkstream deletes the story',async()=>{const sf=mk(()=>0);const r=await p.deleteWorkstream(sf,TEAM,{gusId:WS});a.equal(r.deleted,true);a.deepEqual(sf.gone,['ADM_Work__c:'+WS]);});
t('deleteEpic removes its workstream stories then the epic',async()=>{const sf=mk(g=>g.length?0:1);const r=await p.deleteEpic(sf,TEAM,{gusId:EP,workstreamIds:[WS]});a.equal(r.workstreamsDeleted,1);a.deepEqual(sf.gone,['ADM_Work__c:'+WS,'ADM_Epic__c:'+EP]);});
t('deleteEpic refuses while other work items remain',async()=>{const sf=mk(()=>3);await a.rejects(p.deleteEpic(sf,TEAM,{gusId:EP}),/3 work items/);a.deepEqual(sf.gone,[]);});
