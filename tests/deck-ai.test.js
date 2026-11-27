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

test('merge fills empty Accomplishments from done work items but keeps AI lines that were confirmed',()=>{
  const {aiMerge}=ctx.EpicDeck||ctx.window.EpicDeck;
  const s=aiMerge(e,{accomplishments:[],inProgress:[],learnings:[{text:'L',quote:'',refs:[]}],planForward:[]});
  assert.equal(s.accomplishments.length,1);assert.equal(s.learnings.length,1);assert.ok(s.note);
  assert.equal(aiMerge(e,{accomplishments:[{text:'A'}],inProgress:[{text:'B'}],learnings:[],planForward:[]}).accomplishments[0].text,'A');
});

test('base summary needs no AI: facts, done and active work items, newest engineer update; AI lines only override when confirmed',()=>{
  const {aiBase,aiView}=ctx.EpicDeck||ctx.window.EpicDeck;
  const e3={comments:'November Update:\nOutcome: Dynamic slot allocation is in design review.\nNext: finalise the allocation algorithm.',workItems:[{id:'W-1',subject:'WS: Slot design',status:'Closed'},{id:'W-2',subject:'Allocator',status:'In Progress'},{id:'W-3',subject:'x',status:'Never'}],progress:{done:3,total:5}};
  const b=aiBase(e3);
  assert.equal(b.facts,'3 of 5 points done · 1 of 2 work items done · 1 in progress');
  assert.equal(b.accomplishments[0].text,'Slot design');assert.equal(b.inProgress[0].refs[0],'W-2');
  assert.equal(b.engineer.length,2);
  const v=aiView(e3,{accomplishments:[],inProgress:[{text:'AI line'}],learnings:[{text:'L'}],planForward:[]});
  assert.equal(v.accomplishments[0].text,'Slot design');assert.equal(v.inProgress[0].text,'AI line');assert.equal(v.learnings.length,1);
  assert.equal(v.engineer.length,2);assert.equal(aiView(e3,{accomplishments:[{text:'A'}],inProgress:[],learnings:[],planForward:[]}).engineer.length,0);
});

test('headline is kept only when its numbers and outcome words come from the evidence',()=>{
  const ok=aiParse(JSON.stringify({headline:'Watch: 3 of 5 points done; the Qpid upgrade is in PDV validation.',accomplishments:[]}),e,ev+' 3 of 5');
  assert.equal(ok.headline,'Watch: 3 of 5 points done; the Qpid upgrade is in PDV validation.');
  assert.throws(()=>aiParse(JSON.stringify({headline:'On track: 90% done and resolved performance regression.',accomplishments:[]}),e,ev));
});

test('planned outcome is kept only when quoted or drawn from the goal; base shows goal and points left',()=>{
  const {aiBase}=ctx.EpicDeck||ctx.window.EpicDeck;
  const eg={...e,goal:'Complete the FIPS broker build for GovCloud'};
  const r=aiParse(JSON.stringify({planned:[{text:'Complete the FIPS broker build for GovCloud now',quote:''},{text:'Cut cost by half',quote:''}],accomplishments:[{text:'Delivered the FIPS broker build',workItems:['W-2'],quote:''}]}),eg,JSON.stringify(eg)+' 10.1.1');
  assert.equal(JSON.stringify(r.planned.map(x=>x.text)),JSON.stringify(['Complete the FIPS broker build for GovCloud now']));
  const b=aiBase({...eg,progress:{done:3,total:5}});
  assert.equal(b.planned[0].text,eg.goal);assert.equal(b.gapsBase.length,0);
});
