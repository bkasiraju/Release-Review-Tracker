const {test}=require('node:test'),assert=require('node:assert/strict');const {formatComment,displayText}=require('../public/comments-view');
const normalize=s=>s.replace(/\s+/g,' ').trim();const text=html=>html.replace(/<[^>]*>/g,'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
test('comment formatting preserves source wording and safely emphasizes only existing labels',()=>{
 for(const source of ['We have created a plan. Once finalized, it will be shared.','Done: Legal review complete.\nIn progress: Sign-off.','Next steps:\n- Validate readiness\n• Share the plan','Line one.\\n\\nCompleted: Delivery review.','Path C:\\newfolder remains unchanged.','Done: <img src=x onerror=bad> & "quoted" text.',('Engineer delivery details remain unchanged. '.repeat(20))]){const html=formatComment(source);assert.equal(normalize(text(html)),normalize(displayText(source)));assert.equal(typeof source,'string');assert.ok(!html.includes('<img'));}
 assert.match(formatComment('Done: Legal review complete.'),/<strong class="comment-label">Done:<\/strong>/);assert.doesNotMatch(formatComment('Delivery progress is unchanged.'),/<strong/);assert.match(formatComment('First.\n\nSecond.'),/comment-gap/);
});

test('unmapped comments fall back only when no month is recognized, without modifying data',()=>{
 const {monthFallback}=require('../public/comments-view');const e={comments:'Original text.',parsed:{months:{},unassigned:'Original text.'}};const before=JSON.stringify(e);assert.equal(monthFallback(e),'Original text.');assert.equal(JSON.stringify(e),before);assert.equal(monthFallback({parsed:{months:{'2026-10':'Known update.'},unassigned:'Other notes.'}}),'');assert.equal(monthFallback({parsed:{months:{},unassigned:'  '}}),'');
});

test('generic preamble leads only the review month as undated display context',()=>{
 const {generalUpdate}=require('../public/comments-view');const e={parsed:{unassigned:'Design completed; validation continues.',months:{'2026-10':'Earlier delivery.'}}};const before=JSON.stringify(e);assert.equal(generalUpdate(e,'2026-11','2026-11'),e.parsed.unassigned);assert.equal(generalUpdate(e,'2026-10','2026-11'),'');assert.equal(generalUpdate({parsed:{unassigned:'All undated.',months:{}}},'2026-11','2026-11'),'');assert.equal(JSON.stringify(e),before);
});
