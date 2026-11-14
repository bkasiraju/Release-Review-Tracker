'use strict';
/**
 * Team hub data: teams + members, bugs, team dependencies (TDs), home summary,
 * rotation rota (saved in GUS Apps ContentStore) and fast delta writes back to GUS.
 * GUS is the system of record; every read is a live SOQL query in the user's context.
 */
const SF_ID = /^[a-zA-Z0-9]{15,18}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const q = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// Fallback teams if the live lookup returns nothing (e.g. no access).
const SEED_TEAMS = [
  { Id: 'a00B0000000w4ZhIAI', Name: 'Message Queue', short: 'MQ' },
  { Id: 'a00EE00001IJPZVYA5', Name: 'Managed Async Processing Service (MAPS)', short: 'MAPS' }
];
const TEAM_FILTER = "Active__c = true AND (Name = 'Message Queue' OR Name LIKE 'Managed Async Processing%' OR Name LIKE 'VegaCache%' OR Name = 'VegaStore' OR Name = 'Caching Services')";
const shortName = n => /message queue/i.test(n) ? 'MQ' : /maps|managed async/i.test(n) ? 'MAPS' : String(n).replace(/\s*\(.*\)/, '');

function requireTeam(teamId) {
  if (!SF_ID.test(String(teamId || ''))) throw new Error('Unknown team');
  return teamId;
}
async function userId(sf) {
  let id = sf.userId;
  if (!id && typeof sf.identity === 'function') { try { const w = await sf.identity(); id = w.user_id || w.userId; } catch (_) { /* optional */ } }
  return id || null;
}

async function getTeams(sf) {
  let teams = [];
  try { teams = ((await sf.query(`SELECT Id, Name FROM ADM_Scrum_Team__c WHERE ${TEAM_FILTER} ORDER BY Name`)).records || []).map(t => ({ Id: t.Id, Name: t.Name, short: shortName(t.Name) })); } catch (_) { /* fall back */ }
  if (!teams.length) teams = SEED_TEAMS;
  let primaryTeamId = null;
  try {
    const uid = await userId(sf);
    if (uid) {
      const ids = teams.map(t => `'${t.Id}'`).join(',');
      const rows = (await sf.query(`SELECT Scrum_Team__c FROM ADM_Scrum_Team_Member__c WHERE Member_Name__c = '${q(uid)}' AND Scrum_Team__c IN (${ids}) LIMIT 1`)).records || [];
      if (rows.length) primaryTeamId = rows[0].Scrum_Team__c;
    }
  } catch (_) { /* default-selection hint only */ }
  return { teams, primaryTeamId };
}

async function getMembers(sf, teamId) {
  requireTeam(teamId);
  const rows = (await sf.query(`SELECT Member_Name__c, Member_Name__r.Name, Role__c FROM ADM_Scrum_Team_Member__c WHERE Scrum_Team__c = '${teamId}' ORDER BY Member_Name__r.Name LIMIT 200`)).records || [];
  const members = rows.filter(r => r.Member_Name__r).map(r => ({ id: r.Member_Name__c, name: r.Member_Name__r.Name, role: r.Role__c || '' }));
  return { members: [...members.filter(m => leaderRank(m.id) < 0), ...members.filter(m => leaderRank(m.id) >= 0).sort((a, b) => leaderRank(a.id) - leaderRank(b.id))] };
}

