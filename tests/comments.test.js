const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseComments, mergeComments} = require('../backend/comments');

test('legacy and inline headings, narrative mentions, repeated months and explicit years', () => {
  const p = parseComments('Context\n[Oct update]: Shipped in September.\nMid Oct Update:\nMore\nSept Update\nDone\nOctober 2025 Update:\nOld', 2026);
  assert.equal(p.months['2026-10'], 'Shipped in September.\n\nMore');
  assert.equal(p.months['2025-10'], 'Old');
  assert.equal(p.unassigned, 'Context');
  assert.deepEqual(p.inferred, ['2026-09','2026-10']);
});
test('replace one month, preserve original and other months, idempotent', () => {
  const raw = 'Context\nSeptember 2026 Update:\nKeep\nOct update:\nOld';
  const out = mergeComments(raw, 2026, {'2026-10':'Changed\nNext'});
  assert.ok(out.startsWith('Context\nSeptember 2026 Update:\nKeep\n'));
  assert.equal(parseComments(out, 2026).months['2026-10'], 'Changed\nNext');
  assert.equal(mergeComments(out, 2026, {'2026-10':'Changed\nNext'}), out);
});
test('rich text keeps links and wrappers while escaping edits', () => {
  const raw='<div><p>Context &amp; notes</p><p><b>Sept Update</b></p><p>Keep <a href="https://example.com">link</a></p><p><b>Oct update:</b></p><p>Old</p></div>';
  const out=mergeComments(raw,2026,{'2026-10':'New <script>\nNext'});
  assert.ok(out.includes('<p>Keep <a href="https://example.com">link</a></p>'));
  assert.ok(out.includes('Context &amp; notes'));
  assert.ok(!out.includes('<script>'));
  assert.equal(parseComments(out,2026).months['2026-10'],'New <script>\nNext');
  assert.equal(mergeComments(out,2026,{'2026-10':'New <script>\nNext'}),out);
});
test('new month, clear month and merge repeated sections without duplication', () => {
  let out=mergeComments('Unassigned',2026,{'2026-11':'Ready'});
  assert.equal(parseComments(out,2026).unassigned,'Unassigned');
  assert.equal(parseComments(mergeComments(out,2026,{'2026-11':''}),2026).months['2026-11'],'');
  out=mergeComments('Oct Update\nA\nMid Oct Update\nB\nSept Update\nC',2026,{'2026-10':'Together'});
  assert.equal(parseComments(out,2026).months['2026-10'],'Together');
  assert.equal(parseComments(out,2026).months['2026-09'],'C');
});
test('cross-year undated sections are flagged',()=>{
  assert.equal(parseComments('Dec Update\nEnd\nJan Update\nStart',2026).yearAmbiguous,true);
});

test('bracketed monthly headings accept engineer text immediately after the bracket',()=>{
 const raw='Design and validation are in progress.\n\n[Oct Update] Rollout is deferred; validation continues.\n\n[Sept Update] Design and integration are complete.';
 const p=parseComments(raw,2026);assert.equal(p.months['2026-10'],'Rollout is deferred; validation continues.');assert.equal(p.months['2026-09'],'Design and integration are complete.');assert.equal(p.unassigned,'Design and validation are in progress.');assert.equal(p.months['2026-11'],undefined);
 const merged=mergeComments(raw,2026,{'2026-10':'Rollout validation completed.'});assert.equal(parseComments(merged,2026).months['2026-09'],p.months['2026-09']);assert.equal(parseComments(merged,2026).unassigned,p.unassigned);assert.ok(merged.includes('[Sept Update] Design and integration are complete.'));assert.equal(mergeComments(raw,2026,{'2026-10':p.months['2026-10']}),raw);
 const rich='<p>Preserve this introduction.</p><p><b>[October 2026 Update]</b> Release validation is complete.</p><p>[Sept Update] Earlier delivery.</p>';const richParsed=parseComments(rich,2026);assert.equal(richParsed.months['2026-10'],'Release validation is complete.');const richMerged=mergeComments(rich,2026,{'2026-10':'Validated release.'});assert.equal(parseComments(richMerged,2026).months['2026-09'],richParsed.months['2026-09']);assert.ok(richMerged.includes('<p>[Sept Update] Earlier delivery.</p>'));
});

