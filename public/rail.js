/* Dock-style side bar: expands on hover/focus with a label under each icon, icons magnify toward the pointer, and it shrinks on leave. */
(function(){
'use strict';
const rail=document.querySelector('.rail');if(!rail)return;
const LABEL={home:'Home',sprints:'Sprints',tds:'Dependencies',tests:'Tests',rotations:'Trust Champion',bugs:'Bugs',epics:'Review',plan:'Planning',status:'V2MOM'};
const btns=[...rail.querySelectorAll('.rail-button')];
btns.forEach(b=>{const t=LABEL[b.dataset.page]||(b.id==='rail-sources'?'Sources':'');if(!t||b.querySelector('.rail-label'))return;
  const s=document.createElement('span');s.className='rail-label';s.textContent=t;s.setAttribute('aria-hidden','true');b.appendChild(s);b.removeAttribute('title');});
const brand=rail.querySelector('.brand');if(brand)brand.removeAttribute('title');
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
function magnify(y){btns.forEach(b=>{const r=b.getBoundingClientRect(),d=y==null?999:Math.abs(y-(r.top+r.height/2)),k=reduce?1:1+.5*Math.exp(-Math.pow(d/58,2));b.style.setProperty('--k',k.toFixed(3));});}
rail.addEventListener('mouseenter',()=>rail.classList.add('open'));
rail.addEventListener('mousemove',e=>{rail.classList.add('open');magnify(e.clientY);});
rail.addEventListener('mouseleave',()=>{rail.classList.remove('open');magnify(null);});
rail.addEventListener('focusin',()=>rail.classList.add('open'));
rail.addEventListener('focusout',e=>{if(!rail.contains(e.relatedTarget)){rail.classList.remove('open');magnify(null);}});
})();
