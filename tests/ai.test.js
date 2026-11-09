const {test}=require('node:test'),assert=require('node:assert/strict'),AI=require('../public/ai');
test('AppletAI SDK is primary and returns validated model prose with no direct gateway or credentials',async()=>{let call;global.AppletAI={isAvailable:()=>true,complete:async(...args)=>{call=args;return {text:'The team completed regional validation.'};}};try{const out=await AI.complete({blurb:'Source draft',mode:'source',ai:{message:'Grounded prompt',sourceText:'Completed regional validation.'}});assert.equal(call[0],'release-summary');assert.ok(call[1].signal);assert.equal(out.mode,'sdk');assert.equal(out.ai,undefined);assert.equal(out.blurb,'The team completed regional validation.');}finally{delete global.AppletAI;}});
test('SDK failure is labeled and model output rejects invented metrics, first person and work inventories',async()=>{assert.equal(AI.valid('We completed delivery.','Completed delivery.'),false);assert.equal(AI.valid('Delivered 99 launches.','Delivered rollout.'),false);assert.equal(AI.valid('Closed 5 work items.','Closed 5 work items.'),false);global.AppletAI={isAvailable:()=>true,complete:async()=>{throw Error('SDK unavailable');}};try{const out=await AI.complete({blurb:'Safe source draft',mode:'source',ai:{message:'Prompt',sourceText:'Source'}});assert.equal(out.blurb,'Safe source draft');assert.match(out.aiNotice,/source-based draft/);}finally{delete global.AppletAI;}});

