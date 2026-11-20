/* Three-way merge of release plans, so two people editing at once keep each other's changes.
 * merge3(base, mine, theirs) -> {plan, conflicts:[{path,label,mine,theirs}]}
 * Changes that do not overlap merge silently; when both sides changed the same value differently, mine wins and the overlap is reported. */
(function(g){
'use strict';
const isO=v=>v&&typeof v==='object'&&!Array.isArray(v);
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const idArr=a=>Array.isArray(a)&&a.length>0&&a.every(x=>isO(x)&&x.id!=null);
const prim=a=>Array.isArray(a)&&a.every(x=>x==null||typeof x!=='object');
const nm=v=>isO(v)?(v.name||v.text||''):'';
function merge3(base,mine,theirs){
  const conflicts=[];
  const m=(b,a,t,path,label)=>{
    if(eq(a,t))return a;
    if(eq(b,a))return t;
    if(eq(b,t))return a;
    if(isO(a)&&isO(t)){
      const bb=isO(b)?b:{},out={},lab=nm(a)||nm(t)||label;
      for(const k of new Set([...Object.keys(a),...Object.keys(t)])){
        const inA=k in a,inT=k in t;
        if(!inA&&!(k in bb)){out[k]=t[k];continue;}
        if(!inT&&!(k in bb)){out[k]=a[k];continue;}
        const v=m(bb[k],inA?a[k]:undefined,inT?t[k]:undefined,path.concat(k),lab);
        if(v!==undefined)out[k]=v;
      }
      return out;
    }
    if((idArr(a)||a.length===0)&&(idArr(t)||t.length===0)&&Array.isArray(a)&&Array.isArray(t)){
      const bb=Array.isArray(b)?b:[],bm=new Map(bb.map(x=>[x.id,x])),am=new Map(a.map(x=>[x.id,x])),tm=new Map(t.map(x=>[x.id,x]));
      const sameOrder=eq(bb.map(x=>x.id),a.map(x=>x.id));
      const order=sameOrder?t.map(x=>x.id).concat(a.filter(x=>!tm.has(x.id)&&!bm.has(x.id)).map(x=>x.id)):a.map(x=>x.id).concat(t.filter(x=>!am.has(x.id)&&!bm.has(x.id)).map(x=>x.id));
      const out=[];
      for(const id of new Set(order.concat(a.map(x=>x.id),t.map(x=>x.id)))){
        const x=am.get(id),y=tm.get(id),z=bm.get(id);
        if(x&&y){out.push(m(z,x,y,path.concat(id),nm(x)||label));continue;}
        const kept=x||y;if(!kept)continue;
        if(!z){out.push(kept);continue;}
        if(eq(z,kept))continue;
        conflicts.push({p:path.concat(id),path:path.concat(id).join('/'),label:(nm(kept)||label||'item')+' (deleted by '+(x?'someone else':'you')+', but edited by '+(x?'you':'someone else')+')',mine:x?'edited':'(deleted)',theirs:y?'edited':'(deleted)',deleted:true});
        out.push(kept);
      }
      return out;
    }
    if(prim(a)&&prim(t)&&(Array.isArray(b)||b==null)){
      const bb=Array.isArray(b)?b:[],drop=new Set(bb.filter(x=>!a.includes(x)||!t.includes(x)));
      return [...new Set([...a,...t])].filter(x=>!drop.has(x)||(a.includes(x)&&t.includes(x)&&!bb.includes(x)));
    }
    conflicts.push({p:path.slice(),path:path.join('/'),label:label||path[path.length-1]||'',field:path[path.length-1]||'',mine:a,theirs:t});
    return a;
  };
  const plan=m(base,mine,theirs,[],'');
  return {plan,conflicts};
}
const api={merge3};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else g.PlanMerge=api;
})(typeof window!=='undefined'?window:globalThis);
