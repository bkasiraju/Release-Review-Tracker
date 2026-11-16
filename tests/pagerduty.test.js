'use strict';
const test = require('node:test'), assert = require('node:assert');
const { __test: { parseAlert } } = require('../backend/pagerduty');
const ch = { id: 'C09ALBDFVCY' };
test('parses a PagerDuty availability alert', () => {
  const a = parseAlert({ ts: '1794417997.890939', reply_count: 9, text: ':large_green_circle: *<https://salesforce.pagerduty.com/incidents/Q2TCNC0PCGIIJH|:red_circle:  MAPS Availability Alert  Critical - :p1-new:  scope - gcp.gcp-prod0-useast4.core1  What does this mean Availability Drop>*\n*Urgency:* High\n*Service:* <https://x/y|GUS: MAPS Incident Escalation>\n*Triggered via:* <https://monitoring.internal.salesforce.com/argus/#/alerts/1|Argus Alert>\n:memo: Open Post-Incident Review button' }, ch);
  assert.equal(a.id, 'Q2TCNC0PCGIIJH'); assert.equal(a.kind, 'Availability'); assert.equal(a.severity, 'P1'); assert.equal(a.scope, 'gcp.gcp-prod0-useast4.core1');
  assert.equal(a.urgency, 'High'); assert.equal(a.replies, 9); assert.ok(a.reviewStarted); assert.match(a.argus, /argus/);
  assert.equal(a.slack, 'https://salesforce.enterprise.slack.com/archives/C09ALBDFVCY/p1794417997890939');
});
test('ignores non-incident messages', () => assert.equal(parseAlert({ ts: '1.1', text: 'has joined the channel' }, ch), null));
