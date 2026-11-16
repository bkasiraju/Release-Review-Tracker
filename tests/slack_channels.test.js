'use strict';
const test = require('node:test'), assert = require('node:assert');
const { parseChannel } = require('../backend/slack-channels');
const post = require('../backend/post');
test('parses links and ids', () => {
  assert.equal(parseChannel('https://salesforce.enterprise.slack.com/archives/C09ALBDFVCY'), 'C09ALBDFVCY');
  assert.equal(parseChannel(' c09albdfvcy '), 'C09ALBDFVCY');
  assert.equal(parseChannel(''), null);
  assert.throws(() => parseChannel('not a channel'));
});
test('send posts to the configured channel with a mention', async () => {
  const sent = [], T = '0Z1000000000001';
  const sf = { userId: '005000000000001', query: async q => ({ records: q.includes('Email') ? [{ Id: '005000000000002', Name: 'Pat Doe', Email: 'p@x.com' }] : [{ Name: 'Me' }] }) };
  const slack = { resolveIdentity: async () => ({ user: { id: 'U0ABCDEFGH', team_id: 'T0ABCDEFGH' } }), postMessage: async m => { sent.push(m); return { ok: true }; } };
  const store = { get: async () => ({ channels: { [T]: { id: 'C09ALBDFVCY', name: '#maps' } } }) };
  const r = await post.sendSlack(sf, slack, store, { userId: '005000000000002', teamId: T, text: 'Hi Pat' });
  assert.equal(sent[0].channel, 'C09ALBDFVCY'); assert.match(sent[0].text, /^<@U0ABCDEFGH>\nHi Pat/); assert.equal(r.channel, '#maps');
  await assert.rejects(post.sendSlack(sf, slack, { get: async () => null }, { userId: '005000000000002', teamId: T, text: 'x' }), /No Slack channel/);
});
