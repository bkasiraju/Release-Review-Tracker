'use strict';
/* Release Planning: engineers' draft plan (projects, epics, workstreams, leaves) lives in GUS Apps storage per team.
 * Only epics above the line (ABL) are written to GUS, on an explicit confirm: project (+ program) -> epic with planned release, priority, effort. */
const SF_ID = /^[a-zA-Z0-9]{15,18}$/, ISO = /^\d{4}-\d{2}-\d{2}$/, LOCAL = /^[A-Za-z0-9_-]{1,40}$/;
const MAX = { projects: 80, epics: 300, workstreams: 40, people: 200 };
const planKey = teamId => { if (!SF_ID.test(String(teamId || ''))) throw new Error('Unknown team'); return 'plan-' + teamId; };
const text = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const wsLine = (e, w) => (e.line === 'BTL' ? 'BTL' : (w.line || e.line));
const effortOf = (e, includeBtl) => Math.round(e.workstreams.filter(w => includeBtl || wsLine(e, w) === 'ABL').reduce((a, w) => a + w.days, 0) * 100) / 100;
const days = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, 1000) : 0; };
const gid = v => SF_ID.test(String(v || '')) ? String(v) : '';
const lid = (v, i, p) => LOCAL.test(String(v || '')) ? String(v) : p + i;
const soql = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const ok = r => r && r.success !== false && !(r.errors && r.errors.length);
const newId = r => (r && (r.id || r.Id)) || '';

const crypto = require('crypto');
const hash = o => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 24);
const wsEngNames = w => (w.engNames && w.engNames.length ? w.engNames : [w.engName].filter(Boolean)).join(', ');
/** Fingerprint of one workstream as written to GUS (inside the epic description and effort). */
const wsHash = (e, w) => hash([w.name, wsEngNames(w), w.days, w.status || '', wsLine(e, w)]);
/** Everything written to the GUS epic; an unchanged fingerprint means GUS already has exactly this, so nothing is sent. */
const epicPayload = (e, project, includeBtl, projectId) => {
  const fields = { Project__c: projectId || (project && project.gusId) || '', Planned_Release__c: e.releaseId, Planned_Story_Points__c: effortOf(e, includeBtl) };
  if (e.priority != null) fields.Priority__c = e.priority;
  const extra = { Description__c: epicDescription(e, project, includeBtl) };
  if (e.owners && e.owners[0]) extra.Development_Lead__c = e.owners[0];
  return { name: e.name, fields, extra };
};
const epicHash = (e, project, includeBtl) => hash(epicPayload(e, project, includeBtl, project && project.gusId));
/** Delta of an already-saved epic against what was last written: which workstreams are new/changed/removed. */
function deltaOf(e, project, includeBtl) {
  if (!e.gusId) return { action: 'create', changes: [], wsFlags: {} };
  const sy = e.synced || null, wsFlags = {}, changes = [];
  const inc = e.workstreams.filter(w => includeBtl || wsLine(e, w) === 'ABL');
  for (const w of inc) {
    const prev = sy && sy.ws && sy.ws[w.id], cur = wsHash(e, w);
    wsFlags[w.id] = !sy ? 'changed' : prev === undefined ? 'new' : prev === cur ? 'unchanged' : 'changed';
    if (wsFlags[w.id] === 'new') changes.push('New workstream: ' + (w.name || '(unnamed)'));
    else if (wsFlags[w.id] === 'changed' && sy) changes.push('Changed workstream: ' + (w.name || '(unnamed)'));
  }
  if (sy && sy.ws) for (const id of Object.keys(sy.ws)) if (!inc.some(w => w.id === id)) changes.push('Removed a workstream');
  const unchanged = !!(sy && sy.hash === epicHash(e, project, includeBtl));
  if (!unchanged && !changes.length) changes.push(sy ? 'Epic details changed' : 'First sync of this epic');
  return { action: unchanged ? 'unchanged' : 'update', changes: unchanged ? [] : changes, wsFlags };
}

