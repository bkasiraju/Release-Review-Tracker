'use strict';
const NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthMap = Object.fromEntries(NAMES.flatMap((m,i)=>[[m.toLowerCase(),i+1],[m.slice(0,3).toLowerCase(),i+1]]));
monthMap.sept=9;
const names=Object.keys(monthMap).sort((a,b)=>b.length-a.length).join('|');
// Accept engineer-authored month labels with common Markdown/bracket decoration.
// Require a heading boundary so ordinary prose and complete calendar dates stay notes.
const prefix=String.raw`^\s*(?:[#>*_•+\-–—]\s*)*[\[(]?\s*(?:mid[ -]+|early[ -]+|late[ -]+)?`;
const suffix=String.raw`[ \t]*(?:(?:updates?|comments?|notes?|reports?|status(?:[ \t]+(?:updates?|comments?|notes?))?|progress|review|health(?:[ \t]+(?:updates?|comments?|notes?))?)(?![A-Za-z0-9])[ \t]*)?`;
const boundary=String.raw`(?:(?:[\])][*_]*|[*_]{1,3})[ \t]*(?:[:–—-][ \t]*)?(.*)|:[ \t]*(.*)|[–—][ \t]*(.*)|-[ \t]+(.*)|-[ \t]*$|$)`;
const heading=new RegExp(prefix+String.raw`(${names})\b(?:[ \t,./-]*(20\d{2}))?`+suffix+String.raw`(20\d{2})?[ \t]*`+boundary,'i');
const numericHeading=new RegExp(prefix+String.raw`(0?[1-9]|1[0-2])[ \t]*[-/.][ \t]*(20\d{2})`+suffix+boundary,'i');
const isoHeading=new RegExp(prefix+String.raw`(20\d{2})[ \t]*[-/.][ \t]*(0?[1-9]|1[0-2])`+suffix+boundary,'i');
function monthlyHeading(line,year){
 let m=line.match(heading);if(m)return {month:`${m[2]||m[3]||year}-${String(monthMap[m[1].toLowerCase()]).padStart(2,'0')}`,inferred:!(m[2]||m[3]),inline:m.slice(4).find(v=>v!==undefined)??null};
 m=line.match(numericHeading);if(m)return {month:`${m[2]}-${String(Number(m[1])).padStart(2,'0')}`,inferred:false,inline:m.slice(3).find(v=>v!==undefined)??null};
 m=line.match(isoHeading);if(m)return {month:`${m[1]}-${String(Number(m[2])).padStart(2,'0')}`,inferred:false,inline:m.slice(3).find(v=>v!==undefined)??null};return null;
}
const undatedHeading=new RegExp(prefix+String.raw`(?:older|previous|earlier|undated|original)[ \t]+(?:comments?|notes?|updates?|history)[ \t]*`+boundary,'i');
const richPattern=/<\/?(?:p|div|br|b|strong|span|ul|ol|li|a|h[1-6])\b/i;
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function entity(s){
  const common={'amp':'&','lt':'<','gt':'>','quot':'"','apos':"'",'nbsp':' ','ndash':'–','mdash':'—','bull':'•'};
  const key=s.slice(1,-1);
  if(key[0]==='#'){
    const n=key[1]?.toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);
    return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):s;
  }
  return common[key]??s;
}
function render(raw){
  const rich=richPattern.test(raw), positions=[], chars=[];
  if(!rich)return {text:raw,positions:Array.from({length:raw.length},(_,i)=>[i,i+1]),rich};
  for(const t of raw.matchAll(/<[^>]*>|&(?:#\d+|#x[0-9a-f]+|[a-z]+);|[^<&]+|[<&]/gi)){
    const s=t[0];
    if(s.startsWith('<')&&s.endsWith('>')){
      if((/^<\/?(?:p|div|li|h[1-6])\b|^<br\b/i).test(s)&&chars.at(-1)!=='\n'){chars.push('\n');positions.push(null);}
    }else if(s.startsWith('&')&&s.endsWith(';')){
      const value=entity(s); for(let i=0;i<value.length;i++){chars.push(value[i]);positions.push([t.index,t.index+s.length]);}
    }else for(let i=0;i<s.length;i++){chars.push(s[i]);positions.push([t.index+i,t.index+i+1]);}
  }
  return {text:chars.join(''),positions,rich};
}
function validMonth(m){if(typeof m!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(m))throw Error('Choose a valid year and month (2000–2099).');return m;}
function parseComments(raw='',year=new Date().getFullYear()){
  const {text,positions,rich}=render(raw||''); const blocks=[];let offset=0;
  for(const line of text.match(/[^\n]*\n|[^\n]+$/g)||[]){
    const clean=line.replace(/[\r\n]+$/,'');const marker=clean.match(undatedHeading),m=monthlyHeading(clean,year)||(marker?{month:null,inferred:false,inline:marker.slice(1).find(v=>v!==undefined)??null}:null);
    if(m){
      const {month,inline}=m;
      blocks.push({month,inferred:m.inferred,start:offset,bodyStart:inline===null?offset+line.length:offset+clean.length-inline.length,end:text.length});
    }
    offset+=line.length;
  }
  blocks.forEach((s,i)=>{s.end=blocks[i+1]?.start??text.length;s.text=text.slice(s.bodyStart,s.end).trim().replace(/\n\s*[-_=]{4,}\s*$/,'').trim();});
  const sections=blocks.filter(s=>s.month),months={};for(const s of sections)months[s.month]=[months[s.month],s.text].filter(Boolean).join('\n\n');
  const inferred=[...new Set(sections.filter(s=>s.inferred).map(s=>s.month))].sort();
  return {sections,months,unassigned:[text.slice(0,blocks[0]?.start??text.length).trim(),...blocks.filter(s=>!s.month).map(s=>text.slice(s.start,s.end).trim())].filter(Boolean).join('\n\n'),inferred,
    yearAmbiguous:inferred.some(m=>m.endsWith('-12'))&&inferred.some(m=>m.endsWith('-01')),
    _text:text,_positions:positions,_rich:rich,_blocks:blocks};
}
function plainText(raw){return render(raw||'').text.trim();}
// Sort visible month sections while retaining source HTML, links and undated ranges.
function chronologicalComments(raw,year){
 const p=parseComments(raw,year),ordered=[...p.sections].sort((a,b)=>a.month.localeCompare(b.month));
 if(p.sections.every((s,i)=>s===ordered[i]))return raw;
 if(p.yearAmbiguous)throw Error('Confirm comment years before ordering monthly updates.');
 const blocks=p._blocks;
 if(!p._rich){const fragments=new Map(p.sections.map(s=>[s,raw.slice(s.start,s.end)]));let i=0,out='',at=0;for(const block of blocks){out+=raw.slice(at,block.start);const fragment=block.month?fragments.get(ordered[i++]):raw.slice(block.start,block.end);out+=fragment+(block.end<raw.length&&!fragment.endsWith('\n')?'\n\n':'');at=block.end;}return out+raw.slice(at);}
 const root={start:0,openEnd:0,closeStart:raw.length,end:raw.length,parent:null,children:[]},nodes=[],stack=[root],voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
 for(const token of raw.matchAll(/<!--[\s\S]*?-->|<(?:"[^"]*"|'[^']*'|[^'">])*>/g)){
  const value=token[0],close=value.match(/^<\/([a-z][\w:-]*)\s*>/i),open=value.match(/^<([a-z][\w:-]*)\b/i);
  if(close){const name=close[1].toLowerCase(),node=stack.at(-1);if(node===root||node.name!==name)throw Error('Rich comment markup cannot be safely reordered. Your draft is retained.');node.closeStart=token.index;node.end=token.index+value.length;node.close=value;stack.pop();}
  else if(open){const name=open[1].toLowerCase(),node={name,start:token.index,openEnd:token.index+value.length,closeStart:token.index+value.length,end:token.index+value.length,open:value,close:'',parent:stack.at(-1),children:[]};node.parent.children.push(node);if(!voids.has(name)&&!value.endsWith('/>')){nodes.push(node);stack.push(node);}}
 }
 if(stack.length!==1)throw Error('Rich comment markup cannot be safely reordered. Your draft is retained.');
 const rawAt=offset=>{for(let i=offset;i<p._positions.length;i++)if(p._positions[i])return p._positions[i][0];return raw.length;},last=[...p._positions].reverse().find(Boolean),inside=point=>nodes.filter(n=>n.openEnd<=point&&point<n.closeStart).sort((a,b)=>b.openEnd-a.openEnd)[0]||root;
 const points=[...blocks.map(b=>rawAt(b.start)),last?last[1]-1:raw.length],parents=point=>{const result=[];for(let n=inside(point);n;n=n.parent)result.push(n);return result;};let common=parents(points[0]).find(n=>points.every(point=>parents(point).includes(n)))||root;
 const cut=block=>{let index=rawAt(block.start);for(let n=inside(index);n&&n!==common;n=n.parent)if(!render(raw.slice(n.openEnd,index)).text.trim())index=n.start;return index;};
 const cuts=blocks.map(cut);if(cuts.some((c,i)=>c<common.openEnd||c>common.closeStart||(i&&c<=cuts[i-1])))throw Error('Rich monthly boundaries cannot be safely ordered. Your draft is retained.');
 const active=index=>nodes.filter(n=>n!==common&&n.openEnd<=index&&index<=n.closeStart&&n.start>=common.openEnd&&n.end<=common.closeStart).sort((a,b)=>a.openEnd-b.openEnd);
 const fragment=(a,b)=>active(a).map(n=>n.open).join('')+raw.slice(a,b)+active(b).reverse().map(n=>n.close).join('');
 const pieces=blocks.map((b,i)=>({block:b,html:fragment(cuts[i],cuts[i+1]??common.closeStart)})),sorted=pieces.filter(x=>x.block.month).sort((a,b)=>a.block.month.localeCompare(b.block.month));let i=0;
 const result=raw.slice(0,common.openEnd)+fragment(common.openEnd,cuts[0])+pieces.map(x=>x.block.month?sorted[i++].html:x.html).join('')+raw.slice(common.closeStart);
 const actual=parseComments(result,year);if(JSON.stringify(actual.months)!==JSON.stringify(Object.fromEntries(Object.entries(p.months).sort(([a],[b])=>a.localeCompare(b))))||actual.unassigned!==p.unassigned)throw Error('Monthly ordering could not preserve the source comments. Your draft is retained.');return result;
}
function mergeComments(raw='',year,changes){
  const p=parseComments(raw,year), replacements=[], additions=[];
  for(const [month,input] of Object.entries(changes).sort(([a],[b])=>b.localeCompare(a))){
    validMonth(month);const value=String(input).trim();if(Object.hasOwn(p.months,month)&&p.months[month]===value)continue;
    const canonical=`${NAMES[Number(month.slice(5))-1]} ${month.slice(0,4)} Update:\n${value}`;
    const sections=p.sections.filter(s=>s.month===month);
    if(!sections.length){additions.push(p._rich?`<p>${escapeHTML(canonical).replace(/\n/g,'<br>')}</p>`:canonical);continue;}
    sections.forEach((s,i)=>{
      if(!p._rich){replacements.push([s.start,s.end,i===0?canonical+'\n\n':'']);return;}
      const spans=[];
      for(const pos of p._positions.slice(s.start,s.end))if(pos){
        if(spans.length&&pos[0]<=spans.at(-1)[1])spans.at(-1)[1]=Math.max(spans.at(-1)[1],pos[1]);else spans.push([...pos]);
      }
      spans.forEach(([start,end],j)=>replacements.push([start,end,i===0&&j===0?escapeHTML(canonical).replace(/\n/g,'<br>'):'']));
    });
  }
  let out=raw;
  for(const [a,b,v] of replacements.sort((a,b)=>b[0]-a[0]))out=out.slice(0,a)+v+out.slice(b);
  if(additions.length)out+=(out?'\n\n':'')+additions.join('\n\n');
  return Object.keys(changes).length?chronologicalComments(out,year):out;
}
module.exports={parseComments,mergeComments,plainText,validMonth,escapeHTML,chronologicalComments};
