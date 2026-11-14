'use strict';
/* Release Planning: engineers' draft plan (projects, epics, workstreams, leaves) lives in GUS Apps storage per team.
 * Only epics above the line (ABL) are written to GUS, on an explicit confirm: project (+ program) -> epic with planned release, priority, effort. */
const SF_ID = /^[a-zA-Z0-9]{15,18}$/, ISO = /^\d{4}-\d{2}-\d{2}$/, LOCAL = /^[A-Za-z0-9_-]{1,40}$/;
const MAX = { projects: 80, epics: 300, workstreams: 40, people: 200 };
const planKey = teamId => { if (!SF_ID.test(String(teamId || ''))) throw new Error('Unknown team'); return 'plan-' + teamId; };
const text = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const days = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 100) / 100, 1000) : 0; };
const gid = v => SF_ID.test(String(v || '')) ? String(v) : '';
const lid = (v, i, p) => LOCAL.test(String(v || '')) ? String(v) : p + i;
const soql = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const ok = r => r && r.success !== false && !(r.errors && r.errors.length);
const newId = r => (r && (r.id || r.Id)) || '';

function cleanPlan(input) {
  const p = input && typeof input === 'object' ? input : {};
  const w = p.window || {};
  const projects = (Array.isArray(p.projects) ? p.projects : []).slice(0, MAX.projects).map((x, i) => ({
    id: lid(x.id, i, 'p'), name: text(x.name, 120), programId: gid(x.programId), programName: text(x.programName, 120), theme: text(x.theme, 80), gusId: gid(x.gusId)
  }));
  const epics = (Array.isArray(p.epics) ? p.epics : []).slice(0, MAX.epics).map((x, i) => ({
    id: lid(x.id, i, 'e'), projectId: lid(x.projectId, 0, ''), name: text(x.name, 255), line: x.line === 'ABL' ? 'ABL' : 'BTL',
    priority: Number.isFinite(Number(x.priority)) && x.priority !== '' && x.priority != null ? Math.min(Math.max(Math.round(Number(x.priority)), 0), 9999) : null,
    releaseId: gid(x.releaseId), releaseName: text(x.releaseName, 120), gusId: gid(x.gusId),
    workstreams: (Array.isArray(x.workstreams) ? x.workstreams : []).slice(0, MAX.workstreams).map((s, j) => ({
      id: lid(s.id, j, 'w'), name: text(s.name, 120), engId: gid(s.engId), engName: text(s.engName, 80), days: days(s.days), sprint: text(s.sprint, 60)
    }))
  }));
  const people = {};
  for (const [k, v] of Object.entries(p.people && typeof p.people === 'object' ? p.people : {}).slice(0, MAX.people)) {
    if (!SF_ID.test(k)) continue;
    people[k] = { name: text(v && v.name, 80), leave: days(v && v.leave), holiday: days(v && v.holiday) };
  }
  const last = p.lastCommit && typeof p.lastCommit === 'object' ? { at: text(p.lastCommit.at, 40), created: Number(p.lastCommit.created) || 0, updated: Number(p.lastCommit.updated) || 0 } : null;
  return { window: { start: ISO.test(w.start) ? w.start : '', end: ISO.test(w.end) ? w.end : '' }, people, projects, epics, lastCommit: last };
}

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
    safe('Planned releases', sf.query(`SELECT Id, Name FROM ADM_Planned_Release__c WHERE Team__c = '${teamId}' ORDER BY Name DESC LIMIT 100`)),
    safe('Programs', sf.query('SELECT Id, Name FROM PPM_Program__c ORDER BY Name LIMIT 1500')),
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
function review(plan, releaseIds) {
  const byProject = new Map(plan.projects.map(p => [p.id, p]));
  const items = [], blockers = [];
  for (const e of plan.epics.filter(x => x.line === 'ABL')) {
    const problems = [], project = byProject.get(e.projectId), effort = Math.round(e.workstreams.reduce((a, w) => a + w.days, 0) * 100) / 100;
    if (!e.name) problems.push('Epic name is required');
    if (!project) problems.push('Select a project');
    else {
      if (!project.name) problems.push('Project needs a name');
      if (!project.gusId && !project.programId) problems.push(`Project “${project.name || '?'}” needs a program`);
    }
    if (!e.releaseId) problems.push('Select a planned release');
    else if (releaseIds && !releaseIds.has(e.releaseId)) problems.push('Planned release does not belong to this team');
    if (!(effort > 0)) problems.push('Add effort (days) on at least one workstream');
    const item = { epicId: e.id, name: e.name, project: project ? project.name : '', program: project ? project.programName : '', projectAction: project ? (project.gusId ? 'existing' : 'create-or-link') : '', release: e.releaseName, priority: e.priority, effort, action: e.gusId ? 'update' : 'create', problems };
    items.push(item);
    if (problems.length) blockers.push({ epicId: e.id, name: e.name || '(unnamed epic)', problems });
  }
  return { items, blockers, skipped: plan.epics.filter(x => x.line !== 'ABL').length };
}

