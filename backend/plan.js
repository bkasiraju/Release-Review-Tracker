'use strict';
/* Release Planning: engineers' draft plan (projects, epics, workstreams, leaves) lives in GUS Apps storage per team.
 * Only epics above the line (ABL) are written to GUS, on an explicit confirm: project (+ program) -> epic with planned release, priority, effort. */
const SF_ID = /^[a-zA-Z0-9]{15,18}$/, ISO = /^\d{4}-\d{2}-\d{2}$/, LOCAL = /^[A-Za-z0-9_-]{1,40}$/;
const MAX = { projects: 300, epics: 300, workstreams: 40, people: 200 };
const planKey = teamId => { if (!SF_ID.test(String(teamId || ''))) throw new Error('Unknown team'); return 'plan-' + teamId; };
const text = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const wsLine = (e, w) => (e.line === 'BTL' ? 'BTL' : (w.line || e.line));
const effortOf = (e, includeBtl) => Math.round(e.workstreams.filter(w => includeBtl || wsLine(e, w) === 'ABL').reduce((a, w) => a + w.days, 0) * 100) / 100;
const days = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, 1000) : 0; };
const gid = v => SF_ID.test(String(v || '')) ? String(v) : '';
const lid = (v, i, p) => LOCAL.test(String(v || '')) ? String(v) : p + i;
const soql = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const ok = r => r && r.success !== false && !(r.errors && r.errors.length);
const errText = c => ((c && c.errors) || []).map(x => (x && (x.message || x.statusCode || x.errorCode)) || x).join(', ');
const plain = m => String(m || '').replace(/<[^>]*(?:>|$)/g, '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(); // GUS error text can carry HTML links
const newId = r => (r && (r.id || r.Id)) || '';

const { SEED_VERSION, SEED_PROJECTS } = require('./seed-projects');
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
  if (e.owners && e.owners[0]) { extra.Development_Lead__c = e.owners[0]; extra.OwnerId = e.owners[0]; } // the epic owner is the development lead
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
    id: lid(x.id, i, 'p'), name: text(x.name, 120), programId: gid(x.programId), programName: text(x.programName, 120), theme: text(x.theme, 80), short: text(x.short, 30), method: text(x.method, 1000), gusId: gid(x.gusId)
  }));
  const epics = (Array.isArray(p.epics) ? p.epics : []).slice(0, MAX.epics).map((x, i) => ({
    id: lid(x.id, i, 'e'), projectId: lid(x.projectId, 0, ''), name: text(x.name, 255), line: x.line === 'ABL' ? 'ABL' : 'BTL',
    priority: Number.isFinite(Number(x.priority)) && x.priority !== '' && x.priority != null ? Math.min(Math.max(Math.round(Number(x.priority)), 0), 9999) : null,
    theme: text(x.theme, 80), hrp: text(x.hrp, 80), v2mom: text(x.v2mom, 80), estimate: days(x.estimate), status: STATUS.includes(x.status) ? x.status : '', doc: /^https?:\/\//i.test(String(x.doc || '')) ? text(x.doc, 300) : '',
    owners: (Array.isArray(x.owners) ? x.owners : []).map(gid).filter(Boolean).slice(0, 12), ownerNames: (Array.isArray(x.ownerNames) ? x.ownerNames : []).slice(0, 12).map(n => text(n, 80)),
    releaseId: gid(x.releaseId), releaseName: text(x.releaseName, 120), gusId: gid(x.gusId),
    synced: x.synced && typeof x.synced === 'object' && /^[0-9a-f]{24}$/.test(String(x.synced.hash || '')) ? { hash: x.synced.hash, at: text(x.synced.at, 40), ws: Object.fromEntries(Object.entries(x.synced.ws && typeof x.synced.ws === 'object' ? x.synced.ws : {}).filter(([k, v]) => LOCAL.test(k) && /^[0-9a-f]{24}$/.test(String(v))).slice(0, MAX.workstreams)) } : null,
    workstreams: (Array.isArray(x.workstreams) ? x.workstreams : []).slice(0, MAX.workstreams).map((s, j) => ({
      id: lid(s.id, j, 'w'), gusId: gid(s.gusId), name: text(s.name, 120), status: STATUS.includes(s.status) ? s.status : '', engIds: (Array.isArray(s.engIds) ? s.engIds : []).map(gid).filter(Boolean).slice(0, 12), engNames: (Array.isArray(s.engNames) ? s.engNames : []).slice(0, 12).map(n => text(n, 80)), priority: Number.isFinite(Number(s.priority)) && s.priority !== '' && s.priority != null ? Math.min(Math.max(Math.round(Number(s.priority)), 0), 9999) : null, engId: gid(s.engId), engName: text(s.engName, 80), days: days(s.days), line: s.line === 'ABL' || s.line === 'BTL' ? s.line : '', sprint: text(s.sprint, 60)
    }))
  }));
  const people = {};
  for (const [k, v] of Object.entries(p.people && typeof p.people === 'object' ? p.people : {}).slice(0, MAX.people)) {
    if (!SF_ID.test(k)) continue;
    people[k] = { name: text(v && v.name, 80), leave: days(v && v.leave), holiday: days(v && v.holiday), oncall: days(v && v.oncall), ...(v && v.total != null && v.total !== '' ? { total: days(v.total) } : {}) };
  }
  const last = p.lastCommit && typeof p.lastCommit === 'object' ? { at: text(p.lastCommit.at, 40), created: Number(p.lastCommit.created) || 0, updated: Number(p.lastCommit.updated) || 0 } : null;
  // Catalog projects this team removed from its own dashboard (the shared catalog and other teams are untouched)
  const hiddenProjects = [...new Set((Array.isArray(p.hiddenProjects) ? p.hiddenProjects : []).filter(v => LOCAL.test(String(v || ''))).map(String))].slice(0, MAX.projects);
  return { window: { start: ISO.test(w.start) ? w.start : '', end: ISO.test(w.end) ? w.end : '' }, people, projects, epics, hiddenProjects, lastCommit: last };
}

