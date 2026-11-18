/* V2MOM Measures Import Wizard: parse a V2MOM sheet (Google link or .xlsx), pick the measures owned by chosen people, and create them as GUS projects
 * under the program the user names, for the current team. Opened from the button next to "Open in GUS". */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NAME_MAX=80,call=(a,d)=>window.api(a,d);
const LS=k=>'ri-v2mom-'+k+'-'+(window.Hub.team&&window.Hub.team.Id);
const get=k=>{try{return localStorage.getItem(LS(k))||'';}catch(_){return '';}},put=(k,v)=>{try{localStorage.setItem(LS(k),v);}catch(_){}};
const shortOf=()=>{const H=window.Hub;return String(H.team&&(H.team.short||H.team.Name)||'').replace(/[^A-Za-z0-9&]+/g,' ').trim().split(' ').map((w,i,a)=>a.length>1?w[0].toUpperCase():w).join('').slice(0,8);};

// HTML export / "Publish to web" page: every <table> becomes one tab; its name is the "Mx)" title found in its first rows, else M1, M2…
function htmlTabs(text){
  const doc=new DOMParser().parseFromString(text,'text/html'),out={};let n=0;
  const cell=c=>c.textContent.replace(/\u00a0/g,' ').split(/\r?\n/).map(l=>l.replace(/[ \t]+/g,' ').trim()).join('\n').trim();
  doc.querySelectorAll('table').forEach(t=>{
    if(t.parentElement&&t.parentElement.closest('table'))return;
    const rows=[...t.querySelectorAll('tr')].map(r=>[...r.children].filter(c=>/^t[dh]$/i.test(c.tagName)).flatMap(c=>{const sp=Math.max(1,+c.getAttribute('colspan')||1);return [cell(c),...Array(sp-1).fill('')];})).filter(r=>r.some(Boolean));
    if(rows.length<3)return;n++;
    // The method title is usually a heading just above the table ("M1 · Title (15G 9Y 1R)"); keep it as the first row so the parser can name the method.
    let h=t.previousElementSibling,title='';for(let i=0;h&&i<3&&!title;i++,h=h.previousElementSibling){const x=h.textContent.replace(/\s+/g,' ').trim();if(/^M\d+\s*[):.\-–·]/.test(x))title=x.replace(/\s*\([^()]*\)\s*$/,'');}
    if(title)rows.unshift([title]);
    let name='';for(const r of rows.slice(0,6)){const m=r.map(c=>/^M(\d+)\s*[):.\-–·]/.exec(c)).find(Boolean);if(m){name='M'+m[1];break;}}
    out[name&&!out[name]?name:'M'+n]=rows;});
  return out;
}

