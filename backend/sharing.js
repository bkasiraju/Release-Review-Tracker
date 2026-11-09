'use strict';
function id(value,prefix){if(typeof value!=='string'||!new RegExp('^'+prefix+'[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$').test(value))throw Error('Invalid GUS sharing record ID.');return value;}
function success(result,message){if(!result||result.success===false||result.errors?.length)throw Error(message);return result;}
async function organization(sf){const result=await sf.query('SELECT Id FROM Organization LIMIT 1');return id(result.records?.[0]?.Id,'00D');}
async function shareVersion(sf,versionId,orgId){
 id(versionId,'068');id(orgId,'00D');
 const result=await sf.query(`SELECT ContentDocumentId FROM ContentVersion WHERE Id = '${versionId}' LIMIT 1`),doc=id(result.records?.[0]?.ContentDocumentId,'069');
 try{success(await sf.create('ContentDocumentLink',{ContentDocumentId:doc,LinkedEntityId:orgId,ShareType:'V',Visibility:'AllUsers'}),'Could not share dashboard data with authenticated GUS organization users.');}
 catch(error){if(!/DUPLICATE|already.*linked/i.test(String(error.message)))throw error;}
 const links=await sf.query(`SELECT Id, ShareType, Visibility FROM ContentDocumentLink WHERE ContentDocumentId = '${doc}' AND LinkedEntityId = '${orgId}' LIMIT 1`);
 if(!links.records?.some(l=>['V','C'].includes(l.ShareType)&&l.Visibility==='AllUsers'))throw Error('Dashboard data sharing could not be verified. The update was not published.');
 return doc;
}
module.exports={organization,shareVersion,success};