// Programs are per team and release, named "<Team> - <release>" in GUS
const PROGRAM_RELEASE = '268';

// Projects (and their V2MOM method) are shared by every team: one catalog in storage, merged into each team's plan on read.
// Each team's saved plan still lists the projects its epics use; the catalog is authoritative for the project fields.
const CATALOG_KEY = 'plan-projects';
const PFIELDS = ['name', 'short', 'method', 'theme', 'gusId', 'programId', 'programName'];
const sameProject = (a, b) => !!a && !!b && PFIELDS.every(k => (a[k] || '') === (b[k] || ''));
async function getCatalog(store) {
  const doc = await store.get('settings', CATALOG_KEY);
  let list = doc && Array.isArray(doc.projects) ? doc.projects : [];
  if (!doc || doc.seedVersion !== SEED_VERSION) { // first read after a seed bump: add the missing seed projects once
    const have = new Set(list.map(x => x && x.id));
    list = [...list, ...SEED_PROJECTS.filter(x => !have.has(x.id))].slice(0, MAX.projects);
    try { await store.put('settings', CATALOG_KEY, { projects: list, seedVersion: SEED_VERSION }); } catch (_) { /* seeded in memory; retried on the next read */ }
  }
  return cleanPlan({ projects: list }).projects;
}
function mergeCatalog(plan, catalog) {
  const byId = new Map(catalog.map(c => [c.id, c]));
  const hidden = new Set(plan.hiddenProjects || []), used = new Set(plan.epics.map(e => e.projectId));
  const projects = plan.projects.filter(p => !hidden.has(p.id) || used.has(p.id)).map(p => byId.has(p.id) ? { ...p, ...Object.fromEntries(PFIELDS.map(k => [k, byId.get(p.id)[k]])) } : p);
  const have = new Set(projects.map(p => p.id));
  for (const c of catalog) if (!have.has(c.id) && !hidden.has(c.id) && projects.length < MAX.projects) projects.push(c);
  return { ...plan, projects };
}
async function getPlan(store, teamId) {
  const [doc, catalog] = await Promise.all([store.get('settings', planKey(teamId)), getCatalog(store).catch(() => [])]);
  return { plan: mergeCatalog(cleanPlan(doc && doc.plan), catalog), revision: (doc && doc.revision) || null, updatedAt: (doc && doc.updatedAt) || null };
}
async function savePlan(store, teamId, plan, expected) {
  const key = planKey(teamId), next = cleanPlan(plan);
  const prevDoc = await store.get('settings', key), prev = new Map(cleanPlan(prevDoc && prevDoc.plan).projects.map(p => [p.id, p]));
  const saved = await store.put('settings', key, { plan: next }, expected === undefined ? undefined : expected);
  // Publish what this save changed (added or edited projects) to the shared catalog so other teams see it. Removing a project only hides it for this team (hiddenProjects).
  try {
    const cat = new Map((await getCatalog(store)).map(c => [c.id, c]));
    let dirty = false;
    for (const p of next.projects) if (!sameProject(prev.get(p.id), p) && !sameProject(cat.get(p.id), p)) { cat.set(p.id, p); dirty = true; }
    if (dirty) await store.put('settings', CATALOG_KEY, { projects: [...cat.values()].slice(0, 300) });
  } catch (_) { /* the team plan is saved; the catalog catches up on the next save */ }
  return { plan: mergeCatalog(cleanPlan(saved.plan), await getCatalog(store).catch(() => [])), revision: saved.revision, updatedAt: saved.updatedAt };
}

