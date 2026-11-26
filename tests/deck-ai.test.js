'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const ctx={window:{},console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../public/deck.js','utf8'),ctx);
const {aiParse}=ctx.EpicDeck||ctx.window.EpicDeck;
const e={comments:'November Update: Qpid 10.1.1 upgrade is in PDV validation, not yet deployed. FIPS broker build completed for GovCloud.',pathToGreen:'',workItems:[{id:'W-1',subject:'Upgrade',status:'In Progress'},{id:'W-2',subject:'FIPS',status:'Closed'},{id:'W-3',subject:'Cancelled',status:'Never'}]};
const ev=JSON.stringify(e)+' 10.1.1';
const run=o=>aiParse(JSON.stringify(o),e,ev);
test('accomplishments need a done work item or a stated completion',()=>{
  const r=run({accomplishments:[{text:'Upgraded the broker fleet-wide',workItems:['W-1'],quote:'upgrade is in PDV validation'},{text:'Delivered the FIPS broker build',workItems:['W-2'],quote:''},{text:'Completed FIPS broker build for GovCloud',workItems:[],quote:'FIPS broker build completed for GovCloud'},{text:'Delivered cancelled work',workItems:['W-3'],quote:''}],inProgress:[{text:'Validating the 10.1.1 upgrade in PDV',workItems:['W-1'],quote:''},{text:'Upgrade completed',workItems:['W-1'],quote:''}],learnings:[{text:'Invented lesson',quote:'not in the updates at all'}],planForward:[]});
  assert.equal(JSON.stringify(r.accomplishments.map(x=>x.text)),JSON.stringify(['Delivered the FIPS broker build','Completed FIPS broker build for GovCloud']));
  assert.equal(JSON.stringify(r.inProgress.map(x=>x.text)),JSON.stringify(['Validating the 10.1.1 upgrade in PDV']));
  assert.equal(r.learnings.length,0);
});
test('deployment wording needs a quoted statement; unknown numbers are dropped; empty result throws',()=>{
  assert.throws(()=>run({accomplishments:[{text:'Deployed the FIPS build',workItems:['W-2'],quote:''},{text:'Cut latency 40%',workItems:['W-2'],quote:''}]}));
});
