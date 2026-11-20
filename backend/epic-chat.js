'use strict';
/**
 * Epic comments: read an epic's GUS Chatter feed (posts and their replies) and post to it as the signed-in user,
 * with real @mentions. Nothing is stored in the plan; GUS Chatter is the only copy.
 */
const SF_ID = /^[a-zA-Z0-9]{15,18}$/;
const MAX_TEXT = 4000;
const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const validId = id => { if (!SF_ID.test(String(id || ''))) throw new Error('Invalid record or user id'); return String(id); };
const body = r => (r && typeof r === 'object' && r.body && typeof r.body === 'object' && !Array.isArray(r.body) && !r.elements && !r.items && !r.id ? r.body : r) || {};
const req = async (sf, o) => { if (typeof sf.request !== 'function') throw new Error('GUS Apps cannot reach Chatter from this session.'); return body(await sf.request(o)); };

/** Chatter message segments to plain parts: [{t:'text',v}|{t:'mention',v,id}|{t:'link',v}]. Markup (bold, lists) is flattened to text. */
const parts = segs => (Array.isArray(segs) ? segs : []).map(s => {
  const ty = s && s.type;
  if (ty === 'Mention') return { t: 'mention', v: s.text || ('@' + ((s.user && s.user.name) || 'user')), id: (s.user && s.user.id) || s.record && s.record.id || '' };
  if (ty === 'Link' || ty === 'Hashtag') return { t: ty === 'Link' ? 'link' : 'text', v: s.text || s.url || '', url: s.url || '' };
  if (ty === 'MarkupBegin' || ty === 'MarkupEnd') return /^(paragraph|li)$/.test(String(s.markupType || '')) && ty === 'MarkupEnd' ? { t: 'text', v: '\n' } : null;
  return { t: 'text', v: s && s.text != null ? String(s.text) : '' };
}).filter(Boolean);
const who = a => ({ id: (a && a.id) || '', name: (a && a.displayName || a && a.name) || 'Someone', photo: (a && a.photo && (a.photo.smallPhotoUrl || a.photo.standardEmailPhotoUrl)) || '' });
const item = (x, me) => ({ id: x.id, at: x.createdDate || '', by: who(x.actor || x.user), mine: !!me && ((x.actor || x.user || {}).id || '').slice(0, 15) === me, parts: parts(x.body && x.body.messageSegments) });

const canRest = sf => typeof sf.request === 'function';
const plain = (id, name, at, text, me) => ({ id, at: at || '', by: { id: '', name: name || 'Someone', photo: '' }, mine: false, parts: String(text || '').trim() ? [{ t: 'text', v: String(text).trim() }] : [] });
/** Without REST access (the GUS Apps runtime) the thread is read from the Feed sObjects: plain text, newest 25 posts with their replies. */
async function readSobjects(sf, id) {
  // A custom object's feed is its own sObject (ADM_Epic__Feed); FeedItem alone demands an Id filter in this runtime.
  const F = 'Id, Body, CreatedDate, CreatedById, CreatedBy.Name', W = `FROM ADM_Epic__Feed WHERE ParentId = '${id}' AND Type IN ('TextPost','LinkPost','ContentPost','QuestionPost') ORDER BY CreatedDate DESC LIMIT 25`;
  let rows, byComment = null;
  try { rows = (await sf.query(`SELECT ${F}, (SELECT Id, CommentBody, CreatedDate, CreatedById, CreatedBy.Name FROM FeedComments ORDER BY CreatedDate ASC LIMIT 20) ${W}`)).records || []; }
  catch (_) {
    rows = (await sf.query(`SELECT ${F} ${W}`)).records || [];
    if (rows.length) { try { const cs = (await sf.query(`SELECT Id, FeedItemId, CommentBody, CreatedDate, CreatedById, CreatedBy.Name FROM FeedComment WHERE FeedItemId IN (${rows.map(r => `'${validId(r.Id)}'`).join(',')}) ORDER BY CreatedDate ASC`)).records || []; byComment = {}; cs.forEach(c => (byComment[c.FeedItemId] = byComment[c.FeedItemId] || []).push(c)); } catch (_2) { /* replies are best effort */ } }
  }
  const me = SF_ID.test(String(sf.userId || '')) ? String(sf.userId).slice(0, 15) : '';
  const mk = (x, text) => ({ ...plain(x.Id, x.CreatedBy && x.CreatedBy.Name, x.CreatedDate, text), mine: !!me && String(x.CreatedById || '').slice(0, 15) === me });
  const reps = r => ((r.FeedComments && r.FeedComments.records) || (byComment && byComment[r.Id]) || []);
  return { posts: rows.map(r => ({ ...mk(r, r.Body), replies: reps(r).map(c => mk(c, c.CommentBody)).filter(c => c.parts.length), moreReplies: false })).filter(p => p.parts.length).reverse() };
}
async function read(sf, { epicId }) {
  const id = validId(epicId);
  if (!canRest(sf)) return readSobjects(sf, id);
  const me = SF_ID.test(String(sf.userId || '')) ? String(sf.userId).slice(0, 15) : '';
  const r = await req(sf, `/services/data/v62.0/chatter/feeds/record/${id}/feed-elements?pageSize=25&sort=CreatedDateDesc`);
  const posts = (r.elements || []).filter(e => e.type === 'TextPost' || e.body).map(e => {
    const cm = e.capabilities && e.capabilities.comments && e.capabilities.comments.page && e.capabilities.comments.page.items || [];
    return { ...item(e, me), replies: cm.map(c => item(c, me)), moreReplies: Number(e.capabilities && e.capabilities.comments && e.capabilities.comments.page && e.capabilities.comments.page.total) > cm.length };
  }).filter(p => p.parts.length).reverse();
  return { posts };
}

