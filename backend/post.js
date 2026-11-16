'use strict';
/**
 * Nudge posts: @user search (MAPS / MQ / VegaCache members), Slack DM preparation and GUS Chatter posts.
 * The Slack connector exposes identity lookup only (no confirmed post method), so the Slack tab prepares
 * the message and a verified DM deep link; Chatter posts are real writes made as the signed-in user.
 */
const SF_ID = /^[a-zA-Z0-9]{15,18}$/;
const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const MAX_TEXT = 4000;
const validId = id => { if (!SF_ID.test(String(id || ''))) throw new Error('Invalid record or user id'); return id; };
const cleanText = t => { const s = String(t || '').trim(); if (!s) throw new Error('Write a message first.'); if (s.length > MAX_TEXT) throw new Error(`Message is too long (max ${MAX_TEXT} characters).`); return s; };

async function searchUsers(sf, term) {
  const t = String(term || '').trim().slice(0, 60);
  const like = t ? ` AND (Name LIKE '%${q(t).replace(/[%_]/g, '\\$&')}%' OR Email LIKE '${q(t).replace(/[%_]/g, '\\$&')}%')` : '';
  const res = await sf.query(
    `SELECT Id, Name, Email, Title FROM User WHERE IsActive = true${like} AND Id IN ` +
    `(SELECT Member_Name__c FROM ADM_Scrum_Team_Member__c WHERE Scrum_Team__r.Active__c = true AND (Scrum_Team__r.Name = 'Message Queue' OR Scrum_Team__r.Name LIKE 'Managed Async Processing%' OR Scrum_Team__r.Name LIKE 'VegaCache%' OR Scrum_Team__r.Name = 'VegaStore' OR Scrum_Team__r.Name = 'Caching Services')) ` +
    `ORDER BY Name LIMIT 15`);
  return { users: (res.records || []).map(u => ({ id: u.Id, name: u.Name, email: u.Email || '', title: u.Title || '' })) };
}

async function slackTarget(sf, slack, userId) {
  validId(userId);
  const u = ((await sf.query(`SELECT Id, Name, Email FROM User WHERE Id = '${q(userId)}' LIMIT 1`)).records || [])[0];
  if (!u) throw new Error('User not found in GUS.');
  const out = { name: u.Name, slackUserId: null, dmUrl: null, canPost: false, notice: 'Slack identity lookup is unavailable. Copy the message and open Slack.' };
  if (!u.Email || !slack || typeof slack.resolveIdentity !== 'function') return out;
  try {
    const r = await slack.resolveIdentity({ email: u.Email });
    const id = r && ((r.user && r.user.id) || r.userId || r.slackUserId || r.id);
    if (!/^[UW][A-Z0-9]{8,}$/.test(id || '')) { out.notice = `No Slack account matched ${u.Name}'s GUS email. Copy the message and find them in Slack.`; return out; }
    out.slackUserId = id;
    let team = r.user && r.user.team_id || r.team_id || r.teamId;
    if (!team && typeof slack.getUser === 'function') { try { const g = await slack.getUser({ user: id }); team = (g.user || g).team_id || g.team_id; } catch (_) { /* no team => no deep link */ } }
    if (/^T[A-Z0-9]{8,}$/.test(team || '')) { out.dmUrl = `slack://user?team=${team}&id=${id}`; out.notice = `${u.Name} matched in Slack. Copy the message, then open the DM and paste.`; }
    else out.notice = `${u.Name} matched in Slack, but the workspace ID is unavailable. Copy the message and DM them.`;
  } catch (_) { out.notice = 'Slack identity lookup could not complete. Copy the message and DM the user in Slack.'; }
  return out;
}

async function postChatter(sf, { recordId, userId, text }) {
  validId(recordId); validId(userId);
  const body = cleanText(text);
  if (typeof sf.request !== 'function') throw new Error('GUS Apps cannot post to Chatter from this session.');
  const res = await sf.request({
    method: 'POST', url: '/services/data/v62.0/chatter/feed-elements', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedElementType: 'FeedItem', subjectId: recordId, body: { messageSegments: [{ type: 'Mention', id: userId }, { type: 'Text', text: ' ' + body }] } })
  });
  const id = res && (res.id || (res.body && res.body.id));
  if (!id) throw new Error('GUS did not confirm the Chatter post.');
  return { posted: true, id };
}
/** Post the nudge to the team's configured Slack channel through GUS MIYO, @mentioning the engineer. Recipient and channel are resolved server-side. */
async function sendSlack(sf, slack, store, { userId, teamId, text }) {
  const body = cleanText(text);
  if (!slack || (typeof slack.postMessage !== 'function' && typeof slack.apiCall !== 'function')) throw new Error('The GUS MIYO Slack helper is not available in this runtime.');
  const ch = await require('./slack-channels').forTeam(store, teamId);
  if (!ch) throw new Error('No Slack channel is set for this team. Use "Slack channels" to add one.');
  const t = await slackTarget(sf, slack, userId);
  if (!t.slackUserId) throw new Error(t.notice);
  let from = ''; try { if (!SF_ID.test(String(sf.userId || ''))) throw 0; const me = ((await sf.query(`SELECT Name FROM User WHERE Id = '${q(sf.userId)}' LIMIT 1`)).records || [])[0]; from = me && me.Name || ''; } catch (_) { /* signature is optional */ }
  const text2 = `<@${t.slackUserId}>\n${body}${from ? `\n\n_Sent by ${from} via ReleaseIQ_` : ''}`;
  let r;
  try { r = typeof slack.postMessage === 'function' ? await slack.postMessage({ channel: ch.id, text: text2 }) : await slack.apiCall('chat.postMessage', { channel: ch.id, text: text2, unfurl_links: false }); }
  catch (e) { throw new Error(`GUS MIYO could not post to ${ch.name || 'the channel'}: ${String((e && e.message) || e).slice(0, 160)}. Check that @GUS MIYO is invited there.`); }
  if (r && r.ok === false) throw new Error(`Slack did not accept the message (${r.error || 'unknown'}). Check that @GUS MIYO is invited to ${ch.name || 'the channel'}.`);
  return { ok: true, to: t.name, channel: ch.name || ch.id };
}
module.exports = { searchUsers, slackTarget, postChatter, sendSlack, cleanText };