// Reference data for the pickers. Each lookup fails soft so the planner still opens.
async function getRefs(sf, teamId) {
  planKey(teamId);
  const hit = refsCache.get(teamId);
  if (hit && Date.now() - hit.t < REFS_TTL) return hit.v;
  const v = await loadRefs(sf, teamId);
  if (!v.warnings.length) refsCache.set(teamId, { v, t: Date.now() });
  return v;
}
async function loadRefs(sf, teamId) {
  const warnings = [], safe = (label, p) => p.then(r => (r && r.records) || [], e => { warnings.push(label + ': ' + (e && e.message || 'unavailable')); return []; });
  const [releases, programs, used, sprints, teamProg, tags] = await Promise.all([
    safe('Planned releases', teamReleases(sf, teamId, true).then(r => ({ records: r }))),
    safe('Programs', sf.query(`SELECT Id, Name FROM PPM_Program__c WHERE Name LIKE '% - ${PROGRAM_RELEASE}' ORDER BY Name LIMIT 200`)),
    safe('Projects', sf.query(`SELECT Project__c p, Project__r.Name n, Project__r.Program__c g, Project__r.Program__r.Name gn FROM ADM_Epic__c WHERE Team__c = '${teamId}' AND Project__c != null GROUP BY Project__c, Project__r.Name, Project__r.Program__c, Project__r.Program__r.Name LIMIT 500`)),
    safe('Sprints', sf.query(`SELECT Name, Start_Date__c, End_Date__c FROM ADM_Sprint__c WHERE Scrum_Team__c = '${teamId}' AND End_Date__c >= LAST_N_DAYS:14 ORDER BY Start_Date__c LIMIT 16`)),
    teamProgram(sf, teamId),
    safe('Product tags', sf.query(`SELECT Id, Name FROM ADM_Product_Tag__c WHERE Team__c = '${teamId}' AND Active__c = true ORDER BY Name LIMIT 200`))
  ]);
  // Projects already in the team's program (not only those with this team's epics), so they can be picked rather than retyped.
  const inProg = teamProg ? await safe('Program projects', sf.query(`SELECT Id, Name, V2MOM_Method__c FROM PPM_Project__c WHERE Program__c = '${teamProg.id}' ORDER BY Name LIMIT 500`)) : [];
  const seen = new Map(used.map(r => [r.p, { id: r.p, name: r.n, programId: r.g || '', programName: r.gn || '' }]));
  for (const r of inProg) seen.set(r.Id, { ...(seen.get(r.Id) || { id: r.Id, name: r.Name, programId: teamProg.id, programName: teamProg.name }), method: r.V2MOM_Method__c || '' });
  return {
    releases: releases.map(r => ({ id: r.Id, name: r.Name })),
    programs: programs.map(r => ({ id: r.Id, name: r.Name })),
    projects: [...seen.values()].sort((a, b) => a.name.localeCompare(b.name)),
    sprints: sprints.map(r => ({ name: r.Name, start: r.Start_Date__c, end: r.End_Date__c })),
    program: teamProg || null,
    tags: tags.map(r => ({ id: r.Id, name: r.Name })),
    warnings
  };
}

