'use strict';
/* TEAM CONFIGURATION: one entry per team shown in ReleaseIQ. To add a team, add an entry here (see docs/ADDING_A_TEAM.md), run the tests and deploy.
 *   key      short id used by the hub pages (people lists, rosters)
 *   group    leadership group name; also the label of the team's people block
 *   gus      the GUS scrum team name (ADM_Scrum_Team__c.Name). A trailing % matches any name starting with it (SOQL LIKE); otherwise an exact match.
 *   short    optional short form used in release/program names ("<short> - 268") and the UI; defaults to the GUS name without any "(...)" suffix
 *   theme    short form of the generic workstream theme R<release>_<theme>_Workstream; themeBy overrides it for names matching a regex (case-insensitive)
 *   tag      default GUS product tag name for new work items; omit to leave it unset
 *   leaders  leader names (see LEADER_IDS in hub.js); Amit and Jayant lead every team
 *   excludeMembersOf   key of another team whose GUS members are not shown or counted for this team (leadership stays)
 *   allocLeaders       leaders always included in this team's allocation list
 *   pagerduty          optional { id, name } Slack channel for the PagerDuty digest
 */
const TEAMS = [
  { key: 'maps', group: 'Managed Async Processing Team', gus: 'Managed Async Processing%', short: 'MAPS', theme: 'MAPS', tag: 'MAPS',
    leaders: ['AMIT', 'JAYANT', 'RAM', 'PRAMIT', 'BHANU'], allocLeaders: ['RAM', 'JAYANT'], pagerduty: { id: 'C09ALBDFVCY', name: '#maps-pagerduty' } },
  { key: 'mq', group: 'Message Queue Team', gus: 'Message Queue', short: 'MQ', theme: 'MQ', tag: 'Architecture Message Queue',
    leaders: ['AMIT', 'JAYANT', 'RAM', 'PRAMIT', 'BHANU'], excludeMembersOf: 'maps', allocLeaders: ['RAM', 'JAYANT'], pagerduty: { id: 'C025AEPQJQ1', name: '#mq-pagerduty' } },
  { key: 'vegacache', group: 'VegaCache Team', gus: 'VegaCache%', theme: 'VC', themeBy: [['face', 'VC-FACE']],
    leaders: ['AMIT', 'JAYANT', 'AZEEM', 'VENKAT', 'KARTHIK', 'BHANU'], allocLeaders: ['JAYANT'] },
  { key: 'vegastore', group: 'VegaStore Team', gus: 'VegaStore', theme: 'VS', leaders: ['AMIT', 'JAYANT'] },
  { key: 'caching', group: 'Caching Services Team', gus: 'Caching Services', theme: 'VC', tag: 'CaaS: Cache As A Service', leaders: ['AMIT', 'JAYANT'] }
];

// Teams onboarded from the UI (saved in the shared store) are layered on top of the built-in list at runtime.
let EXTRA = [];
const all = () => [...TEAMS, ...EXTRA];
const LEADER_NAMES = ['AMIT', 'JAYANT', 'RAM', 'AZEEM', 'VENKAT', 'PRAMIT', 'KARTHIK', 'BHANU'];
const setExtra = list => { EXTRA = Array.isArray(list) ? list : []; };
const lit = s => String(s).replace(/'/g, "\\'");
const isLike = e => /%$/.test(e.gus);
const sqlName = (e, prefix = '') => isLike(e) ? `${prefix}Name LIKE '${lit(e.gus)}'` : `${prefix}Name = '${lit(e.gus)}'`;
const reOf = e => new RegExp('^' + e.gus.replace(/%$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (isLike(e) ? '' : '$'), 'i');
const entryFor = name => all().find(e => reOf(e).test(String(name || '').trim())) || null;
const entryByKey = key => all().find(e => e.key === key) || null;
const entryByGroup = group => all().find(e => e.group === group) || null;
/** SQL condition selecting every configured, active team; prefix is the relationship path, e.g. 'Scrum_Team__r.'. */
const teamFilter = (prefix = '') => `${prefix}Active__c = true AND (${all().map(e => sqlName(e, prefix)).join(' OR ')})`;
const shortOf = name => { const e = entryFor(name); return (e && e.short) || String(name).replace(/\s*\(.*\)/, ''); };
const themeOf = name => { const e = entryFor(name); if (!e) return ''; const by = (e.themeBy || []).find(([re]) => new RegExp(re, 'i').test(String(name))); return by ? by[1] : (e.theme || ''); };
const tagOf = name => (entryFor(name) || {}).tag || '';

/** Validate and normalise a team entered in the UI; throws a user-readable error. */
function cleanEntry(raw, existingKey) {
  const str = (v, max, re, label, req) => { const t = String(v == null ? '' : v).trim(); if (!t) { if (req) throw new Error(label + ' is required.'); return ''; } if (t.length > max || !re.test(t)) throw new Error('Check ' + label + ' (up to ' + max + ' characters, letters, numbers, spaces and - . & ( ) : only).'); return t; };
  const SAFE = /^[A-Za-z0-9 .&():_\/-]+$/;
  const gus = str(raw.gus, 80, /^[A-Za-z0-9 .&():_\/-]+%?$/, 'GUS scrum team name', true);
  const group = str(raw.group, 60, SAFE, 'Team display name', true);
  const e = { key: str(raw.key, 31, /^[a-z][a-z0-9-]+$/, 'Team key (lowercase letters, numbers, dashes)', true), group, gus };
  const short = str(raw.short, 12, SAFE, 'Short name'); if (short) e.short = short;
  // The planner names workstream themes R<release>_<theme>_Workstream, so a team always needs one: default to the short name.
  const theme = str(raw.theme, 12, /^[A-Za-z0-9-]+$/, 'Theme') || (short || '').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) || e.key.toUpperCase().slice(0, 12); e.theme = theme;
  const tag = str(raw.tag, 80, SAFE, 'Product tag'); if (tag) e.tag = tag;
  const lead = Array.isArray(raw.leaders) ? raw.leaders.filter(n => LEADER_NAMES.includes(n)) : [];
  e.leaders = [...new Set(['AMIT', 'JAYANT', ...lead])];
  const clash = all().find(x => x.key !== existingKey && (x.key === e.key || x.group === e.group || reOf(x).test(gus.replace(/%$/, '')) || reOf(e).test(x.gus.replace(/%$/, ''))));
  if (clash) throw new Error('This overlaps the already configured team "' + clash.group + '". Change the key, display name or GUS team name.');
  return e;
}

module.exports = { TEAMS, all, setExtra, cleanEntry, LEADER_NAMES, sqlName, reOf, entryFor, entryByKey, entryByGroup, teamFilter, shortOf, themeOf, tagOf };
