/* One shared tooltip surface. Native titles are migrated before they can duplicate it. */
(function(){
 'use strict';
 const tip=document.createElement('div');tip.id='ui-tooltip';tip.className='ui-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 let active=null,showTimer=null,hideTimer=null;
 const rich=el=>!!el?.closest('.epic-summary-trigger,[data-do="ai-peek"],[data-hover-summary="true"]');
 function migrate(root){if(!(root instanceof Element))return;const nodes=root.hasAttribute('title')?[root,...root.querySelectorAll('[title]')]:root.querySelectorAll('[title]');for(const node of nodes){const text=(node.getAttribute('title')||'').trim();node.removeAttribute('title');if(text&&!rich(node)){node.dataset.tooltip=text;if(node.matches('button,a,input,select,textarea,[role="button"]')&&!node.getAttribute('aria-label')&&!node.getAttribute('aria-labelledby')&&!node.textContent.trim())node.setAttribute('aria-label',text);}else delete node.dataset.tooltip;}}
 function hide(){clearTimeout(showTimer);clearTimeout(hideTimer);if(active){const ids=(active.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==tip.id);if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');}active=null;tip.hidden=true;tip.textContent='';}
 function position(){if(!active?.isConnected||!active.getClientRects().length){hide();return;}const r=active.getBoundingClientRect(),box=tip.getBoundingClientRect(),x=Math.max(12,Math.min(innerWidth-box.width-12,r.left+(r.width-box.width)/2)),above=r.top-box.height-8;tip.style.left=x+'px';tip.style.top=Math.max(12,Math.min(innerHeight-box.height-12,above>=12?above:r.bottom+8))+'px';}
 function show(node,immediate=false){if(!node||rich(node)){hide();return;}if(active===node)return;hide();active=node;showTimer=setTimeout(()=>{if(active!==node||!node.isConnected||!node.dataset.tooltip){hide();return;}tip.textContent=node.dataset.tooltip;tip.hidden=false;const ids=new Set((node.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean));ids.add(tip.id);node.setAttribute('aria-describedby',[...ids].join(' '));position();},immediate?0:350);}
 migrate(document.body);
 new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')migrate(record.target);else for(const node of record.addedNodes)migrate(node);}if(active&&!active.isConnected)hide();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['title']});
 document.addEventListener('pointerover',event=>{if(event.pointerType==='touch'||tip.contains(event.target))return;const target=event.target.closest('[data-tooltip]');if(target&&!target.contains(event.relatedTarget))show(target);else if(!target)hide();},true);
 document.addEventListener('pointerout',event=>{if(active?.contains(event.target)&&!active.contains(event.relatedTarget)&&!tip.contains(event.relatedTarget)){clearTimeout(hideTimer);hideTimer=setTimeout(hide,100);}},true);
 document.addEventListener('focusin',event=>{if(event.target.matches(':focus-visible'))show(event.target.closest('[data-tooltip]'),true);});
 document.addEventListener('focusout',event=>{if(active?.contains(event.target)&&!active.contains(event.relatedTarget))hide();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},true);
 document.addEventListener('pointerdown',hide,true);document.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
 tip.addEventListener('pointerenter',()=>clearTimeout(hideTimer));tip.addEventListener('pointerleave',hide);
})();