// Create a project or an epic directly in GUS from the planner's "+ Project" / "+ Epic" dialogs.
// Mandatory: project = name + the team's program; epic = name + team + project + planned release (+ planned effort in days).
const EPIC_NAME_MAX = 80; // ADM_Epic__c.Name length in GUS
const PROJECT_NAME_MAX = 80; // PPM_Project__c.Name length in GUS
async function ensureProject(sf, teamId, project) {
  const rawName = String((project && project.name) || '').trim(), name = text(project && project.name, 120), method = text(project && project.method, 1000);
  if (project && gid(project.gusId)) {
    if (method) { try { await sf.update('PPM_Project__c', gid(project.gusId), { V2MOM_Method__c: method }); } catch (_) { /* method is best effort on an existing project */ } }
    return { id: gid(project.gusId), created: false };
  }
  if (!name) throw new Error('Enter the project (measure) name.');
  if (rawName.length > PROJECT_NAME_MAX) throw new Error(`Project name is ${rawName.length} characters; GUS allows at most ${PROJECT_NAME_MAX}.`);
  const program = await teamProgram(sf, teamId);
  if (!program) throw new Error('This team has no GUS program for the planning release, so a project cannot be created. Ask a plan administrator.');
  const hit = ((await sf.query(`SELECT Id FROM PPM_Project__c WHERE Name = '${soql(name)}' AND Program__c = '${program.id}' LIMIT 1`)).records || [])[0];
  if (hit) {
    if (method) { try { await sf.update('PPM_Project__c', hit.Id, { V2MOM_Method__c: method }); } catch (_) { /* best effort */ } }
    return { id: hit.Id, created: false, program };
  }
  const c = await sf.create('PPM_Project__c', { Name: name, Program__c: program.id, ...(method ? { V2MOM_Method__c: method } : {}) });
  if (!ok(c) || !newId(c)) throw new Error('GUS rejected the project: ' + plain(errText(c)));
  refsCache.delete(teamId);
  return { id: newId(c), created: true, program };
}
async function createProject(sf, teamId, input) {
  planKey(teamId);
  const r = await ensureProject(sf, teamId, { name: input && input.name, method: input && input.method, gusId: input && input.gusId });
  const program = r.program || await teamProgram(sf, teamId);
  return { gusId: r.id, created: r.created, programId: program ? program.id : '', programName: program ? program.name : '' };
}
/** Deletes a project (measure) in GUS. Guarded: it must sit in this team's program and have no epics left in GUS, so shared work is never lost. */
async function deleteProject(sf, teamId, input) {
  planKey(teamId);
  const id = gid(input && input.gusId);
  if (!id) throw new Error('This project is not in GUS.');
  const program = await teamProgram(sf, teamId);
  if (!program) throw new Error('This team has no GUS program for the planning release.');
  const hit = ((await sf.query(`SELECT Id, Name FROM PPM_Project__c WHERE Id = '${id}' AND Program__c = '${program.id}' LIMIT 1`)).records || [])[0];
  if (!hit) throw new Error('That project is not in this team\'s GUS program, so it was not deleted.');
  const n = ((await sf.query(`SELECT COUNT() FROM ADM_Epic__c WHERE Project__c = '${id}'`)).totalSize) || 0;
  if (n) throw new Error(`“${hit.Name}” still has ${n} epic${n === 1 ? '' : 's'} in GUS. Move or delete them in GUS first; the project was not deleted.`);
  try {
    if (typeof sf.delete === 'function') await sf.delete('PPM_Project__c', id);
    else if (typeof sf.request === 'function') await sf.request({ method: 'DELETE', url: '/services/data/v62.0/sobjects/PPM_Project__c/' + id });
    else throw new Error('GUS Apps cannot delete records from this session.');
  } catch (e) {
    throw new Error('GUS refused to delete the project: ' + String(e && e.message || e));
  }
  refsCache.delete(teamId);
  return { deleted: true, gusId: id, name: hit.Name };
}
async function createEpic(sf, teamId, input) {
  planKey(teamId);
  const name = text(input && input.name, 255), releaseId = gid(input && input.releaseId);
  if (!name) throw new Error('Enter the epic name.');
  if (name.length > EPIC_NAME_MAX) throw new Error(`Epic name is ${name.length} characters; GUS allows at most ${EPIC_NAME_MAX}.`);
  const leadId = gid(input && input.leadId);
  if (!leadId) throw new Error('Select the development lead.');
  // The planned release is optional at creation; it is tagged in GUS as soon as one is chosen (now or when the plan is committed).
  const rel = releaseId ? await teamReleases(sf, teamId, false).then(r => new Set(r.map(x => x.Id)), () => null) : null;
  if (releaseId && rel && !rel.has(releaseId)) throw new Error('That release is not one of this team\'s planned releases.');
  const proj = await ensureProject(sf, teamId, input && input.project);
  const effort = days(input && input.effort);
  const hit = ((await sf.query(`SELECT Id FROM ADM_Epic__c WHERE Name = '${soql(name)}' AND Team__c = '${teamId}' LIMIT 1`)).records || [])[0];
  if (hit) return { gusId: hit.Id, projectGusId: proj.id, projectCreated: proj.created, created: false };
  const base = { Name: name, Team__c: teamId, Project__c: proj.id, ...(releaseId ? { Planned_Release__c: releaseId } : {}), Development_Lead__c: leadId, Planned_Story_Points__c: effort };
  // The epic owner is the development lead; if GUS refuses that owner, fall back to the default owner.
  let c = await sf.create('ADM_Epic__c', { ...base, OwnerId: leadId }).catch(e => ({ success: false, errors: [String(e && e.message || e)] }));
  if (!ok(c) || !newId(c)) c = await sf.create('ADM_Epic__c', base);
  if (!ok(c) || !newId(c)) throw new Error('GUS rejected the epic: ' + plain(errText(c)));
  refsCache.delete(teamId);
  return { gusId: newId(c), projectGusId: proj.id, projectCreated: proj.created, created: true };
}