// ── Bugs ────────────────────────────────────────────────────────────────────────
const BUG_PRIORITIES = ['P0', 'P1', 'P2', 'P3', 'P4'];
const CLOSED_STATUSES = ['Closed', 'Fixed', 'Never', 'Duplicate', 'Not a bug', 'Not Reproducible', 'Will Not Fix', 'Rejected', 'Inactive', 'Completed'];
const inList = a => a.map(v => `'${q(v)}'`).join(',');
async function getBugs(sf, teamId, opts = {}) {
  requireTeam(teamId);
  const pri = (Array.isArray(opts.priorities) ? opts.priorities : ['P0', 'P1', 'P2']).filter(p => BUG_PRIORITIES.includes(p));
  if (!pri.length) return { bugs: [], truncated: false };
  const closed = opts.includeClosed ? '' : `AND Status__c NOT IN (${inList(CLOSED_STATUSES)}) AND (NOT Status__c LIKE 'Closed%') `;
  const res = await sf.query(
    `SELECT Id, Name, Subject__c, Status__c, Priority__c, Story_Points__c, Assignee__c, Assignee__r.Name, Found_In_Build__c, CreatedDate, Scrum_Team__c ` +
    `FROM ADM_Work__c WHERE Scrum_Team__c = '${teamId}' AND RecordType.Name = 'Bug' AND Priority__c IN (${inList(pri)}) ${closed}` +
    `ORDER BY Priority__c ASC, CreatedDate ASC LIMIT 500`);
  return { bugs: (res.records || []).map(w => ({ id: w.Id, name: w.Name, subject: w.Subject__c || '', status: w.Status__c, priority: w.Priority__c, points: w.Story_Points__c, assigneeId: w.Assignee__c, assignee: (w.Assignee__r && w.Assignee__r.Name) || '', build: w.Found_In_Build__c || '', created: w.CreatedDate })), truncated: (res.records || []).length >= 500 };
}

// ── Bug SLAs (Trust Champion view) ──────────────────────────────────────────────
const BUGFIX_DAYS = { P0: 2, P1: 15, P2: 30 };
const PRI_WEIGHT = { P0: 100, P1: 60, P2: 30, P3: 10, P4: 5 };
const MAX_OPEN_PER_DEV = 6;
const SLA_CARDS = [
  { id: 'triage', label: 'Triage SLA', note: 'SLA: 2 days' },
  { id: 'bugfix', label: 'Bugfix SLA', note: 'SLA: P0:2d, P1:15d, P2:30d' },
  { id: 'investigations', label: 'Investigations', note: 'SLA: 7 days' },
  { id: 'cases', label: 'Bugs w/ Cases/KI', note: 'SLA: 30 days' },
  { id: 'stale', label: '180-day bugs', note: 'Open longer than 180 days' },
  { id: 'tf', label: 'TF SLA', note: 'SLA: 5 days with team' },
  { id: 'perdev', label: 'Bugs per dev', note: `SLA: ≤${MAX_OPEN_PER_DEV} per engineer` }
];
function slaState(age, sla) {
  const remaining = sla - age;
  return { remaining, state: remaining < 0 ? 'breached' : remaining <= sla * 0.25 ? 'risk' : remaining <= sla * 0.5 ? 'warn' : 'ok' };
}
/** Pure: classify open bugs/investigations into SLA cards. `rows` are normalised work items (see getSla). */
function computeSla(rows, now = Date.now()) {
  const cards = Object.fromEntries(SLA_CARDS.map(c => [c.id, { ...c, items: [] }]));
  const push = (id, w, sla) => {
    const age = (now - new Date(w.created)) / 864e5;
    cards[id].items.push({ ...w, age: Math.round(age * 10) / 10, sla, ...slaState(age, sla), urgency: Math.round((100 * age / sla + (PRI_WEIGHT[w.priority] || 0) / 2) * 100) / 100 });
  };
  for (const w of rows) {
    if (w.recordType === 'Investigation') { push('investigations', w, 7); continue; }
    if (w.status === 'New') push('triage', w, 2);
    if (BUGFIX_DAYS[w.priority]) push('bugfix', w, BUGFIX_DAYS[w.priority]);
    if (w.cases > 0 || w.knownIssue) push('cases', w, 30);
    if ((now - new Date(w.created)) / 864e5 >= 150) push('stale', w, 180);
    if (w.type === 'Test Failure') push('tf', w, 5);
  }
  const perDev = new Map();
  for (const w of rows) if (w.recordType !== 'Investigation' && w.assigneeId) { const d = perDev.get(w.assigneeId) || { name: w.assignee, items: [] }; d.items.push(w); perDev.set(w.assigneeId, d); }
  const over = [...perDev.values()].filter(d => d.items.length > MAX_OPEN_PER_DEV);
  cards.perdev.items = over.flatMap(d => d.items.map(w => ({ ...w, age: Math.round((now - new Date(w.created)) / 864e5 * 10) / 10, sla: null, remaining: null, state: 'breached', urgency: d.items.length })));
  cards.perdev.over = over.length; cards.perdev.ok = perDev.size - over.length;
  for (const c of Object.values(cards)) {
    c.items.sort((a, b) => b.urgency - a.urgency);
    if (c.id !== 'perdev') for (const k of ['breached', 'risk', 'warn', 'ok']) c[k] = c.items.filter(i => i.state === k).length;
  }
  return SLA_CARDS.map(c => cards[c.id]);
}
async function getSla(sf, teamId) {
  requireTeam(teamId);
  const res = await sf.query(
    `SELECT Id, Name, Subject__c, Status__c, Priority__c, Assignee__c, Assignee__r.Name, CreatedDate, RecordType.Name, Type__c, Number_of_Cases__c, Known_Issue_ID__c ` +
    `FROM ADM_Work__c WHERE Scrum_Team__c = '${teamId}' AND RecordType.Name IN ('Bug','Investigation') AND Status__c NOT IN (${inList(CLOSED_STATUSES)}) AND (NOT Status__c LIKE 'Closed%') ORDER BY CreatedDate ASC LIMIT 2000`);
  const rows = (res.records || []).map(w => ({ id: w.Id, name: w.Name, subject: w.Subject__c || '', status: w.Status__c, priority: w.Priority__c || '', assigneeId: w.Assignee__c || null, assignee: (w.Assignee__r && w.Assignee__r.Name) || '', created: w.CreatedDate,
    recordType: (w.RecordType && w.RecordType.Name) || '', type: w.Type__c || '', cases: w.Number_of_Cases__c || 0, knownIssue: w.Known_Issue_ID__c || '' }));
  return { cards: computeSla(rows), total: rows.length, truncated: (res.records || []).length >= 2000 };
}