const STATUS = ['Planned', 'In Progress', 'Completed', 'On Hold'];
function cleanPlan(input) {
  const p = input && typeof input === 'object' ? input : {};
  const w = p.window || {};
  const projects = (Array.isArray(p.projects) ? p.projects : []).slice(0, MAX.projects).map((x, i) => ({
    id: lid(x.id, i, 'p'), name: text(x.name, 120), programId: gid(x.programId), programName: text(x.programName, 120), theme: text(x.theme, 80), short: text(x.short, 30), gusId: gid(x.gusId)
  }));
  const epics = (Array.isArray(p.epics) ? p.epics : []).slice(0, MAX.epics).map((x, i) => ({
    id: lid(x.id, i, 'e'), projectId: lid(x.projectId, 0, ''), name: text(x.name, 255), line: x.line === 'ABL' ? 'ABL' : 'BTL',
    priority: Number.isFinite(Number(x.priority)) && x.priority !== '' && x.priority != null ? Math.min(Math.max(Math.round(Number(x.priority)), 0), 9999) : null,
    theme: text(x.theme, 80), hrp: text(x.hrp, 80), v2mom: text(x.v2mom, 80), estimate: days(x.estimate), status: STATUS.includes(x.status) ? x.status : '', doc: /^https?:\/\//i.test(String(x.doc || '')) ? text(x.doc, 300) : '',
    owners: (Array.isArray(x.owners) ? x.owners : []).map(gid).filter(Boolean).slice(0, 12), ownerNames: (Array.isArray(x.ownerNames) ? x.ownerNames : []).slice(0, 12).map(n => text(n, 80)),
    releaseId: gid(x.releaseId), releaseName: text(x.releaseName, 120), gusId: gid(x.gusId),
    synced: x.synced && typeof x.synced === 'object' && /^[0-9a-f]{24}$/.test(String(x.synced.hash || '')) ? { hash: x.synced.hash, at: text(x.synced.at, 40), ws: Object.fromEntries(Object.entries(x.synced.ws && typeof x.synced.ws === 'object' ? x.synced.ws : {}).filter(([k, v]) => LOCAL.test(k) && /^[0-9a-f]{24}$/.test(String(v))).slice(0, MAX.workstreams)) } : null,
    workstreams: (Array.isArray(x.workstreams) ? x.workstreams : []).slice(0, MAX.workstreams).map((s, j) => ({
      id: lid(s.id, j, 'w'), name: text(s.name, 120), status: STATUS.includes(s.status) ? s.status : '', engIds: (Array.isArray(s.engIds) ? s.engIds : []).map(gid).filter(Boolean).slice(0, 12), engNames: (Array.isArray(s.engNames) ? s.engNames : []).slice(0, 12).map(n => text(n, 80)), priority: Number.isFinite(Number(s.priority)) && s.priority !== '' && s.priority != null ? Math.min(Math.max(Math.round(Number(s.priority)), 0), 9999) : null, engId: gid(s.engId), engName: text(s.engName, 80), days: days(s.days), line: s.line === 'ABL' || s.line === 'BTL' ? s.line : '', sprint: text(s.sprint, 60)
    }))
  }));
  const people = {};
  for (const [k, v] of Object.entries(p.people && typeof p.people === 'object' ? p.people : {}).slice(0, MAX.people)) {
    if (!SF_ID.test(k)) continue;
    people[k] = { name: text(v && v.name, 80), leave: days(v && v.leave), holiday: days(v && v.holiday), oncall: days(v && v.oncall), ...(v && v.total != null && v.total !== '' ? { total: days(v.total) } : {}) };
  }
  const last = p.lastCommit && typeof p.lastCommit === 'object' ? { at: text(p.lastCommit.at, 40), created: Number(p.lastCommit.created) || 0, updated: Number(p.lastCommit.updated) || 0 } : null;
  return { window: { start: ISO.test(w.start) ? w.start : '', end: ISO.test(w.end) ? w.end : '' }, people, projects, epics, lastCommit: last };
}