function open(){
  const H=window.Hub;if(!H){alert('The hub is still loading. Try again in a moment.');return;}
  if(!H.hasTeam()){window.toast?.('Pick a team first. The import creates projects for the selected team.',true);return;}
  const ov=document.createElement('div');ov.className='nd-overlay';
  ov.innerHTML=`<div class="nd-modal pl-modal v2w" role="dialog" aria-modal="true" aria-label="V2MOM measures import"><div class="v2w-h"><h2>V2MOM measures import <small>${esc(H.team.Name)}</small></h2><button type="button" class="nd-x" data-x aria-label="Close">×</button></div><div class="nd-b" data-b></div></div>`;
  H.popHost().appendChild(ov);
  const b=ov.querySelector('[data-b]'),close=()=>ov.remove();
  ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-x]'))close();});
  ov.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  let parsed=null,sheets=null,programs=[],teamProg=null;
  call('plan-refs',{teamId:H.team.Id}).then(r=>{programs=r.programs||[];}).catch(()=>{});

  const step1=(err)=>{
    b.innerHTML=`<p class="v2w-step">Step 1 of 3 · Read the sheet</p>
    <label class="v2w-f"><span>Google Sheet link</span><input class="v2w-in" data-url type="url" placeholder="https://docs.google.com/spreadsheets/d/…" value="${esc(get('url'))}"><small>Shared with “anyone with the link”, or upload a file below.</small></label>
    <label class="v2w-f"><span>Or upload a file</span><input class="v2w-in" data-file type="file" accept=".xlsx,.html,.htm"><small>.xlsx or .html (Google Sheets: File › Download). PDF tables lose their columns, so PDF is not supported.</small></label>
    <label class="v2w-f"><span>Owners to import</span><input class="v2w-in" data-own placeholder="Jane Doe, Raj Patel (empty = everyone)" value="${esc(get('owners'))}"><small>Comma-separated names, matched against the Owner column.</small></label>
    <details class="v2w-adv"><summary>Advanced: tabs</summary><label class="v2w-f"><span>Method tabs</span><input class="v2w-in" data-tabs value="${esc(get('tabs')||'M1, M2, M3, M4, M5')}"><small>For an .xlsx, tabs named M1, M2… are used if this is empty. HTML files use every table.</small></label></details>
    <p class="pl-cr-err" role="alert" ${err?'':'hidden'}>${esc(err||'')}</p>
    <div class="v2w-foot"><span class="pl-cr-btns"><button type="button" class="v2w-btn" data-x>Cancel</button><button type="button" class="v2w-btn pri" data-go>Parse sheet</button></span></div>`;
    const go=b.querySelector('[data-go]'),er=b.querySelector('.pl-cr-err');
    go.onclick=async()=>{
      const url=b.querySelector('[data-url]').value.trim(),f=b.querySelector('[data-file]').files[0],owners=b.querySelector('[data-own]').value,tabsTxt=b.querySelector('[data-tabs]').value;
      const tabs=tabsTxt.split(',').map(x=>x.trim()).filter(Boolean);
      er.hidden=true;go.disabled=true;go.textContent='Reading…';
      try{
        let payload={teamId:H.team.Id,owners,tabs};
        if(f){
          const ext=(/\.([a-z0-9]+)$/i.exec(f.name)||[])[1]||'';let all;
          if(/^pdf$/i.test(ext))throw new Error('PDF cannot be read reliably (tables lose their columns). In Google Sheets use File › Download › Microsoft Excel (.xlsx) or Web page (.html), or paste the sheet link.');
          if(/^html?$/i.test(ext)){all=htmlTabs(await f.text());if(!Object.keys(all).length)throw new Error('No tables were found in that HTML file. Use File › Download › Web page (.html) from Google Sheets, or upload the .xlsx.');sheets=all;}
          else{all=await window.PlanIO.read(await f.arrayBuffer());sheets={};Object.keys(all).filter(k=>tabs.length?tabs.some(t=>t.toLowerCase()===k.toLowerCase()):/^M\d+/i.test(k)).forEach(k=>{sheets[k]=all[k];});}
          if(!Object.keys(sheets).length)throw new Error('No matching tabs found in that file. Check the tab names (M1, M2, …).');payload.sheets=sheets;}
        else if(url)payload.url=url;else throw new Error('Paste a Google Sheet link or choose an .xlsx file.');
        parsed=await call('plan-v2mom-parse',payload);teamProg=parsed.teamProgram;
        put('url',f?'':url);put('tabs',tabsTxt);put('owners',owners);
        step2();
      }catch(e){step1(String(e&&e.message||e));}
    };
  };

  const step2=()=>{
    const pre=get('prefix')||shortOf(),ms=parsed.measures||[];
    if(!ms.length){const why=[...(parsed.skipped||[]).map(x=>`${x.tab}: ${x.reason}`),...(parsed.tabs||[]).map(t=>`${t.tab}: ${t.measures} measure${t.measures===1?'':'s'} found${parsed.owners&&parsed.owners.length?', none owned by '+parsed.owners.join(' / '):''}`)];
      b.innerHTML=`<p class="v2w-step">No measures matched</p><ul class="v2w-why">${why.map(x=>`<li>${esc(x)}</li>`).join('')||'<li>The sheet had no readable tabs.</li>'}</ul><p class="note">The sheet needs a header row with a “Measure” column and an “Owner” column, and measure codes like 1.1.1. Check the owner spelling and the tab names.</p><div class="v2w-foot"><span class="pl-cr-btns"><button type="button" class="v2w-btn" data-back>Back</button></span></div>`;b.querySelector('[data-back]').onclick=()=>step1();return;}
    const byTab=new Map();ms.forEach((m,i)=>{if(!byTab.has(m.method))byTab.set(m.method,[]);byTab.get(m.method).push([m,i]);});
    b.innerHTML=`<p class="note">Step 2 of 3 · ${ms.length} measure${ms.length===1?'':'s'} across ${byTab.size} method${byTab.size===1?'':'s'}${parsed.owners&&parsed.owners.length?' for '+esc(parsed.owners.join(', ')):''}. Untick any you do not want, and edit names if needed.</p>
    <div class="v2w-bar"><label>Project prefix <input class="v2w-in" data-pre value="${esc(pre)}" maxlength="12" style="width:90px"></label>
    <label>Method value <select class="v2w-in" data-mm><option value="refs">V2MOM refs from the sheet</option><option value="tab">Sheet method (M1, M2…)</option></select></label>
    <button type="button" class="v2w-btn sm" data-all>Select all</button><button type="button" class="v2w-btn sm" data-none>Select none</button><span class="v2w-cnt" data-cnt></span></div>
    <div class="v2w-list" data-list></div><p class="pl-cr-err" role="alert" hidden></p>
    <div class="pl-cr-foot"><span class="v2w-hint">Next: choose the GUS program.</span><span class="pl-cr-btns"><button type="button" class="v2w-btn" data-back>Back</button><button type="button" class="v2w-btn pri" data-next>Continue</button></span></div>`;
    const list=b.querySelector('[data-list]'),pe=b.querySelector('[data-pre]'),mm=b.querySelector('[data-mm]'),cnt=b.querySelector('[data-cnt]');
    const nameFor=m=>{const head=`${pe.value.trim()} M${m.code} - `.replace(/\s+/g,' ').trimStart(),t=String(m.name||'').split(/\r?\n/)[0].replace(/\s+/g,' ').trim();let full=head+t;
      if(full.length>NAME_MAX){full=full.slice(0,NAME_MAX);const i=full.lastIndexOf(' ');if(i>head.length+10)full=full.slice(0,i);full=full.replace(/[\s:;,\-–(]+$/,'');}return full;};
    const draw=()=>{list.innerHTML=[...byTab].map(([t,arr])=>`<section class="v2w-g"><h4>${esc(t)} <small>${arr.length}</small></h4>${arr.map(([m,i])=>{const nm=nameFor(m);return `<div class="v2w-r"><input type="checkbox" class="v2w-ck" data-i="${i}" checked aria-label="Import ${esc(m.code)}"><div class="v2w-rb"><input class="v2w-in" data-n="${i}" value="${esc(nm)}"><small class="v2w-c" data-c="${i}"></small><small class="v2w-o">${esc(m.ownerText||'')}${m.refText?' · '+esc(m.refText):''}</small></div></div>`;}).join('')}</section>`).join('');count();};
    const count=()=>{const n=list.querySelectorAll('[data-i]:checked').length;cnt.textContent=n+' selected';list.querySelectorAll('[data-n]').forEach(x=>{const c=list.querySelector(`[data-c="${x.dataset.n}"]`),l=x.value.trim().length;c.textContent=l+' / '+NAME_MAX;c.classList.toggle('bad',l>NAME_MAX);});};
    draw();
    pe.oninput=()=>{const cur=[...list.querySelectorAll('[data-i]')].map(x=>x.checked);draw();list.querySelectorAll('[data-i]').forEach((x,k)=>{x.checked=cur[k];});count();};
    list.addEventListener('input',count);list.addEventListener('change',count);
    b.querySelector('[data-all]').onclick=()=>{list.querySelectorAll('[data-i]').forEach(x=>x.checked=true);count();};
    b.querySelector('[data-none]').onclick=()=>{list.querySelectorAll('[data-i]').forEach(x=>x.checked=false);count();};
    b.querySelector('[data-back]').onclick=()=>step1();
    b.querySelector('[data-next]').onclick=()=>{
      const er=b.querySelector('.pl-cr-err'),items=[...list.querySelectorAll('[data-i]:checked')].map(x=>{const m=ms[+x.dataset.i],name=list.querySelector(`[data-n="${x.dataset.i}"]`).value.trim();
        return {code:m.code,name,short:`${pe.value.trim()} M${m.code}`.trim(),method:mm.value==='tab'?m.method.split(':')[0]:(m.refText||'NO V2MOM Reference')};});
      if(!items.length){er.textContent='Select at least one measure.';er.hidden=false;return;}
      const long=items.find(i=>i.name.length>NAME_MAX);if(long){er.textContent=`“${long.name.slice(0,40)}…” is ${long.name.length} characters; GUS allows at most ${NAME_MAX}. Shorten it.`;er.hidden=false;return;}
      put('prefix',pe.value.trim());step3(items,pe.value.trim());};
  };

  const step3=(items,prefix)=>{
    const def=get('program')||(teamProg&&teamProg.name)||'';
    b.innerHTML=`<p class="note">Step 3 of 3 · Choose the GUS program. ${items.length} project${items.length===1?'':'s'} will be created under it (existing projects with the same name are reused) and added to <b>${esc(H.team.Name)}</b>'s plan.</p>
    <label class="pl-cr-f"><span>GUS program name <small>exact name of the PPM program${teamProg?`; this team's default is ${esc(teamProg.name)}`:''}</small></span><input class="v2w-in" data-prog list="v2w-progs" value="${esc(def)}" placeholder="e.g. ${esc(H.team.short||H.team.Name)} - 268"><datalist id="v2w-progs">${programs.map(p=>`<option value="${esc(p.name)}">`).join('')}</datalist></label>
    <div class="v2w-sum">${items.map(i=>`<div>${esc(i.name)} <small>${esc(i.method)}</small></div>`).join('')}</div>
    <p class="pl-cr-err" role="alert" hidden></p>
    <div class="pl-cr-foot"><span class="note">Created in GUS immediately when you confirm.</span><span class="pl-cr-btns"><button type="button" class="v2w-btn" data-back>Back</button><button type="button" class="v2w-btn pri" data-ok>Create in GUS</button></span></div>`;
    b.querySelector('[data-back]').onclick=()=>step2();
    const ok=b.querySelector('[data-ok]'),er=b.querySelector('.pl-cr-err');
    ok.onclick=async()=>{
      const programName=b.querySelector('[data-prog]').value.trim();
      if(!programName){er.textContent='Enter the GUS program name.';er.hidden=false;return;}
      er.hidden=true;ok.disabled=true;ok.textContent='Creating…';
      try{const r=await call('plan-v2mom-import',{teamId:H.team.Id,programName,prefix,items});put('program',programName);done(r);}
      catch(e){er.textContent=String(e&&e.message||e);er.hidden=false;ok.disabled=false;ok.textContent='Create in GUS';}
    };
  };

  const done=r=>{
    const bad=r.results.filter(x=>!x.ok);
    b.innerHTML=`<p class="note"><b>${r.results.length-bad.length}</b> of ${r.results.length} projects are in program <b>${esc(r.program.name)}</b> (${r.created} newly created in GUS, ${r.added} added to the plan).</p>
    <div class="v2w-sum">${r.results.map(x=>`<div class="${x.ok?'':'bad'}">${x.ok?'✓':'✗'} ${esc(x.name)} <small>${x.ok?(x.created?'created':'already existed'):esc(x.error)}</small></div>`).join('')}</div>
    <div class="pl-cr-foot"><span></span><span class="pl-cr-btns"><button type="button" class="v2w-btn pri" data-view>Open planner</button></span></div>`;
    b.querySelector('[data-view]').onclick=()=>{close();H.go('plan');if(H.current==='plan')location.reload();};
  };
  step1();
}
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-v2mom-open]'))open();});
})();