/** segments: [{t:'text',v}|{t:'mention',id}] built by the client from the typed text. Posts a new FeedItem on the epic, or a reply when replyTo is given. */
async function post(sf, { epicId, segments, replyTo }) {
  const id = validId(epicId), raw = (Array.isArray(segments) ? segments : []).slice(0, 80).map(s => s && s.t === 'mention' ? { t: 'mention', id: validId(s.id), name: String(s.name || '').slice(0, 80) } : { t: 'text', v: String((s && s.v) || '') });
  const flat = raw.map(s => s.t === 'mention' ? '@' + (s.name || 'user') : s.v).join('');
  if (!flat.trim()) throw new Error('Write a comment first.');
  if (flat.length > MAX_TEXT) throw new Error(`Comment is too long (max ${MAX_TEXT} characters).`);
  const reply = replyTo ? validId(replyTo) : '';
  const ch = sf.chatter;
  if (ch && typeof (reply ? ch.comment : ch.post) === 'function') {
    // The host's own Chatter helper (Connect API underneath): real @mentions that notify. The body shape is not documented, so the likely ones are tried in turn; an error means nothing was posted.
    const segs = raw.map(s => s.t === 'mention' ? { type: 'Mention', id: s.id } : { type: 'Text', text: s.v }).filter(s => s.type === 'Mention' || s.text);
    let lastErr = '';
    for (const shape of [{ messageSegments: segs }, { body: { messageSegments: segs } }]) {
      try {
        const r = body(reply ? await ch.comment(reply, shape) : await ch.post(id, shape));
        return { posted: true, id: (r && r.id) || '', mentions: true };
      } catch (e) { lastErr = String((e && e.message) || e).slice(0, 200); }
    }
    if (!raw.some(s => s.t === 'mention')) { /* no tags to lose: fall through to the plain-text path */ } else throw new Error('GUS Chatter did not accept the comment with mentions: ' + lastErr);
  }
  if (!canRest(sf)) {
    // The GUS Apps runtime has no Connect API: the comment is posted through the Feed sObjects as plain text, so an @name is shown but does not notify.
    if (typeof sf.create !== 'function') throw new Error('GUS Apps cannot post to Chatter from this session.');
    const r = reply ? await sf.create('FeedComment', { FeedItemId: reply, CommentBody: flat }) : await sf.create('FeedItem', { ParentId: id, Body: flat, Type: 'TextPost' });
    if (!r || r.success === false || (r.errors && r.errors.length)) throw new Error('GUS rejected the comment: ' + JSON.stringify((r && r.errors) || []).slice(0, 200));
    return { posted: true, id: r.id, plain: true };
  }
  const segs = raw.map(s => s.t === 'mention' ? { type: 'Mention', id: s.id } : { type: 'Text', text: s.v }).filter(s => s.type === 'Mention' || s.text);
  const res = await req(sf, reply
    ? { method: 'POST', url: `/services/data/v62.0/chatter/feed-elements/${reply}/capabilities/comments/items`, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: { messageSegments: segs } }) }
    : { method: 'POST', url: '/services/data/v62.0/chatter/feed-elements', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedElementType: 'FeedItem', subjectId: id, body: { messageSegments: segs } }) });
  if (!res.id) throw new Error('GUS did not confirm the Chatter post.');
  return { posted: true, id: res.id };
}

/** Any active GUS user by name (for @mentions). */
async function users(sf, { q: term }) {
  const t = String(term || '').trim().slice(0, 60);
  if (t.length < 2) return { users: [] };
  const like = q(t).replace(/[%_]/g, '\\$&');
  const rows = (await sf.query(`SELECT Id, Name, Title FROM User WHERE IsActive = true AND UserType = 'Standard' AND Name LIKE '%${like}%' ORDER BY Name LIMIT 8`)).records || [];
  return { users: rows.map(u => ({ id: u.Id, name: u.Name, title: u.Title || '' })) };
}
module.exports = { read, post, users, parts };