// Trust Champion per team, saved in GUS Apps.
async function getChampion(store, teamId) {
  const doc = await store.get('settings', 'champion-' + requireTeam(teamId));
  return { champion: (doc && doc.champion) || null, revision: (doc && doc.revision) || null };
}
async function saveChampion(store, teamId, champion, expected) {
  const value = champion && champion.name ? { id: SF_ID.test(String(champion.id || '')) ? champion.id : null, name: String(champion.name).slice(0, 80) } : null;
  const saved = await store.put('settings', 'champion-' + requireTeam(teamId), { champion: value }, expected === undefined ? undefined : expected);
  return { champion: saved.champion || null, revision: saved.revision };
}

// ── Team Dependencies ───────────────────────────────────────────────────────────
async function getTds(sf, teamId) {
  requireTeam(teamId);
  const res = await sf.query(
    `SELECT Id, Name, Dependency_Status__c, Deliverable__c, Deliver_By__c, Notes__c, Target_Build__r.Name, Dependency_Size__c, Dependent_Team__c, Dependent_Team__r.Name, ` +
    `Provider_Team__c, Provider_Team__r.Name, Dependent_User_Story__c, Dependent_User_Story__r.Name, Provider_User_Story__c, Provider_User_Story__r.Name FROM ADM_Team_Dependency__c ` +
    `WHERE (Dependent_Team__c = '${teamId}' OR Provider_Team__c = '${teamId}') AND Dependency_Status__c NOT IN ('Completed','Cancelled','Rejected','Closed','Never') ` +
    `ORDER BY Deliver_By__c ASC NULLS LAST LIMIT 500`);
  const map = t => ({ id: t.Id, name: t.Name, status: t.Dependency_Status__c, deliverable: t.Deliverable__c || '', deliverBy: t.Deliver_By__c, notes: t.Notes__c || '', build: (t.Target_Build__r && t.Target_Build__r.Name) || '', size: t.Dependency_Size__c || '',
    dependentTeam: (t.Dependent_Team__r && t.Dependent_Team__r.Name) || '', providerTeam: (t.Provider_Team__r && t.Provider_Team__r.Name) || '',
    dependentStory: (t.Dependent_User_Story__r && t.Dependent_User_Story__r.Name) || '', providerStory: (t.Provider_User_Story__r && t.Provider_User_Story__r.Name) || '', dependentStoryId: t.Dependent_User_Story__c || null, providerStoryId: t.Provider_User_Story__c || null });
  const rows = res.records || [];
  // Outgoing: we depend on another team. Incoming: another team depends on us.
  return { outgoing: rows.filter(t => t.Dependent_Team__c === teamId).map(map), incoming: rows.filter(t => t.Provider_Team__c === teamId && t.Dependent_Team__c !== teamId).map(map), truncated: (res.records || []).length >= 500 };
}

