/* Dock-style side bar: expands on hover/focus with a label under each icon, icons magnify toward the pointer, and it shrinks on leave. */
(function(){
'use strict';
const rail=document.querySelector('.rail');if(!rail)return;
const LABEL={home:'Home',sprints:'Sprints',tds:'Dependencies',tests:'Tests',rotations:'Trust Champion',bugs:'Bugs',hourglass:'Hourglass',epics:'Review',plan:'Planning',status:'V2MOM'};
const btns=[...rail.querySelectorAll('.rail-button')];
btns.forEach(b=>{const t=LABEL[b.dataset.page]||b.dataset.label||(b.id==='rail-sources'?'Sources':'');if(!t||b.querySelector('.rail-label'))return;
  const s=document.createElement('span');s.className='rail-label';s.textContent=t;s.setAttribute('aria-hidden','true');b.appendChild(s);b.removeAttribute('title');});
const brand=rail.querySelector('.brand');if(brand)brand.removeAttribute('title');
const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
function magnify(y){btns.forEach(b=>{const r=b.getBoundingClientRect(),d=y==null?999:Math.abs(y-(r.top+r.height/2)),k=reduce?1:1+.5*Math.exp(-Math.pow(d/58,2));b.style.setProperty('--k',k.toFixed(3));});}
const edge=document.createElement('div');edge.className='rail-edge';edge.innerHTML='<span class="rail-tab"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg></span>';edge.title='Menu';edge.setAttribute('aria-hidden','true');document.body.appendChild(edge);
let hideT=0;const show=()=>{clearTimeout(hideT);rail.classList.add('show','open');edge.classList.add('gone');},hide=()=>{clearTimeout(hideT);hideT=setTimeout(()=>{rail.classList.remove('show','open');edge.classList.remove('gone');magnify(null);},450);};
edge.addEventListener('mouseenter',show);edge.addEventListener('click',show);document.addEventListener('click',e=>{if(!rail.contains(e.target)&&e.target!==edge)hide();});rail.addEventListener('mouseenter',show);rail.addEventListener('mouseleave',hide);
rail.addEventListener('mousemove',e=>{magnify(e.clientY);});
rail.addEventListener('focusin',show);
rail.addEventListener('focusout',e=>{if(!rail.contains(e.relatedTarget))hide();});

/* Daily Chronicle opens the selected team's chronicle page; teams without one show it disabled. Add a team's page here when it exists. */
const CHRON={MQ:'https://git.soma.salesforce.com/pages/bkasiraju/mq-chronicle/index.html'};
const chron=rail.querySelector('a[data-label="Daily Chronicle"]');
if(chron){
  const sync=()=>{const t=window.Hub&&window.Hub.team,u=t&&CHRON[t.short],nm=t&&t.Id!=='all'?(t.short||t.Name):'';
    if(u){chron.setAttribute('href',u);chron.removeAttribute('aria-disabled');chron.removeAttribute('tabindex');chron.title='Daily Chronicle for '+nm+' (opens in a new tab)';chron.setAttribute('aria-label','Daily Chronicle for '+nm+', opens in a new tab');}
    else{chron.removeAttribute('href');chron.setAttribute('aria-disabled','true');chron.tabIndex=-1;chron.title=nm?'Daily Chronicle is not available for '+nm+' yet':'Select a team to open its Daily Chronicle';chron.setAttribute('aria-label',chron.title);}
    chron.classList.toggle('disabled',!u);};
  chron.addEventListener('click',e=>{if(chron.getAttribute('aria-disabled')==='true')e.preventDefault();});
  window.addEventListener('hub:team',sync);sync();let n=0;const iv=setInterval(()=>{sync();if(window.Hub&&window.Hub.teams&&window.Hub.teams.length||++n>40)clearInterval(iv);},500);}
})();
