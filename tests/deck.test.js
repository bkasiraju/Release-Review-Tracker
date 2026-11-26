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
