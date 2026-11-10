'use strict';
(function(root){
 const normalize=s=>String(s??'').trim().replace(/\s+/g,' ').toLowerCase();
 function uniqueOptions(values){const seen=new Set();return values.filter(v=>{const key=normalize(v);if(!key||seen.has(key))return false;seen.add(key);return true;}).map(v=>String(v).trim()).sort((a,b)=>a.localeCompare(b));}
 function releaseSignature(r){const lists=Array.isArray(r.sources)?r.sources.map(s=>s?.id).filter(id=>typeof id==='string'&&/^00B[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?$/.test(id)).map(id=>id.slice(0,15)).sort():[];const manual=[];if(lists.length)for(const token of String(r.inputLinks||'').replace(/\[[^\]]*\]\((https:\/\/[^)\s]+)\)/g,'$1').split(/[\s,]+/).filter(Boolean)){let id=null;if(/^[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?$/.test(token)&&!token.startsWith('00B'))id=token;else if(token.includes('://')){try{const path=new URL(token).pathname,idMatch=path.match(/^\/lightning\/r\/ADM_Epic__c\/([A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?)\/view\/?$/)||path.match(/^\/([A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?)\/?$/);if(idMatch)id=idMatch[1];}catch{}}if(id)manual.push(id.slice(0,15));}return JSON.stringify([lists.length?['lists',...new Set(lists)]:String(r.name||'').trim().replace(/\s+/g,' ').toLowerCase(),r.year,lists.length?[...new Set(manual)].sort():[...(r.epicIds||[])].sort(),lists.length?null:String(r.inputLinks||'').trim().replace(/\s+/g,' ').toLowerCase()]);}
 function releaseChoices(releases){
  const choices=[],groups=new Map(),aliases=new Map();
  for(const r of [...releases].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))){
   // Group duplicate saved scopes without deleting their underlying records. The latest saved settings win.
   const signature=releaseSignature(r);
   const existing=groups.get(signature);if(existing){aliases.set(r.id,existing.id);continue;}
   groups.set(signature,r);choices.push({...r,label:r.name});aliases.set(r.id,r.id);
  }
  const counts=new Map();for(const r of choices)counts.set(normalize(r.name),(counts.get(normalize(r.name))||0)+1);
  for(const r of choices)if(counts.get(normalize(r.name))>1)r.label=`${r.name} · ${r.year} · ${r.epicIds.length} epics · ${r.id.slice(0,8)}`;
  return {choices,aliases};
 }
 function summaryColumnSizes(rows=[],width=1080,measure=text=>String(text).length*6.5){
  const widest=(key,extra,min,max)=>Math.max(min,Math.min(max,Math.max(0,...rows.map(e=>measure(String(e[key]||''))))+extra));
  const weights=[widest('name',48,280,440),widest('lead',48,170,300),widest('health',34,110,160),220,120],base=weights.reduce((a,b)=>a+b,0),usable=Math.max(base,Number(width)-40||0);
  return [40,...weights.map(w=>Math.round(w/base*usable))];
 }
 function columnSizes(columns,rows=[],label=key=>key,measure=text=>String(text).length*6.5){
  return columns.map(key=>{
   if(key==='health')return 140;if(key==='reviewStatus')return 190;if(key==='name')return 280;if(key.startsWith('month:'))return 280;if(key==='pathToGreen')return 220;
   const values=rows.map(row=>key.startsWith('gus:')?row.extra?.[key.slice(4)]:row[key]).filter(v=>v!==null&&v!==undefined);
   const header=Math.min(130,measure(label(key))),content=Math.max(0,...values.map(v=>measure(typeof v==='object'?'':String(v))));
   const extra=key==='health'?36:['owner','lead'].includes(key)?46:20;
   return Math.ceil(Math.max(key==='completion'?110:58,header+16,Math.min(180,content)+extra));
  });
 }
 function reviewMonths(review){if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(review))return [];const [year,month]=review.split('-').map(Number);return [0,1,2].map(offset=>new Date(Date.UTC(year,month-1-offset,1)).toISOString().slice(0,7)).filter(m=>m>='2000-01');}
 function visibleReleaseMonths(release,available,review){const chosen=new Set(Array.isArray(release?.visibleMonths)?release.visibleMonths:reviewMonths(review)),hidden=new Set(release?.hiddenMonths||[]);return available.filter(m=>chosen.has(m)&&!hidden.has(m));}
 function shortTeam(value){const text=String(value||'').trim(),key=normalize(text).replace(/[^a-z0-9]/g,'');if(!text)return '';if(key.includes('managedasyncprocessing')||/\bMAPS\b/i.test(text))return 'MAPS';if(key.includes('vegacache'))return 'VC';if(key.includes('vegastore'))return 'VS';if(key.includes('messagequeue')||key.includes('messagingqueue')||/\bMQ\b/i.test(text))return 'MQ';const named=text.match(/\(([A-Z][A-Z0-9-]{1,7})\)/);if(named)return named[1];if(text.length<=8)return text;const words=text.split(/[^A-Za-z0-9]+/).filter(w=>w&&!/^(and|of|the|for)$/i.test(w));return words.length>1?words.slice(0,6).map(w=>w[0]).join('').toUpperCase():text;}
 function sortEpics(rows,key='name',direction=1){if(!['name','health','lead'].includes(key))key='name';const compare=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}).compare,dir=direction===-1?-1:1;return [...rows].sort((a,b)=>{const av=a.unavailable?.includes(key)?'':String(a[key]??'').trim(),bv=b.unavailable?.includes(key)?'':String(b[key]??'').trim();if(!av!==!bv)return av?-1:1;return compare(av,bv)*dir||compare(String(a.name||''),String(b.name||''))||compare(String(a.id||''),String(b.id||''));});}
 class MultiSelect{
  constructor(select,{label,empty='All',onChange,onDelete,maxSelected=Infinity}={}){
   this.select=select;this.label=label;this.empty=empty;this.onChange=onChange;this.onDelete=onDelete;this.maxSelected=maxSelected;select.multiple=true;select.hidden=true;
   const wrap=document.createElement('div');wrap.className='multi-select';select.parentNode.insertBefore(wrap,select);wrap.append(select);this.wrap=wrap;
   this.button=document.createElement('button');this.button.type='button';this.button.className='multi-trigger';this.button.setAttribute('aria-label',label);this.button.setAttribute('aria-expanded','false');this.button.setAttribute('aria-controls',select.id+'-options');this.button.setAttribute('aria-haspopup','dialog');wrap.append(this.button);this.chips=document.createElement('div');this.chips.className='selection-chips';wrap.append(this.chips);
   const panel=document.createElement('div');panel.id=select.id+'-options';panel.className='multi-panel hidden';panel.setAttribute('role','dialog');panel.setAttribute('aria-label',label+' options');wrap.append(panel);this.panel=panel;
   this.search=document.createElement('input');this.search.type='search';this.search.placeholder='Search…';this.search.setAttribute('aria-label','Search '+label.toLowerCase());panel.append(this.search);
   const actions=document.createElement('div');actions.className='multi-actions';panel.append(actions);
   for(const [text,selected] of [['Select all',true],['Clear all',false]]){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>{let count=0;for(const o of select.options)o.selected=selected&&!o.disabled&&count++<this.maxSelected;this.changed();};actions.append(b);}
   if(Number.isFinite(maxSelected)){const hint=document.createElement('p');hint.className='multi-limit-note';hint.textContent=`View up to ${maxSelected} releases at a time. Uncheck one to switch.`;panel.append(hint);}this.list=document.createElement('div');this.list.className='multi-options';panel.append(this.list);
   this.search.oninput=()=>this.drawOptions();this.button.onclick=()=>this.toggle();
   this.keyListener=e=>{if(e.key==='Escape'&&!panel.classList.contains('hidden')){e.preventDefault();e.stopPropagation();this.close();this.button.focus();}};wrap.addEventListener('keydown',this.keyListener);
   this.outside=e=>{if(!wrap.contains(e.target))this.close();};document.addEventListener('click',this.outside);
   select.addEventListener('change',()=>this.sync());this.sync();
  }
  values(){return [...this.select.selectedOptions].map(o=>o.value);}
  changed(){this.sync();this.select.dispatchEvent(new Event('change',{bubbles:true}));this.onChange?.(this.values());}
  sync(){const focus=this.list.contains(document.activeElement)?document.activeElement.dataset.value:null;const options=[...this.select.options],chosen=options.filter(o=>o.selected);this.chips.replaceChildren();for(const o of chosen.slice(0,4)){const chip=document.createElement('span');chip.className='selection-chip';chip.title=o.textContent;const text=document.createElement('span');text.textContent=o.textContent;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+o.textContent);remove.onclick=()=>{o.selected=false;this.changed();};chip.append(text,remove);this.chips.append(chip);}if(chosen.length>4){const more=document.createElement('span');more.className='selection-chip';more.textContent='+'+(chosen.length-4);this.chips.append(more);}const triggerLabel=document.createElement('span');triggerLabel.className='multi-trigger-label';triggerLabel.textContent=(chosen.length?(this.select.id==='release-select'?`${chosen.length} selected`:this.label+': '+(['owner-filter','health-filter','group-by'].includes(this.select.id)?chosen.length:(chosen.length===1?chosen[0].textContent:chosen.length))):this.empty);const caret=document.createElement('span');caret.className='multi-caret';caret.setAttribute('aria-hidden','true');this.button.replaceChildren(triggerLabel,caret);this.button.title=chosen.length?this.label+': '+chosen.map(o=>o.textContent).join(', '):this.empty;this.drawOptions();if(focus!==null){const target=[...this.list.querySelectorAll('input')].find(i=>i.dataset.value===focus);target?.focus();}}
  drawOptions(){const query=normalize(this.search.value);this.list.replaceChildren();const options=[...this.select.options].filter(o=>normalize(o.textContent).includes(query));for(const o of options){const label=document.createElement('label');label.className='multi-option';const input=document.createElement('input');input.type='checkbox';input.dataset.value=o.value;input.checked=o.selected;input.disabled=o.disabled||(!o.selected&&this.values().length>=this.maxSelected);input.onchange=()=>{o.selected=input.checked;this.changed();};label.append(input,document.createTextNode(o.textContent));if(this.onDelete){const row=document.createElement('div');row.className='multi-option-row';const remove=document.createElement('button');remove.type='button';remove.className='option-delete';remove.setAttribute('aria-label','Delete release '+o.textContent);remove.title='Delete release';remove.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 5h12M8 3h4M6 5l1 12h6l1-12M9 8v6M11 8v6"/></svg>';remove.onclick=e=>{e.stopPropagation();this.close();this.button.focus();this.onDelete(o.value);};row.append(label,remove);this.list.append(row);}else this.list.append(label);}if(!options.length)this.list.textContent='No matching options';}
  toggle(){const open=this.panel.classList.contains('hidden');if(open){if(this.select.id==='release-select'){this.search.value='';this.drawOptions();}document.querySelectorAll('.multi-panel').forEach(p=>p.classList.add('hidden'));document.querySelectorAll('.multi-trigger').forEach(b=>b.setAttribute('aria-expanded','false'));this.panel.classList.remove('hidden');this.button.setAttribute('aria-expanded','true');this.search.focus();}else this.close();}
  close(){this.panel.classList.add('hidden');this.button.setAttribute('aria-expanded','false');}
  destroy(){document.removeEventListener('click',this.outside);}
 }
 function sortWorkItems(items,key='number',direction=1){
  const allowed=['number','title','status','assignee','sprint','points'];if(!allowed.includes(key))key='number';const dir=direction===-1?-1:1,compare=new Intl.Collator(undefined,{numeric:true,sensitivity:'base'}).compare;
  return [...items].sort((a,b)=>{const av=a[key],bv=b[key],am=av===null||av===undefined||av==='',bm=bv===null||bv===undefined||bv==='';if(am!==bm)return am?1:-1;const order=am?0:key==='points'?Number(av)-Number(bv):compare(String(av),String(bv));return order*dir||compare(String(a.number||a.id||''),String(b.number||b.id||''));});
 }
 const groupLabels={project:'Measure (Project)',health:'Health / Epic Status',team:'Team',lead:'Development Lead',completion:'Completion'};
 function groupEpics(rows,keys=[]){
  const selected=[...new Set(keys)].filter(k=>Object.hasOwn(groupLabels,k));
  const value=(e,key)=>{if(e.unavailable?.includes(key))return key==='project'?'Measure not available':key==='lead'?'Lead not available':key==='team'?'Team not available':'Not reported';if(key==='team')return /^caching services$/i.test(String(e.team||'').trim())?'Caching Services':shortTeam(e.team)||'Team not set';if(key==='completion'){const raw=e.completion,value=Number(raw),n=Math.round(value);return raw===null||raw===undefined||String(raw).trim()===''||!Number.isFinite(value)||value<0||value>100?'Not reported':n===0?'0%':n<25?'1–24%':n<50?'25–49%':n<75?'50–74%':n<100?'75–99%':'100%';}return String(key==='project'?(e.project??e.extra?.['Project__r.Name']):key==='health'?(e.health||e.extra?.Status__c):e.lead||'').trim()||({project:'Measure not set',health:'Not reported',lead:'Unassigned'}[key]);};
  const build=(items,depth,path)=>{if(depth>=selected.length)return [];const field=selected[depth],groups=new Map();for(const e of items){const label=value(e,field);if(!groups.has(label))groups.set(label,[]);groups.get(label).push(e);}return [...groups].sort(([a],[b])=>{if(field==='completion'){const bands=['0%','1–24%','25–49%','50–74%','75–99%','100%','Not reported'];return bands.indexOf(a)-bands.indexOf(b);}return a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});}).map(([label,members])=>{const next=[...path,[field,label]],key=JSON.stringify(next);return {key,field,label,depth,rows:members,children:build(members,depth+1,next)};});};
  return build(rows,0,[]);
 }
 function slackReminderParts(text,data={}){
  const source=String(text??''),parts=[],decode=value=>value.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  const token=/<(https:\/\/gus\.(?:lightning\.force|my\.salesforce)\.com\/lightning\/r\/ADM_Epic__c\/[A-Za-z0-9]{15}(?:[A-Za-z0-9]{3})?\/view)\|([^>\n]+)>|<@([UW][A-Z0-9]{8,})>/g;
  let position=0;for(const match of source.matchAll(token)){if(match.index>position)parts.push({type:'text',text:decode(source.slice(position,match.index))});if(match[1])parts.push({type:'link',url:match[1],text:decode(match[2])});else if(match[3]===data.slackUserId&&data.lead)parts.push({type:'mention',text:'@'+data.lead});else parts.push({type:'text',text:match[0]});position=match.index+match[0].length;}if(position<source.length)parts.push({type:'text',text:decode(source.slice(position))});return parts;
 }
 function slackReminderHTML(text,data){
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const format=value=>escape(value).replace(/\*([^*\n]+)\*/g,'<strong>$1</strong>').replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g,'$1<em>$2</em>').replace(/\n/g,'<br>');
  return slackReminderParts(text,data).map(part=>part.type==='link'?`<a href="${escape(part.url)}" target="_blank" rel="noopener noreferrer" style="color:#1264a3;text-decoration:underline">${format(part.text)}</a>`:part.type==='mention'?`<span class="nudge-mention">${escape(part.text)}</span>`:format(part.text)).join('');
 }
 function slackReminderPlainText(text,data){const plain=value=>value.replace(/\*([^*\n]+)\*/g,'$1').replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g,'$1$2');return slackReminderParts(text,data).map(part=>part.type==='link'?plain(part.text)+' ('+part.url+')':plain(part.text)).join('');}
 const api={slackReminderHTML,slackReminderPlainText,groupEpics,groupLabels,reviewMonths,visibleReleaseMonths,shortTeam,sortEpics,releaseSignature,sortWorkItems,normalize,uniqueOptions,releaseChoices,columnSizes,summaryColumnSizes,MultiSelect};if(typeof module==='object'&&module.exports)module.exports=api;else root.ReviewControls=api;
})(typeof globalThis!=='undefined'?globalThis:window);
