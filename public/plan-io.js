/* Minimal .xlsx writer/reader for the Release Planning template (no dependencies).
 * write({sheets:[{name,rows,widths,validations,freeze,header}]}) -> Uint8Array; read(ArrayBuffer) -> Promise<{[sheet]:string[][]}> */
(function(g){
'use strict';
const enc=new TextEncoder(),dec=new TextDecoder();
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0;};
const xe=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colL=i=>{let s='';for(i++;i>0;i=Math.floor((i-1)/26))s=String.fromCharCode(65+(i-1)%26)+s;return s;};
const colI=l=>{let n=0;for(const ch of l)n=n*26+ch.charCodeAt(0)-64;return n-1;};

function zip(files){
  const parts=[],cen=[];let off=0;
  const u16=n=>[n&255,(n>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  for(const [name,data] of files){
    const nb=enc.encode(name),crc=crc32(data);
    const lh=new Uint8Array([0x50,0x4b,3,4,...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0)]);
    parts.push(lh,nb,data);
    cen.push(new Uint8Array([0x50,0x4b,1,2,...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(data.length),...u32(data.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nb);
    off+=lh.length+nb.length+data.length;
  }
  const cdLen=cen.reduce((a,b)=>a+b.length,0),n=files.length;
  const end=new Uint8Array([0x50,0x4b,5,6,0,0,0,0,...u16(n),...u16(n),...u32(cdLen),...u32(off),0,0]);
  const all=[...parts,...cen,end],out=new Uint8Array(all.reduce((a,b)=>a+b.length,0));let p=0;for(const b of all){out.set(b,p);p+=b.length;}return out;
}

function sheetXml(sh){
  const rows=sh.rows||[],ncol=Math.max(1,...rows.map(r=>r.length));
  const cell=(v,r,c,style)=>{const ref=colL(c)+(r+1);if(v==null||v==='')return style?`<c r="${ref}" s="${style}"/>`:'';
    if(typeof v==='number'&&isFinite(v))return `<c r="${ref}"${style?` s="${style}"`:''}><v>${v}</v></c>`;
    return `<c r="${ref}"${style?` s="${style}"`:''} t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`;};
  const body=rows.map((r,i)=>`<row r="${i+1}">${r.map((v,c)=>cell(v,i,c,i===0&&sh.header?1:(sh.wrap&&sh.wrap.includes(c)?2:0))).join('')}</row>`).join('');
  const cols=sh.widths?`<cols>${sh.widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols>`:'';
  const view=`<sheetViews><sheetView workbookViewId="0">${sh.freeze?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':''}</sheetView></sheetViews>`;
  const dv=(sh.validations||[]).map(v=>`<dataValidation type="list" ${v.warn?'errorStyle="warning" ':''}allowBlank="1" showInputMessage="1" showErrorMessage="1" ${v.title?`promptTitle="${xe(v.title)}" `:''}${v.prompt?`prompt="${xe(v.prompt)}" `:''}errorTitle="Unexpected value" error="${xe(v.error||'Pick a value from the list.')}" sqref="${v.sqref}"><formula1>${xe(v.formula)}</formula1></dataValidation>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${view}${cols}<sheetData>${body}</sheetData>${dv?`<dataValidations count="${(sh.validations||[]).length}">${dv}</dataValidations>`:''}</worksheet>`;
}

function write(wb){
  const S=wb.sheets,x=s=>enc.encode(s),H='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const files=[
    ['[Content_Types].xml',x(`${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${S.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`)],
    ['_rels/.rels',x(`${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)],
    ['xl/workbook.xml',x(`${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${S.map((s,i)=>`<sheet name="${xe(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`)],
    ['xl/_rels/workbook.xml.rels',x(`${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${S.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${S.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)],
    ['xl/styles.xml',x(`${H}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1B73B3"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>`)],
    ...S.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,x(sheetXml(s))])
  ];
  return zip(files);
}

const u16=(b,o)=>b[o]|(b[o+1]<<8),u32=(b,o)=>(b[o]|(b[o+1]<<8)|(b[o+2]<<16)|(b[o+3]<<24))>>>0;
async function inflate(raw){const ds=new DecompressionStream('deflate-raw'),w=ds.writable.getWriter();w.write(raw);w.close();return new Uint8Array(await new Response(ds.readable).arrayBuffer());}
async function unzip(buf){
  const b=new Uint8Array(buf);let e=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(u32(b,i)===0x06054b50){e=i;break;}
  if(e<0)throw new Error('This is not an .xlsx file.');
  const n=u16(b,e+10);let p=u32(b,e+16);const out={};
  for(let i=0;i<n;i++){
    if(u32(b,p)!==0x02014b50)throw new Error('The .xlsx file is damaged.');
    const method=u16(b,p+10),csize=u32(b,p+20),nl=u16(b,p+28),el=u16(b,p+30),cl=u16(b,p+32),lo=u32(b,p+42),name=dec.decode(b.subarray(p+46,p+46+nl));
    p+=46+nl+el+cl;
    if(!/\.(xml|rels)$/.test(name))continue;
    const ds=lo+30+u16(b,lo+26)+u16(b,lo+28),raw=b.subarray(ds,ds+csize);
    out[name]=dec.decode(method===0?raw:method===8?await inflate(raw):(()=>{throw new Error('Unsupported compression in the .xlsx file.');})());
  }
  return out;
}
const dom=s=>new DOMParser().parseFromString(s,'application/xml');
async function read(buf){
  const f=await unzip(buf);
  if(!f['xl/workbook.xml'])throw new Error('This is not an Excel workbook.');
  const wb=dom(f['xl/workbook.xml']),rels=dom(f['xl/_rels/workbook.xml.rels']||'<Relationships/>');
  const rt={};[...rels.getElementsByTagName('Relationship')].forEach(r=>{rt[r.getAttribute('Id')]=r.getAttribute('Target');});
  const sst=f['xl/sharedStrings.xml']?[...dom(f['xl/sharedStrings.xml']).getElementsByTagName('si')].map(si=>[...si.getElementsByTagName('t')].map(t=>t.textContent).join('')):[];
  const out={};
  for(const sh of [...wb.getElementsByTagName('sheet')]){
    const id=sh.getAttribute('r:id')||sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let t=rt[id]||'';t=t.replace(/^\//,'');const path=t.startsWith('xl/')?t:'xl/'+t;
    if(!f[path])continue;
    const rows=[];
    for(const r of [...dom(f[path]).getElementsByTagName('row')]){
      const ri=Number(r.getAttribute('r'))-1,arr=[];
      for(const c of [...r.getElementsByTagName('c')]){
        const m=/^([A-Z]+)/.exec(c.getAttribute('r')||'');if(!m)continue;
        const ty=c.getAttribute('t'),v=c.getElementsByTagName('v')[0];let val='';
        if(ty==='inlineStr')val=[...c.getElementsByTagName('t')].map(x=>x.textContent).join('');
        else if(ty==='s')val=sst[Number(v&&v.textContent)]||'';
        else val=v?v.textContent:'';
        arr[colI(m[1])]=val;
      }
      rows[ri]=arr;
    }
    out[sh.getAttribute('name')]=Array.from(rows,r=>r?Array.from(r,x=>x==null?'':x):[]);
  }
  return out;
}
const api={write,read};
g.PlanIO=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