// A workstream in GUS is a parent User Story ("WS: <name>") on the epic, so engineers' own stories hang under it via Parent__c.
// One generic theme marks it, so workstreams are easy to tell apart from engineers' user stories.
const WS_PREFIX = 'WS: ', THEME_NAME_MAX = 80;
// One generic theme separates workstream stories from the engineers' user stories: R<release>_<team>_Workstream, e.g. R268_MQ_Workstream.
const THEME_SHORT = [[/message queue/i, 'MQ'], [/\bmaps\b|managed async/i, 'MAPS'], [/vegacache.*\bface\b/i, 'VC-FACE'], [/vegastore/i, 'VS'], [/vegacache|caching services/i, 'VC']];
const themeShort = name => (THEME_SHORT.find(([re]) => re.test(String(name || ''))) || [])[1] || '';
const wsThemeName = (release, short) => short ? `R${release}_${short}_Workstream`.slice(0, THEME_NAME_MAX) : '';
async function teamName(sf, teamId) {
  const t = ((await sf.query(`SELECT Name FROM ADM_Scrum_Team__c WHERE Id = '${teamId}' LIMIT 1`)).records || [])[0];
  return t ? t.Name : '';
}
// GUS theme names are unique across the org, so a theme another team (or an earlier run) already owns is reused instead of re-created.
async function ensureTheme(sf, teamId, name) {
  const find = async scope => (((await sf.query(`SELECT Id FROM ADM_Theme__c WHERE Name = '${soql(name)}'${scope} LIMIT 1`)).records || [])[0] || {}).Id;
  const hit = await find(` AND Scrum_Team__c = '${teamId}'`) || await find('');
  if (hit) return hit;
  let c;
  try { c = await sf.create('ADM_Theme__c', { Name: name, Scrum_Team__c: teamId, Active__c: true }); }
  catch (e) { c = { errors: [String(e && e.message || e)] }; }
  if (ok(c) && newId(c)) return newId(c);
  const msg = errText(c);
  if (/already exists|duplicate/i.test(msg)) { const id = await find(''); if (id) return id; } // created by someone else a moment ago
  throw new Error('GUS rejected the theme "' + name + '": ' + plain(msg));
}
async function assignTheme(sf, themeId, workId) {
  const hit = ((await sf.query(`SELECT Id FROM ADM_Theme_Assignment__c WHERE Theme__c = '${themeId}' AND Work__c = '${workId}' LIMIT 1`)).records || [])[0];
  if (hit) return;
  const c = await sf.create('ADM_Theme_Assignment__c', { Theme__c: themeId, Work__c: workId });
  if (!ok(c)) throw new Error('GUS rejected the theme assignment: ' + plain(errText(c)));
}
// GUS rejects a User Story whose details are under 20 characters.
const wsDetails = (epic, name, d) => `Workstream "${name}" of epic "${epic}"${d ? ` (planned ${d} days)` : ''}. Engineers add their work items as child stories of this story (Parent).`.slice(0, 2000);
async function createWorkstream(sf, teamId, input) {
  planKey(teamId);
  const epicId = gid(input && input.epicGusId), name = text(input && input.name, 200), assigneeId = gid(input && input.assigneeId), tagId = gid(input && input.tagId);
  if (!epicId) throw new Error('The epic is not in GUS yet. Create the epic first, then add its workstreams.');
  if (!name) throw new Error('Enter the workstream name.');
  const epic = ((await sf.query(`SELECT Id, Name, Planned_Release__r.Name FROM ADM_Epic__c WHERE Id = '${epicId}' AND Team__c = '${teamId}' LIMIT 1`)).records || [])[0];
  if (!epic) throw new Error('That epic does not belong to this team.');
  if (!tagId) throw new Error('Select a product tag. GUS requires one on every user story.');
  {
    const t = ((await sf.query(`SELECT Id FROM ADM_Product_Tag__c WHERE Id = '${tagId}' AND Team__c = '${teamId}' AND Active__c = true LIMIT 1`)).records || [])[0];
    if (!t) throw new Error('That product tag is not one of this team\'s active tags.');
  }
  const subject = WS_PREFIX + name;
  let workId = (((await sf.query(`SELECT Id FROM ADM_Work__c WHERE Epic__c = '${epicId}' AND Subject__c = '${soql(subject)}' AND RecordType.Name = 'User Story' LIMIT 1`)).records || [])[0] || {}).Id, created = false;
  if (!workId) {
    const rt = ((await sf.query(`SELECT Id FROM RecordType WHERE SobjectType = 'ADM_Work__c' AND Name = 'User Story' AND IsActive = true LIMIT 1`)).records || [])[0];
    if (!rt) throw new Error('Could not find the User Story record type in GUS.');
    const f = { Subject__c: subject, Epic__c: epicId, Scrum_Team__c: teamId, RecordTypeId: rt.Id, Product_Tag__c: tagId, Details__c: wsDetails(epic.Name, name, days(input && input.days)), ...(assigneeId ? { Assignee__c: assigneeId } : {}) };
    const c = await sf.create('ADM_Work__c', f);
    if (!ok(c) || !newId(c)) throw new Error('GUS rejected the workstream story: ' + plain(errText(c)));
    workId = newId(c); created = true;
  }
  // Themes are best effort: the story exists either way, and a retry only adds what is missing.
  const themes = [], warnings = [];
  const release = ((epic.Planned_Release__r && epic.Planned_Release__r.Name || '').match(/\d{3,}/) || [PROGRAM_RELEASE])[0];
  try {
    const t = wsThemeName(release, themeShort(await teamName(sf, teamId)));
    if (!t) warnings.push('Workstream theme not applied: this team has no theme short form (MQ, MAPS, VC, VC-FACE, VS). Ask a plan administrator to add it.');
    else { await assignTheme(sf, await ensureTheme(sf, teamId, t), workId); themes.push(t); }
  } catch (e) { warnings.push(plain(e && e.message || e).slice(0, 200)); }
  return { gusId: workId, created, themes, warnings };
}

