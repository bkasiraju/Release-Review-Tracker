'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('zlib');
const d=require('../backend/slack-direct');
const TOKEN='xoxb-'+'1'.repeat(60);
test('reads the bot token from a chunked secret document, newest first, ignoring bad ones',()=>{
  const json=JSON.stringify({slackBotToken:TOKEN}),gz='gz:'+zlib.gzipSync(Buffer.from(json)).toString('base64');
  const mid=Math.floor(gz.length/2),recs=[{Description:`cv:s1:0:2:${gz.slice(0,mid)}`,CreatedDate:'2026-01-02'},{Description:`cv:s1:1:2:${gz.slice(mid)}`,CreatedDate:'2026-01-02'},{Description:'not json',CreatedDate:'2026-01-03'}];
  assert.equal(d.tokenFrom(d.stitch(recs,'cv:',r=>r.Description)),TOKEN);
});
test('rejects malformed or non-bot tokens and incomplete chunk sets',()=>{
  assert.equal(d.tokenFrom([{json:JSON.stringify({slackBotToken:'xoxp-'+'1'.repeat(60)})}]),null);
  assert.equal(d.tokenFrom([{json:JSON.stringify({slackBotToken:null})}]),null);
  assert.deepEqual(d.stitch([{Description:'cv:s:0:2:abc',CreatedDate:'x'}],'cv:',r=>r.Description),[]);
});
