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

const lit = s => String(s).replace(/'/g, "\\'");
const isLike = e => /%$/.test(e.gus);
const sqlName = (e, prefix = '') => isLike(e) ? `${prefix}Name LIKE '${lit(e.gus)}'` : `${prefix}Name = '${lit(e.gus)}'`;
const reOf = e => new RegExp('^' + e.gus.replace(/%$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (isLike(e) ? '' : '$'), 'i');
const entryFor = name => TEAMS.find(e => reOf(e).test(String(name || '').trim())) || null;
const entryByKey = key => TEAMS.find(e => e.key === key) || null;
const entryByGroup = group => TEAMS.find(e => e.group === group) || null;
/** SQL condition selecting every configured, active team; prefix is the relationship path, e.g. 'Scrum_Team__r.'. */
const teamFilter = (prefix = '') => `${prefix}Active__c = true AND (${TEAMS.map(e => sqlName(e, prefix)).join(' OR ')})`;
const shortOf = name => { const e = entryFor(name); return (e && e.short) || String(name).replace(/\s*\(.*\)/, ''); };
const themeOf = name => { const e = entryFor(name); if (!e) return ''; const by = (e.themeBy || []).find(([re]) => new RegExp(re, 'i').test(String(name))); return by ? by[1] : (e.theme || ''); };
const tagOf = name => (entryFor(name) || {}).tag || '';

module.exports = { TEAMS, sqlName, reOf, entryFor, entryByKey, entryByGroup, teamFilter, shortOf, themeOf, tagOf };
