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
    `(SELECT Member_Name__c FROM ADM_Scrum_Team_Member__c WHERE Scrum_Team__r.Active__c = true AND (${require('./teams.config').all().map(e => require('./teams.config').sqlName(e, 'Scrum_Team__r.')).join(' OR ')})) ` +
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
  const tag = `<@${t.slackUserId}>`;
  let msg = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // "@Full Name" (and the first name) in the text becomes a real mention; otherwise the mention leads the message
  const names = [t.name, String(t.name || '').split(' ')[0]].filter(Boolean);
  let tagged = false;
  for (const n of names) { const re = new RegExp('@' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\w])', 'g'); if (re.test(msg)) { msg = msg.replace(re, tag); tagged = true; break; } }
  if (!tagged) msg = tag + '\n' + msg;
  // GUS record links become a clean named link; the unfurl card is off
  msg = msg.replace(/(^|\s)(https:\/\/[^\s<>]+\/(?:ADM_Epic__c|ADM_Work__c)\/[^\s<>]+)/g, (m0, pre, url) => `${pre}<${url}|Open in GUS>`);
  const text2 = `${msg}${from ? `\n\n_Sent by ${from} via ReleaseIQ_` : ''}`;
  let r;
  try { r = typeof slack.postMessage === 'function' ? await slack.postMessage({ channel: ch.id, text: text2 }) : await slack.apiCall('chat.postMessage', { channel: ch.id, text: text2, unfurl_links: false }); }
  catch (e) { throw new Error(`GUS MIYO could not post to ${ch.name || 'the channel'}: ${String((e && e.message) || e).slice(0, 160)}. Check that @GUS MIYO is invited there.`); }
  if (r && r.ok === false) throw new Error(`Slack did not accept the message (${r.error || 'unknown'}). Check that @GUS MIYO is invited to ${ch.name || 'the channel'}.`);
  return { ok: true, to: t.name, channel: ch.name || ch.id };
}
/**
 * Share the epic-review deck summary to a Slack channel the user picks at send time: a configured team channel (by team id)
 * or a pasted channel link/ID. Nothing is defaulted; the browser must name the channel on every call.
 */
async function sendDeckSlack(sf, slack, store, { teamId, channel, text }) {
  const body = cleanText(text);
  if (!slack || (typeof slack.postMessage !== 'function' && typeof slack.apiCall !== 'function')) throw new Error('The GUS MIYO Slack helper is not available in this runtime.');
  const sc = require('./slack-channels');
  let ch;
  if (teamId) { ch = await sc.forTeam(store, teamId); if (!ch) throw new Error('No Slack channel is set for that team.'); }
  else { const id = sc.parseChannel(channel); if (!id) throw new Error('Choose a Slack channel first.'); ch = { id, name: '' }; }
  let from = ''; try { if (!SF_ID.test(String(sf.userId || ''))) throw 0; const me = ((await sf.query(`SELECT Name FROM User WHERE Id = '${q(sf.userId)}' LIMIT 1`)).records || [])[0]; from = me && me.Name || ''; } catch (_) { /* signature is optional */ }
  const esc = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g, '<$2|$1>');
  const text2 = `${esc}${from ? `\n\n_Shared by ${from} via ReleaseIQ_` : ''}`;
  let r;
  try { r = typeof slack.postMessage === 'function' ? await slack.postMessage({ channel: ch.id, text: text2 }) : await slack.apiCall('chat.postMessage', { channel: ch.id, text: text2, unfurl_links: false }); }
  catch (e) { throw new Error(`GUS MIYO could not post to ${ch.name || 'the channel'}: ${String((e && e.message) || e).slice(0, 160)}. Check that @GUS MIYO is invited there.`); }
  if (r && r.ok === false) throw new Error(`Slack did not accept the message (${r.error || 'unknown'}). Check that @GUS MIYO is invited to the channel.`);
  return { ok: true, channel: ch.name || ch.id };
}
module.exports = { searchUsers, slackTarget, postChatter, sendSlack, sendDeckSlack, cleanText };