async function commitPlan(sf, store, teamId, confirm) {
  planKey(teamId);
  const { plan } = await getPlan(store, teamId);
  const rel = await sf.query(`SELECT Id FROM ADM_Planned_Release__c WHERE Team__c = '${teamId}' LIMIT 200`).then(r => new Set(((r && r.records) || []).map(x => x.Id)), () => null);
  const preview = review(plan, rel);
  if (!confirm) return { preview };
  if (!preview.items.length) throw new Error('No epics are above the line (ABL). Mark epics ABL to save them to GUS.');
  if (preview.blockers.length) throw new Error(`Fix ${preview.blockers.length} epic(s) before saving to GUS.`);
  const done = { projects: new Map(), epics: new Map() }, results = [];
  const byProject = new Map(plan.projects.map(p => [p.id, p]));
  for (const e of plan.epics.filter(x => x.line === 'ABL')) {
    const project = byProject.get(e.projectId), r = { epicId: e.id, name: e.name };
    try {
      let projectId = project.gusId || done.projects.get(project.id);
      if (!projectId) {
        const hit = ((await sf.query(`SELECT Id FROM PPM_Project__c WHERE Name = '${soql(project.name)}' AND Program__c = '${project.programId}' LIMIT 1`)).records || [])[0];
        if (hit) { projectId = hit.Id; r.project = 'linked existing project'; }
        else {
          const c = await sf.create('PPM_Project__c', { Name: project.name, Program__c: project.programId });
          if (!ok(c) || !newId(c)) throw new Error('GUS rejected the project: ' + ((c && c.errors) || []).join(', '));
          projectId = newId(c); r.project = 'created project';
        }
        done.projects.set(project.id, projectId);
      }
      const effort = Math.round(e.workstreams.reduce((a, w) => a + w.days, 0) * 100) / 100;
      const fields = { Project__c: projectId, Planned_Release__c: e.releaseId, Planned_Story_Points__c: effort };
      if (e.priority != null) fields.Priority__c = e.priority;
      let epicId = e.gusId;
      if (!epicId) {
        const hit = ((await sf.query(`SELECT Id FROM ADM_Epic__c WHERE Name = '${soql(e.name)}' AND Team__c = '${teamId}' LIMIT 1`)).records || [])[0];
        if (hit) epicId = hit.Id;
      }
      if (epicId) {
        const u = await sf.update('ADM_Epic__c', epicId, fields);
        if (u && !ok(u)) throw new Error('GUS rejected the epic update.');
        r.action = e.gusId ? 'updated' : 'linked and updated existing epic';
      } else {
        const c = await sf.create('ADM_Epic__c', { Name: e.name, Team__c: teamId, ...fields });
        if (!ok(c) || !newId(c)) throw new Error('GUS rejected the epic: ' + ((c && c.errors) || []).join(', '));
        epicId = newId(c); r.action = 'created';
      }
      done.epics.set(e.id, epicId); r.gusId = epicId; r.ok = true;
    } catch (err) { r.ok = false; r.error = String(err && err.message || err).slice(0, 300); }
    results.push(r);
  }
  // Record the GUS ids on a fresh copy so concurrent engineer edits are kept and a retry never duplicates records.
  const fresh = await getPlan(store, teamId), next = fresh.plan;
  for (const p of next.projects) if (done.projects.has(p.id)) p.gusId = done.projects.get(p.id);
  for (const e of next.epics) if (done.epics.has(e.id)) e.gusId = done.epics.get(e.id);
  const good = results.filter(x => x.ok);
  next.lastCommit = { at: new Date().toISOString(), created: good.filter(x => x.action === 'created').length, updated: good.filter(x => x.action !== 'created').length };
  let saved = null, saveError = null;
  try { saved = await savePlan(store, teamId, next, fresh.revision); } catch (err) { saveError = String(err && err.message || err); }
  return { results, failed: results.filter(x => !x.ok).length, plan: saved && saved.plan, revision: saved && saved.revision, saveError };
}

module.exports = { getPlan, savePlan, getRefs, commitPlan, review, cleanPlan };
