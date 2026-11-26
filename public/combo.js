/* Type-to-filter lists for inputs that point at a <datalist>. The browser's own popup ignores the page font and the design
 * system, so it is replaced by a listbox in Salesforce Sans. Picking an option sets the value and fires "input" and "change". */
(function(){
'use strict';
let box=null,cur=null,act=-1,shown=[];
const opts=inp=>{const dl=document.getElementById(inp.dataset.list||'');return dl?[...dl.options].map(o=>({v:o.value,l:o.label||''})):[];};
const hide=()=>{if(box){box.remove();box=null;}if(cur)cur.setAttribute('aria-expanded','false');cur=null;act=-1;shown=[];};
function place(){
  if(!box||!cur)return;const r=cur.getBoundingClientRect(),below=innerHeight-r.bottom,up=below<220&&r.top>below;
  box.style.left=r.left+'px';box.style.width=r.width+'px';box.style.maxHeight=Math.max(120,Math.min(260,(up?r.top:below)-12))+'px';
  if(up){box.style.top='auto';box.style.bottom=(innerHeight-r.top+2)+'px';}else{box.style.bottom='auto';box.style.top=(r.bottom+2)+'px';}
}
function show(inp,all){
  const q=all?'':inp.value.trim().toLowerCase();
  shown=opts(inp).filter(o=>!q||(o.v+' '+o.l).toLowerCase().includes(q)).slice(0,200);
  if(!shown.length){hide();return;}
  if(!box){box=document.createElement('div');box.className='cb-list';box.setAttribute('role','listbox');box.addEventListener('mousedown',e=>e.preventDefault());
    box.addEventListener('click',e=>{const i=e.target.closest('[data-i]');if(i&&cur)pick(+i.dataset.i);});document.body.appendChild(box);}
  cur=inp;inp.setAttribute('aria-expanded','true');act=-1;
  box.innerHTML=shown.map((o,i)=>`<div class="cb-opt" role="option" data-i="${i}"><span>${esc(o.v)}</span>${o.l&&o.l!==o.v?`<small>${esc(o.l)}</small>`:''}</div>`).join('');
  place();
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function pick(i){const inp=cur,o=shown[i];if(!inp||!o)return;inp.value=o.v;hide();inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));}
function mark(){if(!box)return;[...box.children].forEach((c,i)=>c.classList.toggle('on',i===act));const c=box.children[act];if(c)c.scrollIntoView({block:'nearest'});}
// Take over a list input: the native popup is switched off by moving its "list" attribute aside.
function adopt(t){if(!(t instanceof HTMLInputElement))return false;if(t.hasAttribute('list')){t.dataset.list=t.getAttribute('list');t.removeAttribute('list');t.setAttribute('role','combobox');t.setAttribute('aria-autocomplete','list');t.setAttribute('aria-expanded','false');}return !!t.dataset.list;}
document.addEventListener('pointerdown',e=>{if(adopt(e.target)&&cur!==e.target)show(e.target,true);else if(!e.target.closest('.cb-list')&&e.target!==cur)hide();},true);
document.addEventListener('focusin',e=>{if(adopt(e.target)&&cur!==e.target)show(e.target,true);},true);
document.addEventListener('input',e=>{if(e.isTrusted&&adopt(e.target))show(e.target,false);},true);
document.addEventListener('keydown',e=>{
  if(!cur||e.target!==cur)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();if(!box)show(cur,true);act=Math.max(0,Math.min(shown.length-1,act+(e.key==='ArrowDown'?1:-1)));mark();}
  else if(e.key==='Enter'&&box&&act>=0){e.preventDefault();e.stopImmediatePropagation();pick(act);}
  else if(e.key==='Escape'&&box){e.preventDefault();e.stopImmediatePropagation();hide();}
  else if(e.key==='Tab')hide();
},true);
document.addEventListener('focusout',e=>{if(e.target===cur)setTimeout(()=>{if(document.activeElement!==cur)hide();},0);},true);
addEventListener('resize',place);addEventListener('scroll',place,true);
})();
