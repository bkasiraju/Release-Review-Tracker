/* Column-level filtering for every data table (6.24.0). Adds a filter row under each header and hides rows that do not match.
   The Release Planner grid has its own column search and is skipped. Tables are re-rendered by the pages, so a MutationObserver re-adds the row and re-applies the saved values. */
(function(){
  const SKIP='.pl-grid,.pl-rps-t,.pl-rv-ws,.epic-expanded-table,[data-nocf]';
  const saved=new Map();           // table key -> {colIndex: text}
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
  const cellText=c=>{let t=c.textContent;c.querySelectorAll('input,select,textarea').forEach(f=>{t+=' '+(f.tagName==='SELECT'?(f.selectedOptions[0]||{}).textContent||'':f.value);});return norm(t);};
  const keyOf=(t,h)=>(document.body.dataset.hub||'')+'|'+(t.id||'')+'|'+[...h.cells].map(c=>norm(c.textContent)).join('/');
  function apply(t){
    const f=saved.get(t.dataset.cfKey)||{},ids=Object.keys(f).filter(i=>f[i]),h=t.querySelector('thead tr.cf-hd'),n=h?h.cells.length:0;
    let show=true,grp=null,has=false;
    const endGroup=()=>{if(grp&&ids.length)grp.classList.toggle('cf-hide',!has);};
    [...t.tBodies].forEach(b=>[...b.rows].forEach(r=>{
      const data=r.cells.length===n&&![...r.cells].some(c=>c.colSpan>1);
      if(data){show=!ids.length||ids.every(i=>cellText(r.cells[i]).includes(f[i]));if(show)has=true;r.classList.toggle('cf-hide',!show);}
      else if(/detail/.test(r.className)){r.classList.toggle('cf-hide',!show);}
      else{endGroup();grp=/group/.test(r.className)?r:null;has=false;r.classList.remove('cf-hide');show=true;}
    }));
    endGroup();
    const clr=t.querySelector('.cf-clear');if(clr)clr.hidden=!ids.length;
  }
  function inject(t){
    if(t.matches(SKIP)||t.closest('[data-nocf]')||!t.tHead||t.tHead.rows.length!==1)return;
    const h=t.tHead.rows[0];if(h.cells.length<2||[...h.cells].some(c=>c.colSpan>1))return;
    if(!t.tBodies.length)return;
    const key=keyOf(t,h);t.dataset.cfKey=key;h.classList.add('cf-hd');
    const f=saved.get(key)||{};
    const row=document.createElement('tr');row.className='cf-row';
    [...h.cells].forEach((c,i)=>{
      const th=document.createElement('th'),lab=norm(c.textContent);
      if(lab&&!/^(actions?|links?|#)$/.test(lab)){
        const inp=document.createElement('input');inp.type='search';inp.className='cf-in';inp.placeholder='Filter';inp.autocomplete='off';inp.value=f[i]||'';
        inp.setAttribute('aria-label','Filter '+c.textContent.replace(/[↕↑↓▲▼]/g,'').trim());
        ['click','keydown','keyup','mousedown'].forEach(e=>inp.addEventListener(e,ev=>ev.stopPropagation()));
        inp.addEventListener('input',()=>{const s=saved.get(key)||{};s[i]=inp.value.trim().toLowerCase();saved.set(key,s);apply(t);});
        th.appendChild(inp);
      }else if(i===h.cells.length-1){th.innerHTML='';}
      row.appendChild(th);
    });
    const last=row.lastElementChild,b=document.createElement('button');b.type='button';b.className='cf-clear';b.textContent='Clear';b.hidden=true;b.title='Clear column filters';
    b.addEventListener('click',ev=>{ev.stopPropagation();saved.set(key,{});row.querySelectorAll('.cf-in').forEach(i=>{i.value='';});apply(t);});
    if(last&&!last.firstChild)last.appendChild(b);else row.querySelector('th:last-child').appendChild(b);
    t.tHead.appendChild(row);
    apply(t);
  }
  let raf=0;
  function scan(){raf=0;document.querySelectorAll('table').forEach(t=>{if(!t.tHead)return;if(t.tHead.querySelector('.cf-row')){apply(t);return;}inject(t);});}
  const queue=()=>{if(!raf)raf=requestAnimationFrame(scan);};
  new MutationObserver(m=>{if(m.some(x=>x.addedNodes.length||x.removedNodes.length))queue();}).observe(document.body,{childList:true,subtree:true});
  queue();
})();