// The team's epics already in GUS, so they can be added to the plan table instead of retyped.
async function listEpics(sf, teamId) {
  planKey(teamId);
  const rows = (await sf.query(`SELECT Id, Name, Project__c, Project__r.Name, Project__r.V2MOM_Method__c, Project__r.Program__c, Project__r.Program__r.Name, Planned_Release__c, Planned_Release__r.Name, Development_Lead__c, Development_Lead__r.Name, Planned_Story_Points__c FROM ADM_Epic__c WHERE Team__c = '${teamId}' AND (NOT Name LIKE '\_\_%') ORDER BY Name LIMIT 1000`)).records || [];
  return { epics: rows.map(r => ({ id: r.Id, name: r.Name, projectId: r.Project__c || '', projectName: (r.Project__r && r.Project__r.Name) || '', method: (r.Project__r && r.Project__r.V2MOM_Method__c) || '', programId: (r.Project__r && r.Project__r.Program__c) || '', programName: (r.Project__r && r.Project__r.Program__r && r.Project__r.Program__r.Name) || '', releaseId: r.Planned_Release__c || '', releaseName: (r.Planned_Release__r && r.Planned_Release__r.Name) || '', leadId: r.Development_Lead__c || '', leadName: (r.Development_Lead__r && r.Development_Lead__r.Name) || '', points: Number(r.Planned_Story_Points__c) || 0 })) };
}

