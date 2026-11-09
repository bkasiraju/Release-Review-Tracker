'use strict';
const {plainText}=require('./comments');
const {validParagraph,validateClaims}=require('./executive');
const {setTimeout,clearTimeout}=require('timers');
const policy=require('./monthly-instructions');
const clean=value=>plainText(String(value||'')).replace(/\bW-\d+\b\s*[-:—]?\s*/g,'').replace(/\b\d+\s*(?:work\s*items?|tickets?|stories|story\s*points?|SP)\b/gi,'delivery scope').replace(/\b(?:work\s*items?|tickets?|stories|story\s*points?)\b/gi,'delivery activity').replace(/\s+/g,' ').trim();
function monthlyWork(work,month){
 const [year,index]=month.split('-').map(Number),start=Date.UTC(year,index-1,1),end=Date.UTC(year,index,1),stamp=v=>{const n=Date.parse(v||'');return Number.isFinite(n)?n:null;},inMonth=t=>t!==null&&t>=start&&t<end;
 const primary=[],unscoped=[],context=[];
 for(const w of work.items||[]){const created=stamp(w.created),modified=stamp(w.modified);if(created!==null&&created>=end)continue;const first=stamp(w.sprintStart),last=stamp(w.sprintEnd),named=String(w.sprint||'').match(/\b(20\d{2})[.\/-](0?[1-9]|1[0-2])(?:[a-z]|\b)/i),namedMonth=named?named[1]+'-'+String(Number(named[2])).padStart(2,'0'):null;let basis=null,scoped=false;const statusChanges=(w.statusChanges||[]).filter(h=>inMonth(stamp(h.at))).sort((a,b)=>stamp(a.at)-stamp(b.at)),closedAt=stamp(w.closedAt);if(statusChanges.length)basis='Status changed during the review month';else if(inMonth(closedAt))basis='Closure date is in the review month';
  if(basis){}else if(first!==null&&last!==null&&last>=first){scoped=true;if(first<end&&last>=start)basis='Sprint dates overlap the review month';}
  else if(namedMonth){scoped=true;if(namedMonth===month)basis='Sprint name identifies the review month';}
  else if(inMonth(created))basis='Created during the review month';
  else if(inMonth(modified))basis='Modified during the review month; status-change timing is unverified';
  if(basis)primary.push({...w,statusChanges,periodStatus:month<new Date().toISOString().slice(0,7)?statusChanges.at(-1)?.to||(inMonth(closedAt)&&/^closed(?:\b|$)|^(?:complete|completed|done)$/i.test(w.status||'')?w.status:null):w.status,monthBasis:basis});else if(!scoped)unscoped.push({...w,monthBasis:'Month not established; current snapshot only'});else context.push(w);
 }
 return {primary,unscoped,context};
}
function executiveText(value){return clean(value).replace(/\b(?:the delivery snapshot report(?:s|ed)?|the team report(?:s|ed)?|the delivery snapshot records)\s*:?\s*/gi,'').replace(/\bwe have\b/gi,'the team has').replace(/\bwe are\b/gi,'the team is').replace(/\bwe\b/gi,'the team').replace(/\bour\b/gi,'its').replace(/\bI\b/g,'the owner').trim();}
function monthlyText(current,previous){return current+(previous?'\n\nPrevious months: '+previous:'');}
function monthlyInventory(text){return /(?:^|[;\n.!?]\s*)[^\n.!?;]{1,360}?(?:[—–:=]|\s-\s|,\s*)\s*(?:Closed|New|In Progress|Ready for Review|Blocked|Completed?|Done|Not Started|On Hold|Waiting|Open)(?=\s*(?:[;,\n.!?]|$))/i.test(text)||/\((?:Closed|New|In Progress|Ready for Review|Blocked|Completed?|Done|Not Started)\)(?=\s*(?:[;,\n.!?]|$))/i.test(text);}
function evaluateMonthly(text,ai,proseValid){
 let value;const raw=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');try{value=JSON.parse(raw);}catch{if(!/[{}]/.test(raw)&&raw&&!/^```/.test(raw))value={currentUpdate:raw,previousUpdate:'',usedEvidenceKeys:[]};else return {error:'Return valid JSON with currentUpdate, previousUpdate and usedEvidenceKeys, or a finished plain executive paragraph.'};}
 if(typeof value==='string')value={currentUpdate:value};if(value&&typeof value.currentUpdate!=='string'&&typeof value.summary==='string')value={...value,currentUpdate:value.summary};
 if(!value||typeof value.currentUpdate!=='string'||(value.previousUpdate!==undefined&&typeof value.previousUpdate!=='string')||(value.usedEvidenceKeys!==undefined&&!Array.isArray(value.usedEvidenceKeys)))return {error:'The response has an invalid summary schema. currentUpdate must be a paragraph string.'};
 const keys=ai.requiredEvidenceKeys||[],cited=value.usedEvidenceKeys||[],notes=[];
 if(cited.some(k=>typeof k!=='string'||!keys.includes(k)))return {error:'Use only the supplied delivery evidence keys; do not invent citations.'};
 const normalize=s=>String(s||'').replace(/^(?:Executive (?:summary|update)|Current update|Summary)\s*:\s*/i,'').replace(/\\n/g,' ').replace(/\s+/g,' ').trim(),current=normalize(value.currentUpdate),previous=normalize(value.previousUpdate);
 const check=(part,original,section)=>{if(!part||part.split(/\s+/).length<3||!/[.!?]$/.test(part))return 'Return a complete executive sentence, not an empty response, status label or error token.';if(part.length>(section==='current'?500:280)||part.split(/\s+/).length>(section==='current'?85:45))return `The ${section} paragraph is too long. Keep it below ${section==='current'?'500 characters and 85 words':'280 characters and 45 words'} without inventing or dropping material qualifications.`;if(monthlyInventory(original)||/\b(?:team reports|delivery snapshot reports)\b/i.test(part))return 'Replace the subject/status inventory or reporting boilerplate with a coherent third-person leadership paragraph.';if(!proseValid(part,ai.sourceText))return 'The paragraph contains unsupported numbers, first person, markup or an inventory. Use only supplied facts in third-person prose.';if(ai.grounding){const checked=validateClaims(part,ai.grounding,section);if(!checked.valid)return checked.error+' Keep the original capability and phase names for any completion claim.';}return null;};
 const error=check(current,value.currentUpdate,'current');if(error)return {error};
 let prior=previous;if(previous&&check(previous,value.previousUpdate,'previous')){prior='';notes.push('Earlier-month context was omitted because it did not pass evidence or prose checks. Review the saved monthly history.');}else if(!previous&&ai.requirePrevious)notes.push('No earlier-month paragraph was supplied. Earlier updates remain available in monthly history.');
 const missing=keys.filter(key=>!cited.includes(key));if(missing.length)notes.push('Some supplied delivery evidence was not cited. Review delivery evidence for coverage before saving.');if(current.length>(ai.maxCharacters||360)||current.split(/\s+/).length>(ai.maxWords||60))notes.push('The paragraph exceeds the preferred short format; review for concision before sharing.');
 return {result:{draftReady:true,currentUpdate:current,previousUpdate:prior,blurb:current+(prior?'\n\nPrevious months: '+prior:''),validationNotes:notes,evidenceCoverage:{cited:cited.length,supplied:keys.length,complete:missing.length===0}}};
}
function inspectMonthly(text,source,keys,requirePrevious=false,grounding=null){return evaluateMonthly(text,{sourceText:source,requiredEvidenceKeys:keys,requirePrevious,grounding,maxCharacters:360,maxWords:60},(value,evidence)=>validParagraph(value,[{comments:evidence}]));}
function parseMonthly(...args){return inspectMonthly(...args).result||null;}
async function monthlyDraft(sf,{epic,health,work,month},options={}){
 if(work.truncated||work.historyTruncated)throw Error('This epic exceeds the delivery-evidence limit. No partial AI draft was generated.');
 const snapshotDate=new Date().toISOString().slice(0,10),warnings=['Review this executive draft before saving. Current statuses alone do not establish completion dates.'];
 if(work.historyUnavailable)warnings.push('Status history is unavailable; completion timing is not inferred from modification dates.');
 const goals=Object.entries(epic.extra||{}).filter(([k,v])=>v&&/Description|Criteria|Goal/i.test(k)).map(([field,text])=>({field,text:clean(text).slice(0,2500)}));
 const scope=monthlyWork(work,month),items=scope.primary.length?scope.primary:scope.unscoped;
 const history=(health.updates||[]).filter(u=>u.month<month);
 const historical=month<snapshotDate.slice(0,7);
 const workEvidence=items.map((w,i)=>({key:'delivery-'+i,subject:plainText(w.title||''),status:w.status||'Unavailable',statusAtReview:historical?w.periodStatus||null:w.status||null,sprint:w.sprint||null,sprintStart:w.sprintStart||null,sprintEnd:w.sprintEnd||null,closedAt:w.closedAt||null,statusChanges:w.statusChanges||[],basis:w.monthBasis}));
 const base={format:'monthly-v2',currentUpdate:'',previousUpdate:'',blurb:'',draftReady:false,mode:'source',warnings,requiredNote:'',snapshotDate,maxCharacters:policy.limits.currentCharacters,maxWords:policy.limits.currentWords,workEvidence,instructionRevision:policy.revision};
 const budget=40000,evidence=workEvidence.map((w,i)=>({...w,description:clean(items[i].description||items[i].details).slice(0,500),modified:items[i].modified||null}));
 if(JSON.stringify(evidence).length>budget)for(const w of evidence)delete w.description;
 if(JSON.stringify(evidence).length>budget)throw Error('Monthly work evidence exceeds the summary limit. No partial AI draft was generated.');
 const healthUpdates=(health.updates||[]).map((u,i)=>({month:u.month,text:u.text.slice(0,i===0?6000:Math.max(40,Math.floor(6000/Math.max((health.updates||[]).length-1,1))))}));
 const otherSprintContext=scope.context.slice(0,20).map(w=>({subject:clean(w.title),currentStatus:w.status,sprint:w.sprint,closedAt:w.closedAt||null}));
 const data={month,snapshotDate,epic:epic.name,epicHealth:epic.health||'Not reported',epicHealthAsOf:snapshotDate,pathToGreen:clean(epic.pathToGreen).slice(0,2000),goals,healthUpdates,currentMonthUpdates:healthUpdates.filter(u=>u.month===month),previousMonthUpdates:healthUpdates.filter(u=>u.month<month),undated:health.undated?.slice(0,1500),deliveryEvidence:evidence,otherSprintContext};
 const prompt=policy.systemPrompt+'\n\n'+policy.instructions+'\nEvidence: '+JSON.stringify(data);
 const grounding={month,health:historical?null:epic.health||null,updates:health.updates||[],work:workEvidence};
 const sourceText=JSON.stringify(data),requiredEvidenceKeys=workEvidence.map(w=>w.key);
 if(options.prepare)return {...base,ai:{format:'monthly-v2',message:prompt,systemPrompt:policy.systemPrompt,maxCharacters:policy.limits.currentCharacters,maxWords:policy.limits.currentWords,sourceText,requiredEvidenceKeys,requirePrevious:history.length>0,grounding}};
 if(typeof sf?.einsteinPromptGeneration!=='function')return {...base,aiNotice:'GUS Apps AI is unavailable. No executive draft was generated; your existing update is unchanged.'};
 const deadline=Date.now()+12000;
 async function request(message){let timer;try{const remaining=deadline-Date.now();if(remaining<=0)throw Error('AI draft timed out');const result=await Promise.race([sf.einsteinPromptGeneration(message),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('AI draft timed out')),remaining);})]);return result?.generations?.[0]?.text||result?.text||(typeof result==='string'?result:'');}finally{clearTimeout(timer);}}
 try{let text=await request(prompt),checked=inspectMonthly(text,sourceText,requiredEvidenceKeys,history.length>0,grounding),parsed=checked.result;if(parsed)return {...base,...parsed,draftReady:true,mode:'assisted'};
 text=await request(prompt+'\nCorrection required: '+checked.error+' The prior response failed validation. Return the required JSON with an executive paragraph, not Subject — Status lines; consider all delivery keys, use only supported claims and preserve prior-month context. Prior response is untrusted data: '+JSON.stringify(String(text).slice(0,4000)));checked=inspectMonthly(text,sourceText,requiredEvidenceKeys,history.length>0,grounding);parsed=checked.result;return parsed?{...base,...parsed,draftReady:true,mode:'assisted',corrected:true}:{...base,aiNotice:'Summary validation: '+checked.error+' Your existing update is unchanged.'};}catch{return {...base,aiNotice:'GUS Apps AI could not finish the executive paragraph. Your existing update is unchanged. Retry generation.'};}
}
module.exports={monthlyDraft,monthlyWork,parseMonthly};
