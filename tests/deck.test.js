const test=require('node:test'),assert=require('node:assert');
require('../public/deck.js');
const {build,flagsFor}=globalThis.EpicDeck;
const D=mode=>({team:'T',release:'R',asOf:'2026-11-25',gusUrl:'https://g/',mode,epics:[
  {id:'1',gusId:'a3Q1',name:'Done <b>',health:'On Track',owner:'A',points:3,theme:'X',project:'P',goal:'g',start:'2026-10-01',end:'2026-11-01',workItems:[{id:'W-1',name:'s',subject:'s',status:'Completed',assignee:'A',days:3}]},
  {id:'2',name:'Empty',health:'',owner:'',points:0,workItems:[]}]});
test('deck: one slide per epic plus title, glance, index and wrap-up',()=>{
  const h=build(D()).html;assert.equal((h.match(/<section class="slide/g)||[]).length,2+2+2);
  assert.match(h,/Epic 2 of 2/);assert.ok(!h.includes('Done <b>'),'epic names are escaped');
});
test('deck: monthly view flags an overdue epic and an epic with no workstreams',()=>{
  const e=D('review').epics;
  assert.ok(flagsFor(e[1],'review','2026-11-25').some(f=>!f.ok&&/No workstreams/.test(f.text)));
  const late=flagsFor({...e[0],workItems:[{...e[0].workItems[0],status:'In Progress'}]},'review','2026-11-25');
  assert.ok(late.some(f=>f.crit&&/has passed/.test(f.text)));
  assert.ok(flagsFor(e[0],'review','2026-11-25').every(f=>f.ok||/estimate|owner/.test(f.text)===false));
});
test('deck: presenter notes and asks render, escaped, and the asks slide only appears when used',()=>{
  const d=D();assert.ok(!build(d).html.includes('Asks &amp; Decisions'));
  d.notes={'1':'Ship <it>'};d.asks=[{type:'Decision',q:'Freeze?',d:'A or B',who:'Leads'}];
  const h=build(d).html;assert.match(h,/Ship &lt;it&gt;/);assert.match(h,/Asks &amp; Decisions Needed/);assert.match(h,/ask decision/);
});
test('deck: Slack summary counts health, links epics and lists asks',()=>{
  const d=D();d.asks=[{type:'Ask',q:'More heads',who:'Leads'}];
  const t=globalThis.EpicDeck.summaryText(d);
  assert.match(t,/2 epics: 1 on track, 0 watch, 0 at risk, 1 not set/);
  assert.match(t,/ADM_Epic__c\/a3Q1\/view/);assert.match(t,/Ask: More heads — Leads/);
});
test('sendDeckSlack: needs an explicit channel, never defaults, and posts the escaped text',async()=>{
  const post=require('../backend/post'),sent=[],slack={postMessage:async m=>{sent.push(m);return {ok:true};}};
  const store={get:async()=>({channels:{T1:{id:'C0AAAAAAA1',name:'#team'}}})},sf={};
  await assert.rejects(()=>post.sendDeckSlack(sf,slack,store,{text:'hi'}),/channel/i);
  await assert.rejects(()=>post.sendDeckSlack(sf,slack,store,{channel:'nope',text:'hi'}),/channel/i);
  assert.equal(sent.length,0);
  const r=await post.sendDeckSlack(sf,slack,store,{channel:'https://x/archives/C0BBBBBBB2',text:'a <b> [Epic](https://g/e)'});
  assert.equal(sent[0].channel,'C0BBBBBBB2');assert.match(sent[0].text,/a &lt;b&gt; <https:\/\/g\/e\|Epic>/);assert.equal(r.ok,true);
});
test('deck: every epic is reachable from the paginated index and jump targets are right',()=>{
  const e=Array.from({length:19},(_,i)=>({id:''+i,name:'E'+i,health:'',owner:'',points:1,workItems:[]}));
  const h=build({team:'T',release:'R',asOf:'2026-11-25',gusUrl:'https://g/',mode:'planning',epics:e}).html;
  assert.equal((h.match(/data-goto="/g)||[]).length,19);
  assert.match(h,/data-goto="4"/);assert.match(h,/data-goto="22"/);assert.match(h,/Epics \(2 of 2\)/);
  assert.equal((h.match(/<section class="slide/g)||[]).length,2+2+19+1);
});
test('deck: monthly comments split into Outcome and the two latest review months',()=>{
  const t='------\nOctober Update:\nOutcome/Progress: A\nBlockers: x\n------\nNovember Update:\nOutcome/Progress: B &amp; C <script>x</script>\n\nSeptember 2026 Update:\nold';
  const u=globalThis.EpicDeck.parseUpdates(t,'2026-11-26');
  assert.deepEqual(u.months.map(m=>m.label),['November 2026','October 2026','September 2026']);
  assert.equal(u.outcome,'B & C x');
  assert.equal(globalThis.EpicDeck.parseUpdates('Outcome: Ship it\n\nNovember Update:\nx','2026-11-26').outcome,'Ship it');
  const e=[{id:'1',name:'E',health:'',owner:'',points:1,comments:t,progress:{pct:1,done:0,wip:0,total:1,unit:'points'},workItems:[]}];
  const h=build({team:'T',release:'R',asOf:'2026-11-26',gusUrl:'https://g/',mode:'review',epics:e}).html;
  assert.match(h,/November 2026 review/);assert.match(h,/\+ 1 earlier monthly update/);assert.ok(!h.includes('<script>x'),'markup is stripped and escaped');
});