// ── Home summary (parallel, one round trip for the landing tiles) ───────────────
async function getHome(sf, teamId) {
  requireTeam(teamId);
  const safe = p => p.then(v => v, () => null);
  const [sprints, bugs, tds, members] = await Promise.all([
    safe(sf.query(`SELECT Id, Name, Start_Date__c, End_Date__c, Goals__c, Completion_Committed_Story_Points__c, Committed_Points__c, Committed_Story_Points_Completed__c FROM ADM_Sprint__c WHERE Scrum_Team__c = '${teamId}' AND Start_Date__c <= TODAY ORDER BY Start_Date__c DESC LIMIT 3`)),
    safe(sf.query(`SELECT Priority__c p, COUNT(Id) c FROM ADM_Work__c WHERE Scrum_Team__c = '${teamId}' AND RecordType.Name = 'Bug' AND Priority__c IN ('P0','P1','P2') AND Status__c NOT IN (${inList(CLOSED_STATUSES)}) AND (NOT Status__c LIKE 'Closed%') GROUP BY Priority__c`)),
    safe(sf.query(`SELECT Dependent_Team__c d, COUNT(Id) c FROM ADM_Team_Dependency__c WHERE (Dependent_Team__c = '${teamId}' OR Provider_Team__c = '${teamId}') AND Dependency_Status__c NOT IN ('Completed','Cancelled','Rejected','Closed','Never') GROUP BY Dependent_Team__c`)),
    safe(sf.query(`SELECT COUNT(Id) c FROM ADM_Scrum_Team_Member__c WHERE Scrum_Team__c = '${teamId}'`))
  ]);
  const t = new Date().toISOString().slice(0, 10), list = (sprints && sprints.records) || [];
  const cur = list.find(s => s.Start_Date__c <= t && s.End_Date__c >= t) || list[0] || null;
  const bugCount = { P0: 0, P1: 0, P2: 0 };
  for (const r of (bugs && bugs.records) || []) bugCount[r.p] = r.c;
  let outgoing = 0, incoming = 0;
  for (const r of (tds && tds.records) || []) { if (r.d === teamId) outgoing += r.c; else incoming += r.c; }
  return {
    sprint: cur && { id: cur.Id, name: cur.Name, start: cur.Start_Date__c, end: cur.End_Date__c, goal: cur.Goals__c || '', sayDo: cur.Completion_Committed_Story_Points__c, committed: cur.Committed_Points__c, done: cur.Committed_Story_Points_Completed__c, current: cur.Start_Date__c <= t && cur.End_Date__c >= t },
    bugs: bugCount, tds: { outgoing, incoming }, members: members && members.records && members.records[0] ? members.records[0].c : null
  };
}

