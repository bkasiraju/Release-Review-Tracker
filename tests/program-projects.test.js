const t=require('node:test'),a=require('node:assert'),p=require('../backend/plan.js');
t('programProjects', async()=>{const sf={query:async q=>q.includes('FROM PPM_Program__c')?{records:[{Id:'a1FEE00000PROG001A',Name:'Caching Services - 268'}]}:{records:[{Id:'a1PEE00000PROJ001A',Name:'P1',V2MOM_Method__c:'M1'}]}};
 const r=await p.programProjects(sf,'a00B0000000w4ZhIAI','caching services - 268');a.equal(r.projects.length,1);a.equal(r.program.name,'Caching Services - 268');});