test('SDK and backend concise formatting agree, keep complete sentences and preserve timing',()=>{const {conciseParagraph}=require('../backend/executive');const text='Deployment validation is ready for rollout. '+('Detailed technical evidence and implementation configuration '.repeat(8))+'remain under review. The next step is scheduled validation.';const note='Status as of 2026-11-02; review-month timing unverified.';assert.equal(AI.finish(text,note),conciseParagraph(text,{note}));const out=AI.finish(text,note);assert.ok(out.length<=280);assert.ok(out.split(/\s+/).length<=45);assert.ok(out.endsWith(note));assert.ok(!out.includes('…'));const conditional='The team plans delivery only if '+('partner approval and validation '.repeat(15))+'succeed.';assert.ok(!AI.finish(conditional,note).startsWith('The team plans delivery'));});
test('an SDK that ignores abort cannot leave summary generation waiting indefinitely',{timeout:1000},async()=>{
 const vm=require('node:vm'),fs=require('node:fs');let signal;const context={module:{exports:{}},AbortController,setTimeout:fn=>{queueMicrotask(fn);return 1;},clearTimeout:()=>{},AppletAI:{isAvailable:()=>true,complete:async(_,options)=>{signal=options.signal;return new Promise(()=>{});}}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/ai'),'utf8'),context);const out=await context.module.exports.complete({blurb:'Safe source preview',mode:'source',ai:{message:'Prompt',sourceText:'Evidence'}});assert.equal(signal.aborted,true);assert.equal(out.mode,'source');assert.equal(out.blurb,'Safe source preview');assert.match(out.aiNotice,/could not finish/);
});

test('monthly SDK draft cannot omit the matched sprint deliverable after shortening',async()=>{
 global.AppletAI={isAvailable:()=>true,complete:async()=>({text:'The team completed regional validation.'})};try{const result=await AI.complete({blurb:'Batch scenario skills are Ready for Review.',mode:'source',ai:{message:'Prompt',sourceText:'Completed regional validation. Batch scenario skills are Ready for Review.',requiredEvidence:['scenario','skill']}});assert.equal(result.mode,'source');assert.match(result.blurb,/scenario skills/);}finally{delete global.AppletAI;}
});

test('monthly-v2 accepts a concise executive abstraction with evidence references and keeps prior context separate',async()=>{
 const payload={format:'monthly-v2',blurb:'Source fallback',mode:'source',ai:{format:'monthly-v2',message:'Prompt',sourceText:'Batch scenario skills Ready for Review. October design completed.',requiredEvidenceKeys:['delivery-0'],requirePrevious:true}};
 global.AppletAI={isAvailable:()=>true,complete:async()=>({text:JSON.stringify({currentUpdate:'Scenario automation is ready for engineering review.',previousUpdate:'October design was completed.',usedEvidenceKeys:['delivery-0']})})};try{const out=await AI.complete(payload);assert.equal(out.mode,'sdk');assert.equal(out.currentUpdate,'Scenario automation is ready for engineering review.');assert.match(out.blurb,/\n\nPrevious months: October/);assert.ok(!/snapshot|team reports/i.test(out.blurb));}finally{delete global.AppletAI;}
});
test('monthly-v2 rejects missing historical context, forged evidence keys and invented metrics',()=>{
 const ai={sourceText:'Scenario skills Ready for Review. October design completed.',requiredEvidenceKeys:['delivery-0'],requirePrevious:true};const good={currentUpdate:'Scenario skills are ready for review.',previousUpdate:'October design was completed.',usedEvidenceKeys:['delivery-0']};assert.ok(AI.monthlyResult(JSON.stringify(good),ai));for(const patch of [{previousUpdate:''},{usedEvidenceKeys:['forged']},{currentUpdate:'Delivered 99 capabilities.'}])assert.equal(AI.monthlyResult(JSON.stringify({...good,...patch}),ai),null);
});

test('method consolidation includes every epic summary with dates and keeps measure/team scopes separate',()=>{
 const rows=[{epicId:'one',epicName:'Canary',measure:'Reliability',team:'VC',blurb:'Canary validation completed.',reportedMonths:['2026-10']},{epicId:'two',epicName:'Rollout',measure:'Reliability',team:'VC',blurb:'Regional rollout is awaiting approval.',reportedMonths:['2026-11'],hasUndated:true}];
 const out=AI.methodPayload(rows,'2026-11'),evidence=JSON.parse(out.ai.message.split(' Epic summaries: ')[1]);assert.equal(evidence.length,2);assert.deepEqual(evidence[0].reportedMonths,['2026-10']);assert.match(out.ai.sourceText,/awaiting approval/);assert.match(out.ai.message,/never present older accomplishments as new/);assert.throws(()=>AI.methodPayload([...rows,{...rows[0],team:'MQ'}],'2026-11'));assert.throws(()=>AI.methodPayload([{...rows[0],blurb:'x'.repeat(40001)}],'2026-11'),/too much summary/);
});
test('method consolidation uses native SDK and rejects fabricated metrics',async()=>{
 const rows=[{epicId:'one',epicName:'Canary',measure:'Reliability',team:'VC',blurb:'Canary validation completed. Rollout is pending.'}];
 global.AppletAI={isAvailable:()=>true,complete:async()=>({text:'Canary validation is complete; rollout remains pending.'})};try{assert.equal((await AI.complete(AI.methodPayload(rows,'2026-11'))).mode,'sdk');global.AppletAI.complete=async()=>({text:'Delivered 99 capabilities.'});assert.notEqual((await AI.complete(AI.methodPayload(rows,'2026-11'))).mode,'sdk');}finally{delete global.AppletAI;}
});

test('method consolidation rejects oversized output rather than publishing a shortening placeholder',async()=>{
 const rows=[{epicId:'one',epicName:'Canary',measure:'Reliability',team:'VC',blurb:'Readiness is progressing.'}];global.AppletAI={isAvailable:()=>true,complete:async()=>({text:'Readiness '.repeat(120)+'.'})};try{const out=await AI.complete(AI.methodPayload(rows,'2026-11'));assert.notEqual(out.mode,'sdk');assert.equal(out.blurb,'');assert.match(out.aiNotice,/automatic correction/);}finally{delete global.AppletAI;}
});

test('method update accepts a complete leadership paragraph beyond the old arbitrary character cap and known reporting dates',()=>{
 const payload=AI.methodPayload([{epicId:'one',epicName:'Epic',measure:'Reliability',team:'VC',blurb:'Canary validation is complete. Regional rollout remains dependent on partner approval. Failover validation is in progress.',reportedMonths:['2026-10']}],'2026-11');
 const prose='In November 2026, delivery readiness is advancing through regional rollout and failover validation. October 2026 canary validation provides the foundation for rollout; partner approval remains the delivery dependency, with failover validation progressing toward regional release readiness and the planned deployment outcome.';
 assert.ok(prose.length>300&&prose.length<650);assert.equal(AI.methodResult(prose,payload.ai,payload).blurb,prose);
 assert.ok(AI.methodResult('Delivered 2026 deployments.',payload.ai,payload).error);assert.ok(AI.methodResult('Delivered 99 launches in November 2026.',payload.ai,payload).error);
 assert.ok(AI.methodResult('Delivery completed in December 2026.',payload.ai,payload).error);
});
test('method update accepts cosmetic markdown and JSON wrappers without changing the underlying words',()=>{
 const payload=AI.methodPayload([{epicId:'one',epicName:'Epic',measure:'Reliability',team:'VC',blurb:'Canary validation completed; rollout is pending.'}],'2026-11');
 for(const text of ['Summary: **Canary validation completed**; rollout is pending.','```json\n'+JSON.stringify({summary:'Canary validation completed; rollout is pending.'})+'\n```'])assert.equal(AI.methodResult(text,payload.ai,payload).blurb,'Canary validation completed; rollout is pending.');
 assert.ok(AI.methodResult('<script>bad</script>',payload.ai,payload).error);
});
test('method generation automatically corrects an invalid response once using the same source evidence',async()=>{
 const rows=[{epicId:'one',epicName:'Canary',measure:'Reliability',team:'VC',blurb:'Canary validation completed; rollout is pending.',reportedMonths:['2026-10']}];let calls=[];global.AppletAI={isAvailable:()=>true,complete:async(_,args)=>{calls.push(args.message);return {text:calls.length===1?'Delivered 99 launches.':'In November 2026, rollout remains pending following October 2026 canary validation.'};}};
 try{const out=await AI.complete(AI.methodPayload(rows,'2026-11'));assert.equal(out.mode,'sdk');assert.equal(out.corrected,true);assert.equal(calls.length,2);assert.match(calls[1],/Correction required/);assert.match(calls[1],/Canary validation completed/);assert.match(out.blurb,/November 2026/);}finally{delete global.AppletAI;}
});
test('method correction is bounded to two calls and never publishes invalid or placeholder text',async()=>{
 let calls=0;global.AppletAI={isAvailable:()=>true,complete:async()=>{calls++;return {text:'99 work items completed.'};}};try{const out=await AI.complete(AI.methodPayload([{epicId:'one',epicName:'Canary',measure:'Reliability',team:'VC',blurb:'Canary validation is pending.'}],'2026-11'));assert.equal(calls,2);assert.notEqual(out.mode,'sdk');assert.equal(out.blurb,'');assert.match(out.aiNotice,/automatic correction/);}finally{delete global.AppletAI;}
});

test('method validation uses all evidence actually supplied to AI, including V2MOM identifiers and epic goals',async()=>{
 const rows=[{epicId:'one',epicName:'Eliminate 80% of known cache issues',measure:'[HRP] M1.1.1 Release readiness',team:'VC',blurb:'Cache cleanup is in progress; release validation remains pending.',reportedMonths:['2026-10']}];
 const payload=AI.methodPayload(rows,'2026-11');assert.match(payload.ai.sourceText,/80%/);assert.match(payload.ai.sourceText,/M1.1.1/);
 const text='M1.1.1 is advancing toward the 80% cache-issue reduction goal; cleanup is in progress and release validation remains pending.';
 assert.equal(AI.methodResult(text,payload.ai,payload).blurb,text);assert.ok(AI.methodResult('Delivered 99% issue reduction.',payload.ai,payload).error);
 let args;global.AppletAI={isAvailable:()=>true,complete:async(_,options)=>{args=options;return {text};}};try{const out=await AI.complete(payload);assert.equal(out.mode,'sdk');assert.match(args.systemPromptOverride,/goals in titles from achieved outcomes/);}finally{delete global.AppletAI;}
});

test('AI usage includes input, output and prompt cache tokens, including a correction request',async()=>{
 let calls=0;global.AppletAI={isAvailable:()=>true,complete:async()=>({text:++calls===1?'99 launches.':'Canary validation is pending.',usage:{input_tokens:100,output_tokens:20,cache_read_input_tokens:30,cache_creation_input_tokens:10}})};
 try{const out=await AI.complete(AI.methodPayload([{epicId:'one',epicName:'Canary',measure:'Reliability',team:'VC',blurb:'Canary validation is pending.'}],'2026-11'));const usage=AI.usageTotal([out]);assert.equal(usage.calls,2);assert.equal(usage.tokens,320);assert.equal(usage.input,280);assert.equal(usage.output,40);assert.equal(usage.cacheRead,60);assert.equal(usage.cacheWrite,20);assert.equal(usage.complete,true);}finally{delete global.AppletAI;}
});
test('AI usage distinguishes missing metadata, incomplete reports and SDK failures from measured zero',async()=>{
 global.AppletAI={isAvailable:()=>true,complete:async()=>({text:'Validation is pending.',usage:{input_tokens:0,output_tokens:0}})};const payload={blurb:'Validation is pending.',mode:'source',ai:{message:'Prompt',sourceText:'Validation is pending.'}};
 try{let out=await AI.complete(payload);assert.equal(AI.usageTotal([out]).tokens,0);assert.equal(AI.usageTotal([out]).complete,true);global.AppletAI.complete=async()=>({text:'Validation is pending.'});out=await AI.complete(payload);assert.equal(out.aiUsage.calls,1);assert.equal(out.aiUsage.reportedCalls,0);assert.equal(AI.usageTotal([out]).complete,false);global.AppletAI.complete=async()=>({text:'Validation is pending.',usage:{input_tokens:25,output_tokens:-2}});out=await AI.complete(payload);assert.equal(out.aiUsage.inputReports,1);assert.equal(out.aiUsage.outputReports,0);assert.equal(AI.usageTotal([out]).complete,false);global.AppletAI.complete=async()=>{throw Error('Failure');};out=await AI.complete(payload);assert.equal(out.aiUsage.calls,1);assert.equal(out.aiUsage.reportedCalls,0);}finally{delete global.AppletAI;}
});
test('parallel generation usage sums independent results and never claims backend usage is known',async()=>{
 const backend=await AI.complete({mode:'assisted',blurb:'Validation pending.'});assert.equal(AI.usageTotal([backend]).unknownBackend,1);assert.equal(AI.usageTotal([backend]).complete,false);
 global.AppletAI={isAvailable:()=>true,complete:async()=>({text:'Validation pending.',usage:{input_tokens:10,output_tokens:5}})};try{const results=await Promise.all([1,2,3].map(()=>AI.complete({ai:{message:'Prompt',sourceText:'Validation pending.'}})));assert.equal(AI.usageTotal(results).tokens,45);assert.equal(AI.usageTotal(results).calls,3);}finally{delete global.AppletAI;}
});
