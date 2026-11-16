'use strict';
/**
 * Per-team Slack channels for nudges, configured in the dashboard and shared by everyone (GUS Apps store).
 * Posts go out through the GUS MIYO platform helper (ctx.slack); MIYO posts to channels only, so the engineer is @mentioned.
 */
const hub = require('./hub');
const KEY = 'slack-channels';
const CHANNEL = /\b([CG][A-Z0-9]{8,12})\b/;

/** Accepts a Slack channel link (…/archives/C123…) or a bare channel id. */
function parseChannel(v) {
  const s = String(v || '').trim();
  if (!s) return null;
  const m = /\/archives\/([CG][A-Z0-9]{8,12})/i.exec(s) || CHANNEL.exec(s.toUpperCase());
  if (!m) throw new Error('Paste a Slack channel link or its ID (starts with C or G).');
  return m[1].toUpperCase();
}
async function load(store) {
  const doc = await store.get('settings', KEY);
  return { map: (doc && doc.channels) || {}, revision: (doc && doc.revision) || null };
}
async function info(slack, id) {
  if (!slack || typeof slack.getChannelInfo !== 'function') return { name: '', verified: false };
  try { const r = await slack.getChannelInfo({ channel: id }), c = (r && (r.channel || r)) || {}; return { name: c.name ? '#' + c.name : '', verified: !!c.name }; }
  catch (_) { return { name: '', verified: false }; }
}
/** Teams with their configured channel (if any) for the settings dialog. */
async function list(sf, store) {
  const [{ teams }, { map, revision }] = await Promise.all([hub.getTeams(sf), load(store)]);
  return { revision, teams: (teams || []).map(t => ({ teamId: t.Id, name: t.short || t.Name, channel: map[t.Id] || null })) };
}
async function save(sf, store, slack, { teamId, channel, revision }) {
  hub.requireTeam(teamId);
  const id = parseChannel(channel), cur = await load(store), map = { ...cur.map };
  if (id) { const i = await info(slack, id); map[teamId] = { id, name: i.name, verified: i.verified }; } else delete map[teamId];
  const saved = await store.put('settings', KEY, { channels: map }, revision === undefined ? cur.revision : revision);
  return { channel: map[teamId] || null, revision: saved.revision };
}
/** The configured channel for a team (server-side only: the browser never supplies a channel id when sending). */
async function forTeam(store, teamId) {
  hub.requireTeam(teamId);
  return (await load(store)).map[teamId] || null;
}
module.exports = { list, save, forTeam, load, parseChannel };