// ── Rotation rota (saved in GUS Apps; Slack history is not readable by the backend) ─
const ROTATION_KINDS = ['pd', 'trusthero'];
const rotKey = teamId => 'rotation-' + requireTeam(teamId);
function cleanRota(input) {
  const out = {};
  for (const kind of ROTATION_KINDS) {
    const rows = Array.isArray(input && input[kind]) ? input[kind] : [];
    if (rows.length > 200) throw new Error('Rota too large.');
    out[kind] = rows.map(r => ({ name: String(r.name || '').trim().slice(0, 80), start: String(r.start || ''), end: String(r.end || ''), backup: String(r.backup || '').trim().slice(0, 80) }))
      .filter(r => r.name && ISO_DATE.test(r.start) && ISO_DATE.test(r.end) && r.start <= r.end).sort((a, b) => a.start.localeCompare(b.start));
  }
  return out;
}
async function getRotation(store, teamId) {
  const doc = await store.get('settings', rotKey(teamId));
  return { rota: cleanRota(doc || {}), revision: (doc && doc.revision) || null, updatedAt: (doc && doc.updatedAt) || null };
}
async function saveRotation(store, teamId, rota, expected) {
  const saved = await store.put('settings', rotKey(teamId), { ...cleanRota(rota) }, expected === undefined ? undefined : expected);
  return { rota: cleanRota(saved), revision: saved.revision, updatedAt: saved.updatedAt };
}

