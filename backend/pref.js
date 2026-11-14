'use strict';
// Per-user default team, kept in the app's settings journal. Only used when the browser blocks localStorage
// (GUS Apps can serve the applet from a sandboxed frame), so the preference still survives a reload.
const SF_ID = /^[a-zA-Z0-9]{15,18}$/;

async function userKey(sf) {
  let id = sf && sf.userId;
  if (!id && sf && typeof sf.identity === 'function') { try { const w = await sf.identity(); id = w.user_id || w.userId; } catch (_) { /* optional */ } }
  if (!SF_ID.test(String(id || ''))) throw new Error('Could not identify the signed-in user.');
  return 'pref-' + id;
}

async function getPref(sf, store) {
  const doc = await store.get('settings', await userKey(sf));
  const t = doc && doc.defaultTeam;
  return { defaultTeam: t === 'all' || SF_ID.test(String(t || '')) ? t : null };
}

async function setPref(sf, store, defaultTeam) {
  if (defaultTeam !== null && defaultTeam !== 'all' && !SF_ID.test(String(defaultTeam))) throw new Error('Unknown team');
  const key = await userKey(sf), cur = await store.get('settings', key);
  await store.put('settings', key, { defaultTeam: defaultTeam || '' }, cur ? cur.revision : null);
  return { defaultTeam: defaultTeam || null };
}

module.exports = { getPref, setPref };
