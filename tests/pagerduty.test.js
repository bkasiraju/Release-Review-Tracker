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
test('parses an MQ Warden AIOps alert', () => {
  const a = parseAlert({ ts: '1794113637.063459', reply_count: 3, text: ":large_green_circle: *<https://salesforce.pagerduty.com/incidents/Q2GR7CV8X9SJGU|(Warden AIOps) Detected stuck MQ router updater job on pod NA223. Remediation action: Restart app host 'na223-app2-36-ia7.ops.sfdc.net'>*\n*Urgency:* High\n*Service:* <https://x|GUS: Message Queue Incident Escalation>" }, { id: 'C025AEPQJQ1' });
  assert.equal(a.kind, 'Remediation'); assert.equal(a.scope, 'NA223'); assert.match(a.actions, /^Restart app host/); assert.equal(a.name, '(Warden AIOps) Detected stuck MQ router updater job on pod NA223.');
  const l = parseAlert({ ts: '1.1', text: '*<https://salesforce.pagerduty.com/incidents/Q2X88P5RG0U2D2|(Warden AIOps) MQ latency detected on NA236 for MQ_SYNTHETIC_T1>*' }, { id: 'C025AEPQJQ1' });
  assert.equal(l.kind, 'Latency'); assert.equal(l.scope, 'NA236');
});
