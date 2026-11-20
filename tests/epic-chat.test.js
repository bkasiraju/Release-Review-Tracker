'use strict';
const test = require('node:test'), assert = require('node:assert');
const chat = require('../backend/epic-chat');
const sf = calls => ({ userId: '005000000000001', request: async o => { calls.push(o); return typeof o === 'string' ? { elements: [{ id: '0D5aaaaaaaaaaaaaaa', type: 'TextPost', createdDate: '2026-11-20T10:00:00Z', actor: { id: '005000000000001', displayName: 'Me' }, body: { messageSegments: [{ type: 'Text', text: 'yo' }] }, capabilities: { comments: { page: { total: 1, items: [{ id: '0D7aaaaaaaaaaaaaaa', user: { id: '005000000000002', name: 'Bo' }, body: { messageSegments: [{ type: 'Mention', text: '@Me', user: { id: '005000000000001' } }, { type: 'Text', text: ' re' }] } }] } } } }] } : { id: '0D5new' }; } });
test('read returns posts with their replies, oldest first', async () => {
  const r = await chat.read(sf([]), { epicId: 'a0Xaaaaaaaaaaaa' });
  assert.equal(r.posts.length, 1); assert.equal(r.posts[0].replies[0].parts[0].t, 'mention'); assert.equal(r.posts[0].mine, true);
});
test('post builds mention segments and rejects bad ids / empty text', async () => {
  const calls = []; const s = sf(calls);
  await chat.post(s, { epicId: 'a0Xaaaaaaaaaaaa', segments: [{ t: 'mention', id: '005000000000002' }, { t: 'text', v: ' hi' }] });
  assert.deepEqual(JSON.parse(calls[0].body).body.messageSegments, [{ type: 'Mention', id: '005000000000002' }, { type: 'Text', text: ' hi' }]);
  await chat.post(s, { epicId: 'a0Xaaaaaaaaaaaa', replyTo: '0D5aaaaaaaaaaaaaaa', segments: [{ t: 'text', v: 'ok' }] });
  assert.match(calls[1].url, /feed-elements\/0D5aaaaaaaaaaaaaaa\/capabilities\/comments\/items$/);
  await assert.rejects(chat.post(s, { epicId: 'a0Xaaaaaaaaaaaa', segments: [{ t: 'text', v: '  ' }] }), /Write a comment/);
  await assert.rejects(chat.post(s, { epicId: "x'; DROP", segments: [{ t: 'text', v: 'a' }] }), /Invalid/);
  await assert.rejects(chat.post(s, { epicId: 'a0Xaaaaaaaaaaaa', segments: [{ t: 'mention', id: 'bad id' }] }), /Invalid/);
});
test('without REST access the thread is read and posted through the Feed sObjects', async () => {
  const made = [];
  const s = { userId: '005000000000001', query: async q => { assert.match(q, /FROM ADM_Epic__Feed WHERE ParentId = 'a0Xaaaaaaaaaaaa'/); return { records: [{ Id: '0D5a', Body: 'hello', CreatedDate: '2026-11-20T10:00:00Z', CreatedById: '005000000000001', CreatedBy: { Name: 'Me' }, FeedComments: { records: [{ Id: '0D7a', CommentBody: 'reply', CreatedBy: { Name: 'Bo' }, CreatedById: '005000000000002' }] } }] }; }, create: async (o, f) => { made.push([o, f]); return { id: '0D5new', success: true }; } };
  const r = await chat.read(s, { epicId: 'a0Xaaaaaaaaaaaa' });
  assert.equal(r.posts[0].parts[0].v, 'hello'); assert.equal(r.posts[0].replies[0].by.name, 'Bo'); assert.equal(r.posts[0].mine, true);
  const p = await chat.post(s, { epicId: 'a0Xaaaaaaaaaaaa', segments: [{ t: 'mention', id: '005000000000002', name: 'Bo' }, { t: 'text', v: ' hi' }] });
  assert.equal(p.plain, true); assert.deepEqual(made[0], ['FeedItem', { ParentId: 'a0Xaaaaaaaaaaaa', Body: '@Bo hi', Type: 'TextPost' }]);
  await chat.post(s, { epicId: 'a0Xaaaaaaaaaaaa', replyTo: '0D5aaaaaaaaaaaaaaa', segments: [{ t: 'text', v: 'ok' }] });
  assert.deepEqual(made[1], ['FeedComment', { FeedItemId: '0D5aaaaaaaaaaaaaaa', CommentBody: 'ok' }]);
});