// Programs are per team and release, named "<Team> - <release>" in GUS
const PROGRAM_RELEASE = '268';

async function getPlan(store, teamId) {
  const doc = await store.get('settings', planKey(teamId));
  return { plan: cleanPlan(doc && doc.plan), revision: (doc && doc.revision) || null, updatedAt: (doc && doc.updatedAt) || null };
}
async function savePlan(store, teamId, plan, expected) {
  const saved = await store.put('settings', planKey(teamId), { plan: cleanPlan(plan) }, expected === undefined ? undefined : expected);
  return { plan: cleanPlan(saved.plan), revision: saved.revision, updatedAt: saved.updatedAt };
}

// Reference data for the pickers. Each lookup fails soft so the planner still opens.
async function getRefs(sf, teamId) {
  planKey(teamId);
  const warnings = [], safe = (label, p) => p.then(r => (r && r.records) || [], e => { warnings.push(label + ': ' + (e && e.message || 'unavailable')); return []; });
  const [releases, programs, used, sprints] = await Promise.all([
    safe('Planned releases', teamReleases(sf, teamId, true).then(r => ({ records: r }))),
    safe('Programs', sf.query(`SELECT Id, Name FROM PPM_Program__c WHERE Name LIKE '% - ${PROGRAM_RELEASE}' ORDER BY Name LIMIT 200`)),
    safe('Projects', sf.query(`SELECT Project__c p, Project__r.Name n, Project__r.Program__c g, Project__r.Program__r.Name gn FROM ADM_Epic__c WHERE Team__c = '${teamId}' AND Project__c != null GROUP BY Project__c, Project__r.Name, Project__r.Program__c, Project__r.Program__r.Name LIMIT 500`)),
    safe('Sprints', sf.query(`SELECT Name, Start_Date__c, End_Date__c FROM ADM_Sprint__c WHERE Scrum_Team__c = '${teamId}' AND End_Date__c >= LAST_N_DAYS:14 ORDER BY Start_Date__c LIMIT 16`))
  ]);
  return {
    releases: releases.map(r => ({ id: r.Id, name: r.Name })),
    programs: programs.map(r => ({ id: r.Id, name: r.Name })),
    projects: used.map(r => ({ id: r.p, name: r.n, programId: r.g || '', programName: r.gn || '' })).sort((a, b) => a.name.localeCompare(b.name)),
    sprints: sprints.map(r => ({ name: r.Name, start: r.Start_Date__c, end: r.End_Date__c })),
    warnings
  };
}

// Validate ABL epics against the saved plan and describe exactly what a commit would do.
async function teamShort(sf, teamId) {
  const t = ((await sf.query(`SELECT Name FROM ADM_Scrum_Team__c WHERE Id = '${teamId}' LIMIT 1`)).records || [])[0];
  if (!t) return null;
  return /message queue/i.test(t.Name) ? 'MQ' : /maps|managed async/i.test(t.Name) ? 'MAPS' : String(t.Name).replace(/\s*\(.*\)/, '');
}
const releasePrefix = n => String(n || '').replace(/\s*-?\s*\d+\s*$/, '').trim().toLowerCase();

