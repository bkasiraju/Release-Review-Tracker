'use strict';
// Parallel I/O across epics; one active task per epic prevents self-overwrites.
(function(root){
 class EpicQueue{
  constructor(limit=4){this.limit=limit;this.pending=[];this.active=new Set();}
  add(key,run,priority=false){return new Promise((resolve,reject)=>{const task={key,run,resolve,reject};priority?this.pending.unshift(task):this.pending.push(task);this.drain();});}
  drain(){
   while(this.active.size<this.limit){const i=this.pending.findIndex(t=>!this.active.has(t.key));if(i<0)break;const t=this.pending.splice(i,1)[0];this.active.add(t.key);
    Promise.resolve().then(t.run).then(t.resolve,t.reject).finally(()=>{this.active.delete(t.key);this.drain();});
   }
  }
 }
 if(typeof module==='object'&&module.exports)module.exports={EpicQueue};else root.EpicQueue=EpicQueue;
})(typeof globalThis!=='undefined'?globalThis:window);
