/* Presentation only: source values and editor text are never modified. */
(function(root){
 'use strict';
 const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function displayText(value){return String(value??'').replace(/(?:\\n){2,}/g,'\n\n').replace(/\\r\\n/g,'\n');}
 function formatComment(value){const text=displayText(value).replace(/([.!?])[ \t]+(?=(?:Done|Completed|In progress|Next steps|Risks?|Issues|Path to green|Blocked|Pending|Plan forward)\s*:)/gi,'$1\n');
  return text.split('\n').map(line=>{if(!line.trim())return '<span class="comment-gap" aria-hidden="true"></span>';const sentences=line.length>400?line.split(/(?<=[.!?])(?=\s+[A-Z])/):[line],groups=[];for(let i=0;i<sentences.length;i+=2)groups.push(sentences.slice(i,i+2).join(''));return groups.map(part=>{const heading=part.match(/^(\s*(?:Done|Completed|In progress|Next steps|Risks?(?:\s*\/\s*issues)?|Issues|Path to green|Blocked|Pending|Plan forward)\s*:)/i),body=heading?'<strong class="comment-label">'+escape(heading[1])+'</strong>'+escape(part.slice(heading[1].length)):escape(part);return '<span class="comment-paragraph'+(/^\s*[-•*]\s/.test(part)?' comment-bullet':'')+'">'+body+'</span>';}).join('');}).join('\n');
 }
 function monthFallback(epic){return Object.keys(epic?.parsed?.months||{}).length?'':String(epic?.parsed?.unassigned||'').trim();}
 function generalUpdate(epic,month,review){return month===review&&Object.keys(epic?.parsed?.months||{}).length?String(epic?.parsed?.unassigned||'').trim():'';}
 const api={displayText,formatComment,monthFallback,generalUpdate};if(typeof module==='object'&&module.exports)module.exports=api;else root.ReviewComments=api;
})(typeof globalThis!=='undefined'?globalThis:window);