// A team's planned releases are named "<Team> 266", "<Team> - 256" ... but GUS files some of them on a sibling scrum team
// (e.g. MQ 268 sits on the MAPS team), so match by name across teams as well as the team's own list. Teams with no
// name match (Caching Services) fall back to their own list.
async function teamReleases(sf, teamId, futureOnly) {
  const short = await teamShort(sf, teamId).catch(() => null);
  const when = futureOnly ? ' AND (End_Date__c >= TODAY OR End_Date__c = null)' : '';
  const own = ((await sf.query(`SELECT Id, Name FROM ADM_Planned_Release__c WHERE Team__c = '${teamId}'${when} ORDER BY Start_Date__c, Name LIMIT 100`)).records || []);
  if (!short) return own;
  const byName = ((await sf.query(`SELECT Id, Name FROM ADM_Planned_Release__c WHERE Name LIKE '${soql(short)} %'${when} ORDER BY Start_Date__c, Name LIMIT 100`).catch(() => ({}))).records || []);
  const seen = new Set(), names = new Set(), mine = [...own, ...byName].filter(r => !seen.has(r.Id) && seen.add(r.Id) && releasePrefix(r.Name) === short.toLowerCase() && !names.has(r.Name) && names.add(r.Name));
  return mine.length ? mine : own;
}

async function teamProgram(sf, teamId) {
  try {
    const short = await teamShort(sf, teamId);
    if (!short) return null;
    const p = ((await sf.query(`SELECT Id, Name FROM PPM_Program__c WHERE Name = '${soql(short)} - ${PROGRAM_RELEASE}' LIMIT 1`)).records || [])[0];
    return p ? { id: p.Id, name: p.Name } : null;
  } catch (_) { return null; }
}

/** Epic description written to GUS: plan context plus the workstream breakdown, so the GUS epic carries every planned detail. */
function epicDescription(e, project, includeBtl) {
  const L = [];
  if (project) L.push('Project: ' + (project.name || '') + (project.short ? ' (' + project.short + ')' : ''));
  if (e.releaseName) L.push('Planned release: ' + e.releaseName);
  L.push('Line: ' + (e.line === 'ABL' ? 'Above the line (ABL)' : 'Below the line (BTL)'));
  if (e.status) L.push('Status: ' + e.status);
  if (e.theme) L.push('Theme: ' + e.theme);
  if (e.hrp) L.push('HRP: ' + e.hrp);
  if (e.v2mom) L.push('V2MOM: ' + e.v2mom);
  if (e.ownerNames && e.ownerNames.length) L.push('Owner(s): ' + e.ownerNames.join(', '));
  if (e.doc) L.push('Design doc: ' + e.doc);
  L.push('Planned effort: ' + effortOf(e, includeBtl) + ' days');
  const ws = e.workstreams.filter(w => includeBtl || wsLine(e, w) === 'ABL');
  if (ws.length) { L.push('', 'Workstreams:'); for (const w of ws) L.push('- ' + (w.name || '(unnamed)') + ' | ' + ((w.engNames && w.engNames.length ? w.engNames : [w.engName].filter(Boolean)).join(', ') || 'unassigned') + ' | ' + w.days + 'd' + (w.status ? ' | ' + w.status : '')); }
  L.push('', 'Created from the Release Intelligence release plan.');
  return L.join('\n').slice(0, 30000);
}

