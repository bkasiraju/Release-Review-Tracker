'use strict';
/**
 * Sprint Insights — read-only sprint forecast data for the CFS teams (Message Queue, MAPS).
 * Actions (routed from index.js): sprint-teams, sprint-initial, sprint-sprints, sprint-data, sprint-history.
 *
 * Data source: ADM_Sprint__c + ADM_Work_Commitment__c (Item_Status__c =
 * Forecasted | Added | Removed) joined to ADM_Work__c.
 */

const hub = require('./hub');

const HISTORY_SPRINTS = 10;
const SPRINT_LIST_LIMIT = 30;
const SF_ID = /^[a-zA-Z0-9]{15,18}$/;

const requireTeam = hub.requireTeam;

function requireSprintId(sprintId) {
  if (!SF_ID.test(String(sprintId || ''))) throw new Error('Invalid sprint id');
  return sprintId;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function queryAll(sf, soql) {
  const result = await sf.query(soql);
  if (result.done === false) throw new Error('Sprint data exceeds one query page; refusing to show partial totals.');
  return result.records || [];
}

// ── getTeams (GUS is the system of record; see hub.js) ──────────────────────────
const getTeams = hub.getTeams;

// ── Sprints ─────────────────────────────────────────────────────────────────────
async function getSprints(sf, teamId) {
  requireTeam(teamId);
  const sprints = await queryAll(sf,
    `SELECT Id, Name, Start_Date__c, End_Date__c FROM ADM_Sprint__c ` +
    `WHERE Scrum_Team__c = '${teamId}' AND Start_Date__c <= TODAY ` +
    `ORDER BY Start_Date__c DESC LIMIT ${SPRINT_LIST_LIMIT}`);
  const t = today();
  const current = sprints.find(s => s.Start_Date__c <= t && s.End_Date__c >= t);
  const defaultSprintId = (current || sprints[0] || {}).Id || null;
  return {
    sprints: sprints.map(s => ({ Id: s.Id, Name: s.Name })),
    defaultSprintId
  };
}

// ── Sprint data ─────────────────────────────────────────────────────────────────
const CLOSED_DEFAULT = new Set(['Closed', 'Fixed', 'Completed', 'Duplicate', 'Will Not Fix', 'Never', 'Inactive', 'Rejected']);
const CLOSED_BUG = new Set([...CLOSED_DEFAULT, 'Not a bug', 'Not Reproducible']);

// Mirrors isItemClosed() in public/app.js — all "Closed - …" statuses are closed.
function isClosed(item) {
  if (item.status && item.status.startsWith('Closed')) return true;
  return (item.recordType === 'Bug' ? CLOSED_BUG : CLOSED_DEFAULT).has(item.status);
}

function itemPts(i) {
  return i.forecastPts != null ? i.forecastPts : (i.storyPoints || 0);
}

function buildMember(name, items) {
  const active = items.filter(i => i.itemStatus !== 'Removed');
  const closed = active.filter(isClosed);
  const forecasted = items.filter(i => i.itemStatus === 'Forecasted');
  const sum = arr => arr.reduce((a, i) => a + itemPts(i), 0);
  return {
    name,
    items,
    initialPts: sum(forecasted),
    completedPts: sum(closed),
    closedCount: closed.length,
    spilloverCount: forecasted.filter(i => !isClosed(i)).length,
    addedCount: items.filter(i => i.itemStatus === 'Added').length,
    removedCount: items.filter(i => i.itemStatus === 'Removed').length,
    ptsChangedCount: items.filter(i => i.ptsChanged).length
  };
}

async function loadSprintData(sf, teamId, sprintId) {
  requireTeam(teamId);
  requireSprintId(sprintId);
  const [sprints, commitments, sprintWork] = await Promise.all([
    queryAll(sf,
      `SELECT Id, Name, Start_Date__c, End_Date__c, Goals__c, Completion_Committed_Story_Points__c, Committed_Points__c, Completed_Story_Points__c, Committed_Story_Points_Completed__c, ` +
      `Committed_Items__c, Committed_Items_Completed__c, Completed_Items__c, Days_Remaining__c FROM ADM_Sprint__c ` +
      `WHERE Id = '${sprintId}' AND Scrum_Team__c = '${teamId}' LIMIT 1`),
    queryAll(sf,
      `SELECT Id, Item_Status__c, Committed_Story_Points__c, Work__c, Work__r.Name, Work__r.Subject__c, ` +
      `Work__r.Status__c, Work__r.Story_Points__c, Work__r.Priority__c, Work__r.RecordType.Name, ` +
      `Work__r.Assignee__c, Work__r.Assignee__r.Name, Work__r.QA_Engineer__c, Work__r.QA_Engineer__r.Name, Work__r.Epic__c, Work__r.Epic__r.Name, Work__r.Epic__r.Development_Lead__c, Work__r.Epic__r.Development_Lead__r.Name FROM ADM_Work_Commitment__c ` +
      `WHERE Sprint__c = '${sprintId}' AND Sprint__r.Scrum_Team__c = '${teamId}' LIMIT 2000`),
    // Work currently in the sprint: GUS's sprint wall "Current" total is the sum of its story points.
    queryAll(sf, `SELECT Story_Points__c FROM ADM_Work__c WHERE Sprint__c = '${sprintId}' LIMIT 2000`)
  ]);
  if (!sprints.length) throw new Error('Sprint not found for this team');
  const sprint = sprints[0];

  const byMember = new Map();
  for (const c of commitments) {
    const w = c.Work__r;
    if (!w) continue;
    const forecastPts = c.Committed_Story_Points__c;
    const storyPoints = w.Story_Points__c;
    const itemStatus = c.Item_Status__c;
    const item = {
      id: c.Work__c,
      name: w.Name,
      subject: w.Subject__c || '',
      status: w.Status__c,
      priority: w.Priority__c || '',
      assigneeId: w.Assignee__c || null,
      qaId: w.QA_Engineer__c || null,
      qa: (w.QA_Engineer__r && w.QA_Engineer__r.Name) || '',
      epicId: w.Epic__c || null,
      epic: (w.Epic__r && w.Epic__r.Name) || '',
      epicLeadId: (w.Epic__r && w.Epic__r.Development_Lead__c) || null,
      epicLead: (w.Epic__r && w.Epic__r.Development_Lead__r && w.Epic__r.Development_Lead__r.Name) || '',
      recordType: (w.RecordType && w.RecordType.Name) || '',
      storyPoints,
      forecastPts,
      itemStatus,
      ptsChanged: itemStatus !== 'Removed' && forecastPts != null && storyPoints != null && forecastPts !== storyPoints
    };
    const who = (w.Assignee__r && w.Assignee__r.Name) || 'Unassigned';
    if (!byMember.has(who)) byMember.set(who, []);
    byMember.get(who).push(item);
  }

  const members = [...byMember.entries()]
    .map(([name, items]) => buildMember(name, items))
    .sort((a, b) => b.initialPts - a.initialPts || a.name.localeCompare(b.name));

  return {
    sprint: {
      Id: sprint.Id,
      Name: sprint.Name,
      Start_Date__c: sprint.Start_Date__c,
      End_Date__c: sprint.End_Date__c,
      Goals__c: sprint.Goals__c,
      Completion_Committed_Story_Points__c: sprint.Completion_Committed_Story_Points__c,
      // Same figures as the GUS sprint wall header: Forecast Closed %, Forecast, Closed (velocity), Current, Days Left.
      gus: {
        forecastClosedPct: sprint.Completion_Committed_Story_Points__c,
        forecast: sprint.Committed_Points__c || 0,
        forecastClosedPts: sprint.Committed_Story_Points_Completed__c || 0,
        closed: sprint.Completed_Story_Points__c || 0,
        current: sprintWork.reduce((n, w) => n + (w.Story_Points__c || 0), 0),
        currentItems: sprintWork.length,
        closedItems: sprint.Completed_Items__c || 0,
        daysLeft: sprint.Days_Remaining__c
      }
    },
    members
  };
}

// ── History (last N started sprints, oldest → newest) ──────────────────────────
async function getHistory(sf, teamId) {
  requireTeam(teamId);
  const rows = await queryAll(sf,
    `SELECT Name, End_Date__c, Committed_Points__c, Committed_Items__c, Committed_Story_Points_Completed__c, ` +
    `Committed_Items_Completed__c, Completed_Story_Points__c, Completion_Committed_Story_Points__c ` +
    `FROM ADM_Sprint__c WHERE Scrum_Team__c = '${teamId}' AND Start_Date__c <= TODAY ` +
    `ORDER BY Start_Date__c DESC LIMIT ${HISTORY_SPRINTS}`);
  const history = rows.reverse().map(s => {
    const committed = s.Committed_Points__c || 0;
    const completed = s.Committed_Story_Points_Completed__c || 0;
    return {
      name: s.Name,
      inProgress: !!s.End_Date__c && s.End_Date__c >= today(),
      shortName: String(s.Name).split(' - ')[0],
      sayDo: s.Completion_Committed_Story_Points__c != null && committed > 0
        ? Math.round(s.Completion_Committed_Story_Points__c) : null,
      committed,
      completed,
      committedItems: s.Committed_Items__c || 0,
      completedItems: s.Committed_Items_Completed__c || 0,
      completedPts: s.Completed_Story_Points__c != null ? s.Completed_Story_Points__c : completed
    };
  });
  return { history };
}

async function getInitial(sf, teamId) {
  const list = await getSprints(sf, teamId);
  const data = list.defaultSprintId ? await loadSprintData(sf, teamId, list.defaultSprintId) : { sprint: null, members: null };
  return { ...list, ...data };
}

/** The team's sprint that starts right after `sprintId` (null when none is planned yet). */
async function getNextSprint(sf, teamId, sprintId) {
  requireTeam(teamId); requireSprintId(sprintId);
  const [cur] = await queryAll(sf, `SELECT Id, Name, Start_Date__c FROM ADM_Sprint__c WHERE Id = '${sprintId}' AND Scrum_Team__c = '${teamId}' LIMIT 1`);
  if (!cur) throw new Error('Sprint not found for this team.');
  const [next] = await queryAll(sf, `SELECT Id, Name, Start_Date__c, End_Date__c FROM ADM_Sprint__c WHERE Scrum_Team__c = '${teamId}' AND Start_Date__c > ${cur.Start_Date__c} ORDER BY Start_Date__c ASC LIMIT 1`);
  return { current: { Id: cur.Id, Name: cur.Name }, next: next ? { Id: next.Id, Name: next.Name } : null };
}

/** Move open work items from `sprintId` to the team's next sprint (GUS "Move Work to Next Sprint"). Closed items stay put. */
async function moveToNextSprint(sf, teamId, sprintId, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 || !ids.every(x => SF_ID.test(String(x)))) throw new Error('Select between 1 and 100 work items.');
  const { next } = await getNextSprint(sf, teamId, sprintId);
  if (!next) throw new Error('No next sprint exists for this team yet. Create it in GUS first.');
  const list = [...new Set(ids)].map(x => `'${x}'`).join(',');
  const rows = await queryAll(sf, `SELECT Id, Name, Status__c, RecordType.Name FROM ADM_Work__c WHERE Id IN (${list}) AND Sprint__c = '${sprintId}'`);
  const open = rows.filter(r => !isClosed({ status: r.Status__c, recordType: r.RecordType && r.RecordType.Name }));
  const out = await Promise.allSettled(open.map(r => hub.patchRecord(sf, 'ADM_Work__c', r.Id, { Sprint__c: next.Id })));
  const moved = [], failed = [];
  out.forEach((o, i) => o.status === 'fulfilled' ? moved.push(open[i].Id) : failed.push({ id: open[i].Id, name: open[i].Name, error: String((o.reason && o.reason.message) || o.reason).slice(0, 200) }));
  return { next, moved, failed, skipped: rows.length - open.length, missing: ids.length - rows.length };
}

module.exports = { getTeams, getSprints, loadSprintData, getHistory, getInitial, moveToNextSprint, getNextSprint, __test: { buildMember, isClosed } };
