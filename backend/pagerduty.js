'use strict';
/**
 * PagerDuty alerts for the Trust Champion page, read from the team's PagerDuty Slack channel (the PagerDuty bot's posts).
 * Read-only. Needs the shared Slack bot to be a member of the channel (see slack-direct.js).
 */
const direct = require('./slack-direct');
const SF_ID = /^[a-zA-Z0-9]{15,18}$/;
const WORKSPACE = 'https://salesforce.enterprise.slack.com';
const CHANNELS = [{ like: /^Managed Async Processing/i, id: 'C09ALBDFVCY', name: '#maps-pagerduty' }];
const DAYS = 45, TTL = 2 * 60e3;
const cache = new Map();

const emoji = s => s.replace(/:[a-z0-9_+-]+:/gi, ' ');
const unesc = s => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const clean = s => unesc(emoji(s)).replace(/\s+/g, ' ').trim();
const textOf = m => [m.text, ...(m.attachments || []).map(a => [a.title, a.text, a.fallback].filter(Boolean).join('\n'))].filter(Boolean).join('\n');

/** One PagerDuty bot message -> alert, or null when it is not an incident post. */
function parseAlert(m, channel) {
  const t = textOf(m), link = /<(https:\/\/[^|>\s]*pagerduty\.com\/incidents\/([A-Z0-9]+))\|([^>]*)>/.exec(t);
  if (!link) return null;
  const field = k => { const r = new RegExp(`\\*${k}:\\*\\s*(?:<([^|>]+)\\|([^>]*)>|([^\\n]*))`).exec(t); return r ? clean(r[2] || r[3] || '') : ''; };
  const title = clean(link[3]);
  const ts = String(m.ts), sevM = /:p([0-4])-/i.exec(link[3]) || /\bP([0-4])\b/.exec(title), sev = sevM ? 'P' + sevM[1] : '';
  return {
    id: link[2], url: link[1], title: title.length > 160 ? title.slice(0, 157) + '…' : title,
    kind: /availability/i.test(title) ? 'Availability' : /DeleteMessage|latency|MS\b/i.test(title) ? 'Latency' : /RDS|Disk|CPU|Memory/i.test(title) ? 'Infrastructure' : /Sev\d|incident/i.test(title) ? 'Incident' : 'Alert',
    severity: sev,
    urgency: field('Urgency'), service: field('Service'),
    scope: (/scope\s*-\s*([\w.-]+)/i.exec(title) || [])[1] || '', client: (/Affected Client\s*-\s*([\w$.{}-]+)/i.exec(title) || [])[1] || '',
    argus: (/<(https:\/\/[^|>]*argus[^|>]*)\|/.exec(t) || [])[1] || '',
    reviewStarted: /Open Post-Incident Review/i.test(t),
    replies: m.reply_count || 0, at: new Date(Number(ts.split('.')[0]) * 1000).toISOString(),
    slack: `${WORKSPACE}/archives/${channel.id}/p${ts.replace('.', '')}`
  };
}

async function getAlerts(sf, teamId) {
  if (!SF_ID.test(String(teamId || ''))) throw new Error('Invalid team.');
  const [t] = (await sf.query(`SELECT Id, Name FROM ADM_Scrum_Team__c WHERE Id = '${teamId}' LIMIT 1`)).records || [];
  const ch = t && CHANNELS.find(c => c.like.test(t.Name));
  if (!ch) return { configured: false, alerts: [] };
  const hit = cache.get(ch.id);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const msgs = await direct.history(sf, ch.id, Math.floor(Date.now() / 1000) - DAYS * 86400);
  const alerts = msgs.map(m => parseAlert(m, ch)).filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
  const data = { configured: true, channel: { id: ch.id, name: ch.name, url: `${WORKSPACE}/archives/${ch.id}` }, days: DAYS, alerts, fetchedAt: Date.now() };
  cache.set(ch.id, { at: Date.now(), data });
  return data;
}
module.exports = { getAlerts, __test: { parseAlert } };