// Write edits made in the plan grid through to epics that already exist in GUS (name, development lead = owner, planned release, effort).
async function syncEpics(sf, teamId, epics) {
  planKey(teamId);
  const out = [];
  for (const x of (Array.isArray(epics) ? epics : []).slice(0, 100)) {
    const id = gid(x && x.gusId), f = {};
    if (!id) { out.push({ gusId: '', ok: false, err: 'Not a GUS epic' }); continue; }
    try {
      if (x.name != null) { const n = text(x.name, 255); if (!n) throw new Error('Epic name cannot be empty.'); if (n.length > EPIC_NAME_MAX) throw new Error(`Epic name is ${n.length} characters; GUS allows at most ${EPIC_NAME_MAX}.`); f.Name = n; }
      if (x.leadId !== undefined) { const l = gid(x.leadId); if (l) { f.Development_Lead__c = l; f.OwnerId = l; } }
      if (x.releaseId !== undefined) f.Planned_Release__c = gid(x.releaseId) || null;
      if (x.effort !== undefined) f.Planned_Story_Points__c = days(x.effort);
      const mine = ((await sf.query(`SELECT Id FROM ADM_Epic__c WHERE Id = '${id}' AND Team__c = '${teamId}' LIMIT 1`)).records || [])[0];
      if (!mine) throw new Error('Epic does not belong to this team.');
      let r = await sf.update('ADM_Epic__c', id, f);
      if (r && !ok(r) && f.OwnerId) { delete f.OwnerId; r = await sf.update('ADM_Epic__c', id, f); }
      if (r && !ok(r)) throw new Error(plain(errText(r)) || 'GUS rejected the update.');
      out.push({ gusId: id, ok: true });
    } catch (e) { out.push({ gusId: id, ok: false, err: String(e && e.message || e) }); }
  }
  refsCache.delete(teamId);
  return { results: out };
}

// Validate ABL epics against the saved plan and describe exactly what a commit would do.
const shortCache = new Map(), refsCache = new Map(), SHORT_TTL = 600000, REFS_TTL = 60000;
async function teamShort(sf, teamId) {
  const hit = shortCache.get(teamId);
  if (hit && Date.now() - hit.t < SHORT_TTL) return hit.v;
  const v = await teamShortLookup(sf, teamId);
  shortCache.set(teamId, { v, t: Date.now() });
  return v;
}
async function teamShortLookup(sf, teamId) {
  const t = ((await sf.query(`SELECT Name FROM ADM_Scrum_Team__c WHERE Id = '${teamId}' LIMIT 1`)).records || [])[0];
  if (!t) return null;
  return /message queue/i.test(t.Name) ? 'MQ' : /maps|managed async/i.test(t.Name) ? 'MAPS' : String(t.Name).replace(/\s*\(.*\)/, '');
}
const releasePrefix = n => String(n || '').replace(/\s*-?\s*\d+\s*$/, '').trim().toLowerCase();

