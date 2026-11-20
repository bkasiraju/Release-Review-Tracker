'use strict';
const test = require('node:test');
const assert = require('node:assert');
const c = require('../backend/teams.config');

test('short names, themes and tags match the previous behaviour', () => {
  assert.strictEqual(c.shortOf('Message Queue'), 'MQ');
  assert.strictEqual(c.shortOf('Managed Async Processing Service (MAPS)'), 'MAPS');
  assert.strictEqual(c.themeOf('VegaCache FACE'), 'VC-FACE');
  assert.strictEqual(c.themeOf('VegaCache Core'), 'VC');
  assert.strictEqual(c.themeOf('VegaStore'), 'VS');
  assert.strictEqual(c.themeOf('Caching Services'), 'VC');
  assert.strictEqual(c.tagOf('Message Queue'), 'Architecture Message Queue');
  assert.strictEqual(c.tagOf('Caching Services'), 'CaaS: Cache As A Service');
  assert.strictEqual(c.tagOf('VegaStore'), '');
  assert.strictEqual(c.themeOf('Unknown Team'), '');
});

test('groups and the SOQL filter derive from the entries', () => {
  assert.strictEqual(c.entryFor('VegaCache Core').key, 'vegacache');
  assert.strictEqual(c.entryByGroup('Message Queue Team').key, 'mq');
  const f = c.teamFilter('Scrum_Team__r.');
  assert.match(f, /Scrum_Team__r\.Active__c = true/);
  assert.match(f, /Scrum_Team__r\.Name LIKE 'VegaCache%'/);
  assert.match(f, /Scrum_Team__r\.Name = 'Message Queue'/);
  const keys = c.TEAMS.map(e => e.key);
  assert.strictEqual(new Set(keys).size, keys.length);
});
