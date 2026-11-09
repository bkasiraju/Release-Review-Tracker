'use strict';
const {validId}=require('./gus');
const {parseComments}=require('./comments');
async function prepareNudge(gus,slack,{epicId,month},saved={}){
 const id=validId(epicId);if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month||''))throw Error('Choose a valid review month.');
 const rows=await gus.queryAll(`SELECT Id, Name, Development_Lead__r.Name, Development_Lead__r.Email, Epic_Health_Comments__c FROM ADM_Epic__c WHERE Id = '${id}' LIMIT 1`);
 const row=rows[0];if(!row)throw Error('Epic is unavailable in your GUS session.');
 const lead=row.Development_Lead__r;if(!lead?.Name)throw Error('Assign a Development Lead in GUS before preparing a Slack nudge.');
 const parsed=parseComments(row.Epic_Health_Comments__c||'',saved.year||Number(month.slice(0,4)));const mapped={};for(const section of parsed.sections){const key=section.inferred?(saved.yearMapping?.[section.month]||section.month):section.month;mapped[key]=[mapped[key],section.text].filter(Boolean).join('\n\n');}const hasUpdate=!!mapped[month]?.trim();
 const label=new Date(month+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}),url=`https://gus.lightning.force.com/lightning/r/ADM_Epic__c/${id}/view`;
 const text=`Hi ${lead.Name}, could you please ${hasUpdate?'review and refresh':'add'} the ${label} Epic Health Comments for ${row.Name}? Please include the latest delivery progress, any risks or blockers, and next steps.\n${url}\nThanks! — Release Intelligence`;
 let slackUserId=null,notice='Slack identity lookup is unavailable. Copy the reminder and select the Development Lead in Slack.';
 if(lead.Email&&typeof slack?.resolveIdentity==='function')try{const result=await slack.resolveIdentity({email:lead.Email});const candidate=result?.user?.id||result?.userId||result?.slackUserId||result?.id;if(/^[UW][A-Z0-9]{8,}$/.test(candidate||'')){slackUserId=candidate;notice='Recipient matched using the Development Lead’s GUS email. Review the reminder, copy it, then open Slack to send.';}else notice='No Slack account was matched to the Development Lead’s GUS email. Copy the reminder and choose the recipient in Slack.';}catch{notice='Slack identity lookup could not complete. Copy the reminder and choose the recipient in Slack.';}
 return {epicId:id,month,lead:lead.Name,hasUpdate,text,slackUserId,notice};
}
module.exports={prepareNudge};
