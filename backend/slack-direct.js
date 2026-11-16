'use strict';
/**
 * Direct Slack DM from the dashboard through the shared Slack bot, so a nudge can be sent without copy/paste.
 *
 * The bot token is never stored in this repo or in this app's own data. It is read at runtime from the secret document the
 * OneJDK TD Migration Dashboard already maintains (`__OneJDKDashboard_RuntimeSecrets`, field `slackBotToken`, kept in the same
 * Salesforce file store), or from SLACK_BOT_TOKEN when that is set. Tokens are never logged; only their tail is.
 */
const https = require('https');
const zlib = require('zlib');
const {URLSearchParams} = require('url');
const SECRET_TITLES = ['__OneJDKDashboard_RuntimeSecrets'], FIELD = 'slackBotToken', TTL = 60e3, TIMEOUT = 10e3;
const NOTE_PARENT_FALLBACK = 'a3QEE000001nHlV2AU';
let cache = null;

const gunzip = d => { if (!d) return null; if (d.startsWith('gz:')) { try { return zlib.gunzipSync(Buffer.from(d.slice(3), 'base64')).toString('utf8'); } catch (_) { return null; } } return d; };
/** Stitch `<prefix><setId>:<i>:<n>:<piece>` chunks (newest set first) or accept a standalone JSON/gz blob. */
function stitch(records, prefix, body) {
  const out = [], sets = new Map();
  for (const r of records || []) {
    const raw = r && body(r); if (!raw) continue;
    const s = String(raw);
    if (s.startsWith(prefix)) {
      const after = s.slice(prefix.length), m = after.match(/^([^:]+):(\d+):(\d+):/); if (!m) continue;
      const bag = sets.get(m[1]) || {total: +m[3], parts: [], at: r.CreatedDate}; bag.parts[+m[2]] = after.slice(m[0].length); sets.set(m[1], bag);
    } else { const j = gunzip(s); if (j) out.push({json: j, at: r.CreatedDate}); }
  }
  for (const bag of sets.values()) if (bag.parts.length === bag.total && bag.parts.every(p => p != null)) { const j = gunzip(bag.parts.join('')); if (j) out.push({json: j, at: bag.at}); }
  return out.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
}
const tokenFrom = docs => { for (const d of docs) { try { const t = JSON.parse(d.json)[FIELD]; if (typeof t === 'string' && /^xoxb-/.test(t) && t.length >= 50) return t; } catch (_) { /* next */ } } return null; };

async function loadToken(sf) {
  const env = process.env && process.env.SLACK_BOT_TOKEN; if (/^xoxb-/.test(env || '') && env.length >= 50) return env;
  for (const title of SECRET_TITLES) {
    const t = title.replace(/'/g, "''");
    try {
      const notes = await sf.query(`SELECT Id, Body, CreatedDate FROM Note WHERE Title = '${t}' AND ParentId IN (${[sf.userId, NOTE_PARENT_FALLBACK].filter(Boolean).map(x => `'${x}'`).join(', ')}) ORDER BY CreatedDate DESC LIMIT 50`);
      const a = tokenFrom(stitch(notes.records, 'nt:', r => r.Body)); if (a) return a;
    } catch (_) { /* Note not queryable: fall through */ }
    try {
      const cv = await sf.query(`SELECT Id, Description, CreatedDate FROM ContentVersion WHERE Title = '${t}' ORDER BY CreatedDate DESC LIMIT 50`);
      const a = tokenFrom(stitch(cv.records, 'cv:', r => r.Description)); if (a) return a;
    } catch (_) { /* not visible to this user */ }
  }
  return null;
}
async function getToken(sf) {
  if (cache && Date.now() - cache.at < TTL) return cache.token;
  let token = null; try { token = await loadToken(sf); } catch (_) { /* treated as not configured */ }
  cache = {token, at: Date.now()}; return token;
}
const available = async sf => !!(await getToken(sf));

function slackPost(token, method, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const req = https.request({method: 'POST', host: 'slack.com', path: `/api/${method}`, headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8', 'Content-Length': Buffer.byteLength(body)}}, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(c).toString('utf8'))); } catch (_) { reject(Error(`Slack returned an unreadable response (HTTP ${res.statusCode}).`)); } });
    });
    req.on('error', reject); req.setTimeout(TIMEOUT, () => req.destroy(Error('Slack timed out.'))); req.write(body); req.end();
  });
}
const WHY = {missing_scope: 'The Slack bot is missing a permission (im:write / chat:write).', not_authed: 'The Slack bot token is not valid.', invalid_auth: 'The Slack bot token is not valid.', token_revoked: 'The Slack bot token was revoked.', user_not_found: 'That person was not found in Slack.', cannot_dm_bot: 'Cannot DM a bot.', user_disabled: 'That Slack account is deactivated.'};
/** Open a 1:1 DM with `slackUserId` and post `text`. Returns {ok, ts, channel, permalink?}; never throws the token. */
async function sendDm(sf, slackUserId, text) {
  const token = await getToken(sf); if (!token) throw Error('The Slack bot is not configured for this app.');
  if (!/^[UW][A-Z0-9]{8,}$/.test(slackUserId || '')) throw Error('No Slack account to send to.');
  const open = await slackPost(token, 'conversations.open', {users: slackUserId});
  if (!open.ok) throw Error(WHY[open.error] || `Slack could not open the DM (${open.error}).`);
  const channel = open.channel && open.channel.id;
  const post = await slackPost(token, 'chat.postMessage', {channel, text, unfurl_links: 'false', unfurl_media: 'false'});
  if (!post.ok) throw Error(WHY[post.error] || `Slack did not accept the message (${post.error}).`);
  let permalink = null; try { const p = await slackPost(token, 'chat.getPermalink', {channel: post.channel || channel, message_ts: post.ts}); if (p.ok) permalink = p.permalink; } catch (_) { /* optional */ }
  return {ok: true, ts: post.ts, channel: post.channel || channel, permalink};
}
/** Read recent top-level messages of a channel the bot belongs to (needs channels:history / groups:history). */
async function history(sf, channel, oldest, limit = 100) {
  const token = await getToken(sf); if (!token) throw Error('The Slack bot is not configured for this app.');
  if (!/^C[A-Z0-9]{8,}$/.test(channel || '')) throw Error('Invalid channel.');
  const r = await slackPost(token, 'conversations.history', {channel, oldest: String(oldest), limit: String(limit)});
  if (!r.ok) throw Error(r.error === 'not_in_channel' || r.error === 'channel_not_found' ? 'The Slack bot is not a member of the PagerDuty channel. Add it there to enable alerts.' : r.error === 'missing_scope' ? 'The Slack bot lacks the channels:history permission.' : (WHY[r.error] || `Slack could not read the channel (${r.error}).`));
  return r.messages || [];
}
module.exports = {available, sendDm, history, stitch, tokenFrom};
