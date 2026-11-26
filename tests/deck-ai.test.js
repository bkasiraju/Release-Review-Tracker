'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const ctx={window:{},console};ctx.globalThis=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../public/deck.js','utf8'),ctx);
const {aiParse}=ctx.EpicDeck||ctx.window.EpicDeck;
const e={comments:'November Update: Qpid 10.1.1 upgrade is in PDV validation, not yet deployed. FIPS broker build completed for GovCloud.',pathToGreen:'',workItems:[{id:'W-1',subject:'Upgrade',status:'In Progress'},{id:'W-2',subject:'FIPS broker build',status:'Closed'},{id:'W-3',subject:'Cancelled',status:'Never'}]};
const ev=JSON.stringify(e)+' 10.1.1';
const run=o=>aiParse(JSON.stringify(o),e,ev);
test('accomplishments need a done work item or a stated completion',()=>{
  const r=run({accomplishments:[{text:'Upgraded the broker fleet-wide',workItems:['W-1'],quote:'upgrade is in PDV validation'},{text:'Delivered the FIPS broker build',workItems:['W-2'],quote:''},{text:'Completed FIPS broker build for GovCloud',workItems:[],quote:'FIPS broker build completed for GovCloud'},{text:'Delivered cancelled work',workItems:['W-3'],quote:''}],inProgress:[{text:'Upgrade is in PDV validation',workItems:['W-1'],quote:'upgrade is in PDV validation'},{text:'Upgrade completed',workItems:['W-1'],quote:''}],learnings:[{text:'Invented lesson',quote:'not in the updates at all'}],planForward:[]});
  assert.equal(JSON.stringify(r.accomplishments.map(x=>x.text)),JSON.stringify(['Delivered the FIPS broker build','Completed FIPS broker build for GovCloud']));
  assert.equal(JSON.stringify(r.inProgress.map(x=>x.text)),JSON.stringify(['Upgrade is in PDV validation']));
  assert.equal(r.learnings.length,0);
});
test('deployment wording needs a quoted statement; unknown numbers are dropped; empty result throws',()=>{
  assert.throws(()=>run({accomplishments:[{text:'Deployed the FIPS build',workItems:['W-2'],quote:''},{text:'Cut latency 40%',workItems:['W-2'],quote:''}]}));
});

test('lines that add outcomes the engineer did not state are rejected (upgrade / resolved / faster releases)',()=>{
  const e2={comments:'Developed an automated mechanism to uplift the Qpid Broker version. Used this automation to build and release 10.1.1-sfdc.1 and successfully deployed it across the internal fleet.',pathToGreen:'',workItems:[]};
  const ev2=JSON.stringify(e2);
  const q='successfully deployed it across the internal fleet';
  const r=aiParse(JSON.stringify({accomplishments:[
    {text:'Upgraded Qpid Broker from v7.0.9 to v10.1.1, resolving performance regression',workItems:[],quote:q},
    {text:'Automated version uplift, enabling faster releases and eliminating manual patching',workItems:[],quote:'Developed an automated mechanism to uplift the Qpid Broker version'},
    {text:'Deployed it across the internal fleet',workItems:[],quote:q},
    {text:'Developed an automated mechanism to uplift the Qpid Broker version',workItems:[],quote:'Developed an automated mechanism to uplift the Qpid Broker version'}]}),e2,ev2);
  assert.equal(JSON.stringify(r.accomplishments.map(x=>x.text)),JSON.stringify(['Deployed it across the internal fleet']));
});

test('fallback lists only done and active work items as the work item subjects, and throws with nothing to say',()=>{
  const {aiFallback}=ctx.EpicDeck||ctx.window.EpicDeck;
  const r=aiFallback(e);
  assert.equal(JSON.stringify(r.accomplishments.map(x=>[x.text,x.refs[0]])),JSON.stringify([['FIPS broker build','W-2']]));
  assert.equal(JSON.stringify(r.inProgress.map(x=>x.text)),JSON.stringify(['Upgrade']));
  assert.ok(r.note);
  assert.throws(()=>aiFallback({workItems:[{id:'W-9',subject:'x',status:'New'}]}));
});
