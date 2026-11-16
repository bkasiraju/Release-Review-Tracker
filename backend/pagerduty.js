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
    replies: m.reply_count || m.replyCount || (Array.isArray(m.replies) ? m.replies.length : 0) || 0, at: new Date(Number(ts.split('.')[0]) * 1000).toISOString(),
    slack: `${WORKSPACE}/archives/${channel.id}/p${ts.replace('.', '')}`
  };
}

/** Read through the GUS MIYO platform helper (channel declared in manifest.json → slack.channels, bot invited); fall back to the shared bot token. */
async function readChannel(sf, slack, ch, oldest) {
  const asList = r => Array.isArray(r) ? r : (r && Array.isArray(r.messages)) ? r.messages : null;
  let miyoErr = null;
  if (slack && typeof slack.getMessages === 'function') {
    try { const l = asList(await slack.getMessages({ channel: ch.id, limit: 200, includeThreads: false })); if (l) return l.filter(m => Number(m.ts) >= oldest); }
    catch (e) { miyoErr = e; }
  }
  if (slack && typeof slack.apiCall === 'function') {
    try { const r = await slack.apiCall('conversations.history', { channel: ch.id, oldest: String(oldest), limit: 200 }); if (r && r.ok === false) throw new Error(r.error || 'slack_api_failed'); const l = asList(r); if (l) return l; }
    catch (e) { miyoErr = miyoErr || e; }
  }
  try { return await direct.history(sf, ch.id, oldest); }
  catch (e) {
    if (miyoErr) throw new Error(`GUS MIYO could not read ${ch.name}: ${String(miyoErr.message || miyoErr).slice(0, 160)}. Make sure @GUS MIYO is invited to the channel.`);
    throw new Error(slack ? `GUS MIYO could not read ${ch.name}. Make sure @GUS MIYO is invited to the channel.` : 'The platform Slack helper is not available in this runtime.');
  }
}

async function getAlerts(sf, slack, teamId) {
  if (!SF_ID.test(String(teamId || ''))) throw new Error('Invalid team.');
  const [t] = (await sf.query(`SELECT Id, Name FROM ADM_Scrum_Team__c WHERE Id = '${teamId}' LIMIT 1`)).records || [];
  const ch = t && CHANNELS.find(c => c.like.test(t.Name));
  if (!ch) return { configured: false, alerts: [] };
  const hit = cache.get(ch.id);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const msgs = await readChannel(sf, slack, ch, Math.floor(Date.now() / 1000) - DAYS * 86400);
  const alerts = msgs.map(m => parseAlert(m, ch)).filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
  const data = { configured: true, channel: { id: ch.id, name: ch.name, url: `${WORKSPACE}/archives/${ch.id}` }, days: DAYS, alerts, fetchedAt: Date.now() };
  cache.set(ch.id, { at: Date.now(), data });
  return data;
}
module.exports = { getAlerts, __test: { parseAlert } };
