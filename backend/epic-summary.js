'use strict';
/** Saved "AI Summarised Updates" for one epic (accomplishments, learnings, plan forward), shared by everyone who opens the deck.
 *  The browser generates the text (GUS Apps AI SDK) and saves it here under a fingerprint of the evidence it was built from;
 *  the same fingerprint later returns the saved text, a changed one means "regenerate". */
const SF_ID=/^[a-zA-Z0-9]{15,18}$/,FP=/^[a-z0-9]{8,40}$/;
const LIMITS={accomplishments:4,inProgress:3,learnings:3,planForward:3};
const line=v=>String(v==null?'':v).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,200);
const ref=v=>String(v==null?'':v).replace(/[^A-Za-z0-9 -]/g,'').trim().slice(0,24);
/** A line is plain text or {text, refs} where refs are the work item numbers (or "engineer update") that back it. */
const item=v=>typeof v==='string'?{text:line(v),refs:[]}:{text:line(v&&v.text),quote:line(v&&v.quote),refs:(Array.isArray(v&&v.refs)?v.refs:[]).map(ref).filter(Boolean).slice(0,4)};
const key=id=>'eas-'+String(id).slice(0,15);
function clean(s){
  if(!s||typeof s!=='object')throw Error('Summary is missing.');
  const out={};let n=0;
  for(const k of Object.keys(LIMITS)){out[k]=(Array.isArray(s[k])?s[k]:[]).map(item).filter(x=>x.text).slice(0,LIMITS[k]);n+=out[k].length;}
  if(!n)throw Error('Summary is empty.');
  return out;
}
function ids(b){
  const id=String(b&&b.epicId||''),fp=String(b&&b.fingerprint||'');
  if(!SF_ID.test(id))throw Error('Unknown epic.');if(!FP.test(fp))throw Error('Invalid summary fingerprint.');
  return {id,fp};
}
async function get(service,b){
  const {id,fp}=ids(b),e=await service.store.get('settings',key(id));
  const a=e&&e.epicSummary;
  return a&&a.fingerprint===fp&&a.summary?{summary:a.summary,generatedAt:a.generatedAt,cached:true}:{summary:null};
}
async function save(service,b){
  const {id,fp}=ids(b),summary=clean(b.summary);
  if(service.readOnly)return {saved:false};
  const old=await service.store.get('settings',key(id)),generatedAt=new Date().toISOString();
  await service.store.put('settings',key(id),{id:key(id),epicSummary:{epicId:id,fingerprint:fp,summary,generatedAt}},old&&old.revision!==undefined?old.revision:null);
  return {saved:true,generatedAt};
}
module.exports={get,save,clean};