// ── Delta writes to GUS ─────────────────────────────────────────────────────────
// Allow-listed object → field → validator. Only changed fields ever leave the browser.
const str = max => v => v === null || typeof v === 'string' && v.length <= max;
const num = v => v === null || typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1000;
const date = v => v === null || typeof v === 'string' && ISO_DATE.test(v);
const pick = max => v => typeof v === 'string' && v.length > 0 && v.length <= max;
const sfid = v => v === null || SF_ID.test(String(v));
const WRITABLE = {
  ADM_Work__c: { Status__c: pick(60), Priority__c: pick(10), Story_Points__c: num, Assignee__c: sfid, Subject__c: pick(255) },
  ADM_Team_Dependency__c: { Dependency_Status__c: pick(60), Notes__c: str(32000), Deliver_By__c: date },
  ADM_Sprint__c: { Goals__c: str(32000) }
};
async function updateOne(sf, u) {
  const fields = WRITABLE[u && u.object];
  if (!fields) throw new Error('Object is not editable from the dashboard.');
  if (!SF_ID.test(String(u.id || ''))) throw new Error('Invalid record id.');
  const delta = {};
  for (const [k, v] of Object.entries(u.fields || {})) {
    if (!Object.prototype.hasOwnProperty.call(fields, k) || !fields[k](v)) throw new Error(`Field ${k} is not editable or the value is invalid.`);
    delta[k] = v;
  }
  if (!Object.keys(delta).length) throw new Error('Nothing to save.');
  if (typeof sf.update === 'function') {
    const out = await sf.update(u.object, u.id, delta);
    if (out && (out.success === false || (out.errors && out.errors.length))) throw new Error('GUS rejected the update.');
  } else if (typeof sf.request === 'function') {
    await sf.request({ method: 'PATCH', url: `/services/data/v62.0/sobjects/${u.object}/${u.id}`, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(delta) });
  } else throw new Error('GUS Apps does not expose Salesforce update().');
  return delta;
}
// ── Team people (leadership section on the hub home) ─────────────────────────
const KARTHIK = '005EE00000kbcyIYAQ';
const AMIT = '005B0000005Lg7WIAS', JAYANT = '005B0000001zx4jIAA', RAM = '005B0000001tCGAIA2', AZEEM = '005B0000003OANyIAO', VENKAT = '005B0000006q4KcIAI', PRAMIT = '005EE00000StHjGYAV', BHANU = '005EE00000YvpWrYAJ';
const LEADERS = [AZEEM, JAYANT, RAM, VENKAT, PRAMIT, KARTHIK, BHANU, AMIT]; // CFS leaders: always last, in exactly this order, on every team and list; no visual marking
const leaderRank = id => { const k = LEADERS.indexOf(id); return k < 0 ? -1 : k; };
const PEOPLE = { // leadership configured per team; any other leader already on a team's roster is moved into the leader block too. Amit and Jayant lead every team.
  'Managed Async Processing Team': [AMIT, JAYANT, RAM, PRAMIT, BHANU],
  'Message Queue Team': [AMIT, JAYANT, RAM, PRAMIT, BHANU],
  'VegaStore Team': [AMIT, JAYANT],
  'Caching Services Team': [AMIT, JAYANT],
  'VegaCache Team': [AMIT, JAYANT, AZEEM, VENKAT, KARTHIK, BHANU]
};
const groupOf = g => g === 'maps' ? 'Managed Async Processing Team' : g === 'mq' ? 'Message Queue Team' : g === 'vegacache' ? 'VegaCache Team' : g === 'vegastore' ? 'VegaStore Team' : g === 'caching' ? 'Caching Services Team' : null;
const TEAM_LIKE = { 'Managed Async Processing Team': "Name LIKE 'Managed Async Processing%'", 'Message Queue Team': "Name = 'Message Queue'", 'VegaCache Team': "Name LIKE 'VegaCache%'", 'VegaStore Team': "Name = 'VegaStore'", 'Caching Services Team': "Name = 'Caching Services'" };
const SLACK_PHOTOS = require('./avatars');
const avatarCache = new Map(); // email -> { url, at }; Slack avatars rarely change, so reuse for 6h across requests
const AVATAR_TTL = 6 * 3600e3;
async function slackAvatar(slack, email) {
  if (!email) return null;
  const hit = avatarCache.get(email);
  if (hit && Date.now() - hit.at < AVATAR_TTL) return hit.url;
  let url = null;
  try {
    if (!slack || typeof slack.resolveIdentity !== 'function') throw new Error('no slack');
    const r = await slack.resolveIdentity({ email }), id = r && ((r.user && r.user.id) || r.userId || r.slackUserId || r.id);
    if (id) {
      const pick = pr => pr && (pr.image_512 || pr.image_192 || pr.image_72);
      url = pick(r.user && r.user.profile);
      if (!url && typeof slack.getUser === 'function') { const u = await slack.getUser({ user: id }); url = pick((u && (u.user || u).profile) || {}); }
    }
  } catch (_) { /* avatar is optional */ }
  if (!url) url = SLACK_PHOTOS[String(email).toLowerCase()] || null; // snapshot of Slack profile photos for when the live lookup is unavailable
  if (url) avatarCache.set(email, { url, at: Date.now() });
  return url || null;
}
async function getPeople(sf, slack, group) {
  const name = groupOf(group);
  if (!name) return { name: null, people: [] };
  const lead = PEOPLE[name];
  const memberRows = (await sf.query(`SELECT Member_Name__c FROM ADM_Scrum_Team_Member__c WHERE Scrum_Team__r.Active__c = true AND Scrum_Team__r.${TEAM_LIKE[name]} LIMIT 200`)).records || [];
  let own = memberRows.map(r => r.Member_Name__c).filter(Boolean);
  if (name === 'Message Queue Team') { // anyone already shown under MAPS is not repeated under MQ (leadership stays on both)
    const maps = new Set(((await sf.query(`SELECT Member_Name__c FROM ADM_Scrum_Team_Member__c WHERE Scrum_Team__r.Active__c = true AND Scrum_Team__r.${TEAM_LIKE['Managed Async Processing Team']} LIMIT 200`)).records || []).map(r => r.Member_Name__c));
    own = own.filter(i => !maps.has(i));
  }
  // Karthik Sethuraman's direct reports are part of the team he is on
  if (own.includes(KARTHIK) || lead.includes(KARTHIK)) own.push(...((await sf.query(`SELECT Id FROM User WHERE IsActive = true AND ManagerId = '${KARTHIK}' LIMIT 100`)).records || []).map(r => r.Id));
  const ids = [...new Set([...lead, ...own])];
  const rows = (await sf.query(`SELECT Id, Name, Title, Email, SmallPhotoUrl FROM User WHERE IsActive = true AND Id IN (${ids.map(i => `'${q(i)}'`).join(',')})`)).records || [];
  const byId = new Map(rows.map(r => [r.Id, r]));
  const ordered = ids.filter(i => byId.has(i)).map(i => byId.get(i));
  const rest = ordered.filter(u => leaderRank(u.Id) < 0).sort((a, b) => a.Name.localeCompare(b.Name));
  const list = [...rest, ...LEADERS.filter(i => byId.has(i)).map(i => byId.get(i))];
  const people = [];
  for (let k = 0; k < list.length; k += 10)
    people.push(...await Promise.all(list.slice(k, k + 10).map(async u => ({ id: u.Id, name: u.Name, role: u.Title || '', avatar: (await slackAvatar(slack, u.Email)) || u.SmallPhotoUrl || null, alt: u.SmallPhotoUrl || null }))));
  return { name, people };
}

