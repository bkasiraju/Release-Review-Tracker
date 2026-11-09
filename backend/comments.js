'use strict';
const NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthMap = Object.fromEntries(NAMES.flatMap((m,i)=>[[m.toLowerCase(),i+1],[m.slice(0,3).toLowerCase(),i+1]]));
monthMap.sept=9;
const names=Object.keys(monthMap).sort((a,b)=>b.length-a.length).join('|');
// Accept engineer-authored month labels with common Markdown/bracket decoration.
// Require a heading boundary so ordinary prose and complete calendar dates stay notes.
const prefix=String.raw`^\s*(?:[#>*_•+\-–—]\s*)*[\[(]?\s*(?:mid[ -]+|early[ -]+|late[ -]+)?`;
const suffix=String.raw`[ \t]*(?:(?:updates?|status(?:[ \t]+updates?)?|progress|review|health(?:[ \t]+updates?)?)(?![A-Za-z0-9])[ \t]*)?`;
const boundary=String.raw`(?:(?:[\])][*_]*|[*_]{1,3})[ \t]*(?:[:–—-][ \t]*)?(.*)|:[ \t]*(.*)|[–—][ \t]*(.*)|-[ \t]+(.*)|$)`;
const heading=new RegExp(prefix+String.raw`(${names})\b(?:[ \t,./-]*(20\d{2}))?`+suffix+String.raw`(20\d{2})?[ \t]*`+boundary,'i');
const numericHeading=new RegExp(prefix+String.raw`(0?[1-9]|1[0-2])[ \t]*[-/.][ \t]*(20\d{2})`+suffix+boundary,'i');
const isoHeading=new RegExp(prefix+String.raw`(20\d{2})[ \t]*[-/.][ \t]*(0?[1-9]|1[0-2])`+suffix+boundary,'i');
function monthlyHeading(line,year){
 let m=line.match(heading);if(m)return {month:`${m[2]||m[3]||year}-${String(monthMap[m[1].toLowerCase()]).padStart(2,'0')}`,inferred:!(m[2]||m[3]),inline:m.slice(4).find(v=>v!==undefined)??null};
 m=line.match(numericHeading);if(m)return {month:`${m[2]}-${String(Number(m[1])).padStart(2,'0')}`,inferred:false,inline:m.slice(3).find(v=>v!==undefined)??null};
 m=line.match(isoHeading);if(m)return {month:`${m[1]}-${String(Number(m[2])).padStart(2,'0')}`,inferred:false,inline:m.slice(3).find(v=>v!==undefined)??null};return null;
}
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
  const {text,positions,rich}=render(raw||''); const sections=[];let offset=0;
  for(const line of text.match(/[^\n]*\n|[^\n]+$/g)||[]){
    const clean=line.replace(/[\r\n]+$/,'');const m=monthlyHeading(clean,year);
    if(m){
      const {month,inline}=m;
      sections.push({month,inferred:m.inferred,start:offset,bodyStart:inline===null?offset+line.length:offset+clean.length-inline.length,end:text.length});
    }
    offset+=line.length;
  }
  const months={};
  sections.forEach((s,i)=>{s.end=sections[i+1]?.start??text.length;s.text=text.slice(s.bodyStart,s.end).trim().replace(/\n\s*[-_]{4,}\s*$/,'').trim();months[s.month]=[months[s.month],s.text].filter(Boolean).join('\n\n');});
  const inferred=[...new Set(sections.filter(s=>s.inferred).map(s=>s.month))].sort();
  return {sections,months,unassigned:text.slice(0,sections[0]?.start??text.length).trim(),inferred,
    yearAmbiguous:inferred.some(m=>m.endsWith('-12'))&&inferred.some(m=>m.endsWith('-01')),
    _text:text,_positions:positions,_rich:rich};
}
function plainText(raw){return render(raw||'').text.trim();}
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
  return out;
}
module.exports={parseComments,mergeComments,plainText,validMonth,escapeHTML};