// New projects are tagged to the team's program automatically; `program` is that program (or null when GUS has none).
function review(plan, releaseIds, program, includeBtl) {
  const byProject = new Map(plan.projects.map(p => [p.id, p]));
  const items = [], blockers = [];
  for (const e of plan.epics.filter(x => includeBtl || x.line === 'ABL')) {
    const problems = [], project = byProject.get(e.projectId), effort = effortOf(e, includeBtl);
    if (!e.name) problems.push('Epic name is required');
    if (!project) problems.push('Select a project');
    else {
      if (!project.name) problems.push('Project needs a name');
      if (!project.gusId && !program) problems.push(`No “${PROGRAM_RELEASE}” program found in GUS for this team, so project “${project.name || '?'}” cannot be tagged to one`);
    }
    if (!e.gusId && e.name && plan.epics.some(o => o !== e && !o.gusId && o.name.toLowerCase() === e.name.toLowerCase() && (includeBtl || o.line === 'ABL'))) problems.push('Another unsaved epic has the same name; rename one so GUS does not get duplicates');
    if (!e.releaseId) problems.push('Select a planned release');
    else if (releaseIds && !releaseIds.has(e.releaseId)) problems.push('Planned release does not belong to this team');
    if (!(effort > 0)) problems.push('Add effort (days) on at least one workstream');
    const dl = deltaOf(e, project, includeBtl), item = { delta: dl.changes, epicId: e.id, name: e.name, project: project ? project.name : '', program: project ? (project.gusId ? project.programName : (program ? program.name : '')) : '', projectAction: project ? (project.gusId ? 'existing' : 'create-or-link') : '', release: e.releaseName, priority: e.priority, effort, action: dl.action, problems, line: e.line, status: e.status, theme: e.theme, hrp: e.hrp, v2mom: e.v2mom, doc: e.doc, owners: e.ownerNames || [], workstreams: e.workstreams.filter(w => includeBtl || wsLine(e, w) === 'ABL').map(w => ({ flag: e.gusId ? dl.wsFlags[w.id] : 'new', name: w.name, eng: (w.engNames && w.engNames.length ? w.engNames : [w.engName].filter(Boolean)).join(', '), days: w.days, status: w.status })), description: epicDescription(e, project, includeBtl) };
    items.push(item);
    if (problems.length) blockers.push({ epicId: e.id, name: e.name || '(unnamed epic)', problems });
  }
  return { counts: { create: items.filter(i => i.action === 'create').length, update: items.filter(i => i.action === 'update').length, unchanged: items.filter(i => i.action === 'unchanged').length }, items, blockers, skipped: includeBtl ? 0 : plan.epics.filter(x => x.line !== 'ABL').length };
}