// ── Test failures (Patch = scheduled for a patch build such as 264.5; Main = everything else) ──
async function getTests(sf, teamId) {
  requireTeam(teamId);
  const res = await sf.query(
    `SELECT Id, Name, Subject__c, Status__c, Assignee__c, Assignee__r.Name, Found_In_Build__r.Name, Scheduled_Build__r.Name, CreatedDate ` +
    `FROM ADM_Work__c WHERE Scrum_Team__c = '${teamId}' AND Type__c = 'Test Failure' AND Status__c NOT IN (${inList(CLOSED_STATUSES)}) AND (NOT Status__c LIKE 'Closed%') ` +
    `ORDER BY CreatedDate ASC LIMIT 500`);
  const now = Date.now();
  const rows = (res.records || []).map(w => ({
    id: w.Id, name: w.Name, subject: w.Subject__c || '', status: w.Status__c, assigneeId: w.Assignee__c, assignee: (w.Assignee__r && w.Assignee__r.Name) || '',
    found: (w.Found_In_Build__r && w.Found_In_Build__r.Name) || '', scheduled: (w.Scheduled_Build__r && w.Scheduled_Build__r.Name) || '',
    created: w.CreatedDate, age: Math.floor((now - new Date(w.CreatedDate)) / 864e5)
  }));
  const isPatch = r => r.scheduled.includes('.');
  return { patch: rows.filter(isPatch), main: rows.filter(r => !isPatch(r)), truncated: rows.length >= 500 };
}

async function updateGus(sf, updates) {
  if (!Array.isArray(updates) || !updates.length || updates.length > 25) throw new Error('Send between 1 and 25 updates.');
  const out = await Promise.allSettled(updates.map(u => updateOne(sf, u)));
  return { results: out.map((r, i) => r.status === 'fulfilled' ? { id: updates[i].id, ok: true, saved: r.value, at: Date.now() } : { id: updates[i] && updates[i].id, ok: false, error: String((r.reason && r.reason.message) || r.reason).slice(0, 300) }) };
}

const PICKLISTS = {
  workStatus: ['New', 'Triaged', 'In Progress', 'Waiting', 'Ready for Review', 'QA In Progress', 'Fixed', 'Closed', 'Never', 'Duplicate', 'Not a bug', 'Not Reproducible'],
  priority: ['P0', 'P1', 'P2', 'P3', 'P4'],
  tdStatus: ['New', 'Under Review', 'Committed', 'In Progress', 'At Risk', 'Blocked', 'Completed', 'Never']
};
async function getPicklists(sf) {
  const lists = { ...PICKLISTS };
  const load = async (object, field, key) => {
    try {
      const d = await sf.request(`/services/data/v62.0/sobjects/${object}/describe`);
      const f = (d.fields || []).find(x => x.name === field);
      const v = f && (f.picklistValues || []).filter(p => p.active !== false).map(p => p.value);
      if (v && v.length) lists[key] = v;
    } catch (_) { /* keep defaults */ }
  };
  if (typeof sf.request === 'function') await Promise.all([load('ADM_Work__c', 'Status__c', 'workStatus'), load('ADM_Work__c', 'Priority__c', 'priority'), load('ADM_Team_Dependency__c', 'Dependency_Status__c', 'tdStatus')]);
  return lists;
}

module.exports = { getTests, getPeople, getSla, getChampion, saveChampion, getTeams, getMembers, getBugs, getTds, getHome, getRotation, saveRotation, updateGus, getPicklists, requireTeam, WRITABLE, __test: { cleanRota, updateOne, computeSla } };