// A team's planned releases are named "<Team> 266", "<Team> - 256" ... but GUS files some of them on a sibling scrum team
// (e.g. MQ 268 sits on the MAPS team), so match by name across teams as well as the team's own list. Teams with no
// name match (Caching Services) fall back to their own list.
async function teamReleases(sf, teamId, futureOnly) {
  const when = futureOnly ? ' AND (End_Date__c >= TODAY OR End_Date__c = null)' : '';
  // The team lookup and the team's own releases do not depend on each other, so they run together.
  const [short, ownRes] = await Promise.all([teamShort(sf, teamId).catch(() => null), sf.query(`SELECT Id, Name FROM ADM_Planned_Release__c WHERE Team__c = '${teamId}'${when} ORDER BY Start_Date__c, Name LIMIT 100`)]);
  const own = ownRes.records || [];
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
  L.push('', 'Created from the ReleaseIQ release plan.');
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
      else if (!project.gusId && project.name.length > PROJECT_NAME_MAX) problems.push(`Project name is ${project.name.length} characters; GUS allows ${PROJECT_NAME_MAX}. Shorten it in Projects`);
      if (!project.gusId && !program) problems.push(`No “${PROGRAM_RELEASE}” program found in GUS for this team, so project “${project.name || '?'}” cannot be tagged to one`);
    }
    if (!e.gusId && e.name && plan.epics.some(o => o !== e && !o.gusId && o.name.toLowerCase() === e.name.toLowerCase() && (includeBtl || o.line === 'ABL'))) problems.push('Another unsaved epic has the same name; rename one so GUS does not get duplicates');
    if (e.name && e.name.length > EPIC_NAME_MAX) problems.push(`Epic name is ${e.name.length} characters; GUS allows ${EPIC_NAME_MAX}`);
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
  refsCache.delete(teamId);
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
          const c = await sf.create('PPM_Project__c', { Name: project.name, Program__c: program.id, ...(project.method ? { V2MOM_Method__c: project.method } : {}) });
          if (!ok(c) || !newId(c)) throw new Error('GUS rejected the project: ' + plain(errText(c)));
          projectId = newId(c); r.project = 'created project';
        }
        done.projects.set(project.id, projectId);
        if (project.method && r.project !== 'created project') { try { await sf.update('PPM_Project__c', projectId, { V2MOM_Method__c: project.method }); } catch (_) { r.project += ' (V2MOM method not saved)'; } }
      }
      const effort = effortOf(e, includeBtl === true);
      const fields = { Project__c: projectId, Planned_Release__c: e.releaseId, Planned_Story_Points__c: effort };
      if (e.priority != null) fields.Priority__c = e.priority;
      // Richer details (description, development lead); if the org rejects them the epic is still saved with the core fields.
      const extra = { Description__c: epicDescription(e, project, includeBtl === true) };
      if (e.owners && e.owners[0]) { extra.Development_Lead__c = e.owners[0]; extra.OwnerId = e.owners[0]; } // the epic owner is the development lead
      const attempt = async (fn) => {
        try { const x = await fn({ ...fields, ...extra }); if (x && !ok(x)) throw new Error(plain(errText(x))); return x; }
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
        if (!ok(c) || !newId(c)) throw new Error('GUS rejected the epic: ' + plain(errText(c)));
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
  refsCache.delete(teamId);
  return { results, failed: results.filter(x => !x.ok).length, plan: saved && saved.plan, revision: saved && saved.revision, saveError };
}

module.exports = { getPlan, savePlan, getRefs, commitPlan, createProject, deleteProject, createEpic, listEpics, createWorkstream, syncEpics, review, cleanPlan };