const inFlight = new Set();
async function commitPlan(sf, store, teamId, confirm, includeBtl, acknowledged) {
  planKey(teamId);
  if (!confirm) return commitRun(sf, store, teamId, confirm, includeBtl, acknowledged);
  // One save per team at a time: a double click or second tab can never race into duplicate epics.
  if (inFlight.has(teamId)) throw new Error('A save to GUS is already running for this team. Wait for it to finish, then review again.');
  inFlight.add(teamId);
  try { return await commitRun(sf, store, teamId, confirm, includeBtl, acknowledged); } finally { inFlight.delete(teamId); }
}
async function commitRun(sf, store, teamId, confirm, includeBtl, acknowledged) {
  if (confirm && acknowledged === false) throw new Error('Review the summary and accept it before the epics are created in GUS.');
  const { plan } = await getPlan(store, teamId);
  const rel = await teamReleases(sf, teamId, false).then(r => new Set(r.map(x => x.Id)), () => null);
  const program = await teamProgram(sf, teamId);
  const preview = review(plan, rel, program, includeBtl === true);
  if (!confirm) return { preview };
  if (!preview.items.length) throw new Error('No epics to save. Mark epics ABL (or include below-the-line epics) to save them to GUS.');
  if (preview.blockers.length) throw new Error(`Fix ${preview.blockers.length} epic(s) before saving to GUS.`);
  const actionOf = new Map(preview.items.map(i => [i.epicId, i]));
  const done = { projects: new Map(), epics: new Map(), synced: new Map() }, results = [];
  const byProject = new Map(plan.projects.map(p => [p.id, p]));
  for (const e of plan.epics.filter(x => includeBtl === true || x.line === 'ABL')) {
    const project = byProject.get(e.projectId), r = { epicId: e.id, name: e.name };
    const pv = actionOf.get(e.id);
    if (pv && pv.action === 'unchanged') { r.ok = true; r.action = 'unchanged (already in GUS, nothing sent)'; r.skipped = true; r.gusId = e.gusId; results.push(r); continue; }
    try {
      let projectId = project.gusId || done.projects.get(project.id);
      if (!projectId) {
        const hit = ((await sf.query(`SELECT Id FROM PPM_Project__c WHERE Name = '${soql(project.name)}' AND Program__c = '${program.id}' LIMIT 1`)).records || [])[0];
        if (hit) { projectId = hit.Id; r.project = 'linked existing project'; }
        else {
          const c = await sf.create('PPM_Project__c', { Name: project.name, Program__c: program.id });
          if (!ok(c) || !newId(c)) throw new Error('GUS rejected the project: ' + ((c && c.errors) || []).join(', '));
          projectId = newId(c); r.project = 'created project';
        }
        done.projects.set(project.id, projectId);
      }
      const effort = effortOf(e, includeBtl === true);
      const fields = { Project__c: projectId, Planned_Release__c: e.releaseId, Planned_Story_Points__c: effort };
      if (e.priority != null) fields.Priority__c = e.priority;
      // Richer details (description, development lead); if the org rejects them the epic is still saved with the core fields.
      const extra = { Description__c: epicDescription(e, project, includeBtl === true) };
      if (e.owners && e.owners[0]) extra.Development_Lead__c = e.owners[0];
      const attempt = async (fn) => {
        try { const x = await fn({ ...fields, ...extra }); if (x && !ok(x)) throw new Error((x.errors || []).join(', ')); return x; }
        catch (err) { r.note = 'saved without description/lead (' + String(err && err.message || err).slice(0, 120) + ')'; return fn(fields); }
      };
      let epicId = e.gusId;
      if (!epicId) {
        const hit = ((await sf.query(`SELECT Id FROM ADM_Epic__c WHERE Name = '${soql(e.name)}' AND Team__c = '${teamId}' LIMIT 1`)).records || [])[0];
        if (hit) epicId = hit.Id;
      }
      if (epicId) {
        const u = await attempt(f => sf.update('ADM_Epic__c', epicId, f));
        if (u && !ok(u)) throw new Error('GUS rejected the epic update.');
        r.action = e.gusId ? 'updated' : 'linked and updated existing epic';
      } else {
        const c = await attempt(f => sf.create('ADM_Epic__c', { Name: e.name, Team__c: teamId, ...f }));
        if (!ok(c) || !newId(c)) throw new Error('GUS rejected the epic: ' + ((c && c.errors) || []).join(', '));
        epicId = newId(c); r.action = 'created';
      }
      done.epics.set(e.id, epicId); r.gusId = epicId; r.ok = true;
      if (pv && pv.delta && pv.delta.length) r.note = [r.note, pv.delta.join('; ')].filter(Boolean).join(' · ').slice(0, 300);
      done.synced.set(e.id, { hash: hash(epicPayload(e, project, includeBtl === true, projectId)), at: new Date().toISOString(), ws: Object.fromEntries(e.workstreams.filter(w => includeBtl === true || wsLine(e, w) === 'ABL').map(w => [w.id, wsHash(e, w)])) });
    } catch (err) { r.ok = false; r.error = String(err && err.message || err).slice(0, 300); }
    results.push(r);
  }
  // Record the GUS ids on a fresh copy so concurrent engineer edits are kept and a retry never duplicates records.
  const fresh = await getPlan(store, teamId), next = fresh.plan;
  for (const p of next.projects) if (done.projects.has(p.id)) p.gusId = done.projects.get(p.id);
  for (const e of next.epics) if (done.epics.has(e.id)) { e.gusId = done.epics.get(e.id); if (done.synced.has(e.id)) e.synced = done.synced.get(e.id); }
  const good = results.filter(x => x.ok);
  next.lastCommit = { at: new Date().toISOString(), created: good.filter(x => x.action === 'created').length, updated: good.filter(x => x.action !== 'created' && !x.skipped).length };
  let saved = null, saveError = null;
  try { saved = await savePlan(store, teamId, next, fresh.revision); } catch (err) { saveError = String(err && err.message || err); }
  return { results, failed: results.filter(x => !x.ok).length, plan: saved && saved.plan, revision: saved && saved.revision, saveError };
}

module.exports = { getPlan, savePlan, getRefs, commitPlan, review, cleanPlan };