test('generalized month headings support symbols, numeric years and rich text without absorbing narrative',()=>{
 for(const h of ['[Oct Updates]','#Oct Updates','October Updates','[10-2026 Updates]','10/2026 Updates','2026-10 Updates','## October-2026 Update','**Oct-2026 Updates**','(Oct Updates)','• October Updates','_October Updates_']){
  const p=parseComments(h+'\nEngineer update.',2026);assert.equal(p.months['2026-10'],'Engineer update.',h);
 }
 for(const raw of ['[Oct Updates] Delivered.','#Oct Updates: Delivered.','[10-2026 Updates] Delivered.','2026/10 Updates — Delivered.','**Oct Updates** Delivered.'])assert.equal(parseComments(raw,2026).months['2026-10'],'Delivered.',raw);
 const narrative='Planning targets October with validation in November.\nOctober Updates were reviewed with the team.\n2026-10-15\nContext remains unchanged.';assert.deepEqual(parseComments(narrative,2026).months,{});assert.equal(parseComments(narrative,2026).unassigned,narrative);
 const raw='Keep preamble.\n[10-2026 Updates] First.\n#Sept Updates\nEarlier.\n## November 2026 Updates\nNewest.';const out=mergeComments(raw,2026,{'2026-10':'Changed.'});const p=parseComments(out,2026);assert.equal(p.months['2026-10'],'Changed.');assert.equal(p.months['2026-09'],'Earlier.');assert.equal(p.months['2026-11'],'Newest.');assert.equal(p.unassigned,'Keep preamble.');
 const rich='<div><strong>#Oct Updates</strong></div><div>Engineer wording.</div><p>[09-2026 Updates] Prior wording.</p>';const rp=parseComments(rich,2026);assert.equal(rp.months['2026-10'],'Engineer wording.');assert.equal(rp.months['2026-09'],'Prior wording.');
});

test('engineer comment/note/report headings map CRLF updates to months without rewriting content',()=>{
 const raw='November comments - \r\nReview is in progress.\r\nUpcoming implementation -\r\n1. Stop routing to slow brokers.\r\n\r\n================================================\r\n\r\nSeptember comments -\r\nDesign approach finalized.\r\nNext: validate internally.';
 const out=parseComments(raw,2026);assert.equal(out.months['2026-11'],'Review is in progress.\r\nUpcoming implementation -\r\n1. Stop routing to slow brokers.');assert.equal(out.months['2026-09'],'Design approach finalized.\r\nNext: validate internally.');assert.equal(out.unassigned,'');
 for(const label of ['[Oct Comments]','# October notes:','October 2026 report -','[10-2026 comments]','2026-10 Notes:','October health comments:','October comments -'])assert.equal(parseComments(label+'\nEngineer text unchanged.',2026).months['2026-10'],'Engineer text unchanged.',label);
});
test('older undated comments stay separate and survive replacement of a dated month',()=>{
 const raw='General context.\nNovember comments -\nCurrent review is in progress.\n================================\nOlder comments -\nDesign was discussed earlier.\nSeptember comments -\nApproach finalized.';
 const parsed=parseComments(raw,2026);assert.equal(parsed.months['2026-11'],'Current review is in progress.');assert.match(parsed.unassigned,/General context/);assert.match(parsed.unassigned,/Older comments -\nDesign was discussed earlier/);assert.ok(!parsed.months['2026-11'].includes('Design was discussed'));
 const merged=mergeComments(raw,2026,{'2026-11':'Current implementation is ready for review.'});assert.match(merged,/Older comments -\nDesign was discussed earlier/);assert.equal(parseComments(merged,2026).months['2026-09'],'Approach finalized.');assert.equal(mergeComments(raw,2026,{'2026-11':parsed.months['2026-11']}),raw);
});
test('new heading labels preserve rich-text undated history and reject ordinary prose or full dates',()=>{
 const raw='<p><b>[November comments]</b></p><p>Current review.</p><p>Older notes:</p><p><a href="https://example.test/design">Prior design.</a></p><p>[September comments]</p><p>Design approved.</p>';
 const parsed=parseComments(raw,2026);assert.equal(parsed.months['2026-11'],'Current review.');assert.match(parsed.unassigned,/Prior design/);const changed=mergeComments(raw,2026,{'2026-11':'Review completed.'});assert.ok(changed.includes('<a href="https://example.test/design">Prior design.</a>'));assert.equal(parseComments(changed,2026).months['2026-09'],'Design approved.');
 for(const line of ['November comments were reviewed with the team.','November 9, 2026','2026-11-09','November commentary continues.'])assert.deepEqual(parseComments(line,2026).months,{},line);
});
