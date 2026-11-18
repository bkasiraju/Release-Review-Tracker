'use strict';
/* V2MOM measures import: parse a V2MOM workbook (one tab per method, M1..Mn) into measures that can become GUS projects.
 * Generic on purpose: columns are found from their header text, so any team's sheet works if it has a Measure column and an Owner column.
 * Pure parsing lives here (rows in, measures out); reading Google Sheets and writing GUS stay in the callers. */
const { csvRows } = require('./review-policy');

const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const low = s => norm(s).toLowerCase();
const CODE = /^\d+(?:\.\d+)+$/;
const MAX_TABS = 12, MAX_ROWS = 600;

/** Finds the header row and the columns we need. Returns null when the tab has no Measure + Owner header. */
function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 40); r++) {
    const cells = (rows[r] || []).map(low);
    const measure = cells.findIndex(c => /measure/.test(c) && !/metric|outcome/.test(c));
    const owner = cells.findIndex(c => /owner/.test(c));
    if (measure < 0 || owner < 0) continue;
    let code = cells.findIndex(c => /^(#|no\.?|id|code|ref)$/.test(c));
    if (code < 0) code = measure > 0 ? measure - 1 : -1;
    const refs = cells.map((c, i) => /^v2mom\s*ref/.test(c) ? i : -1).filter(i => i >= 0);
    return { row: r, measure, owner, code, refs };
  }
  return null;
}
/** "M1) Maintain and Uplift Runtime Trust" style title near the top of a method tab. */
function tabTitle(rows, tab) {
  for (let r = 0; r < Math.min(rows.length, 6); r++) for (const c of rows[r] || []) {
    const t = norm(c);
    if (/^M\d+\s*[):.\-–]/.test(t)) return t.replace(/^M(\d+)\s*[):.\-–]\s*/, 'M$1: ');
  }
  return tab;
}
/** Method references such as "HPS M2.1.1" or "T&P 1.21" found in a V2MOM Ref cell. */
function refList(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/([A-Za-z][A-Za-z&]*(?: [A-Za-z][A-Za-z&]*)? M?\d+(?:\.\d+)+)/g)) { const v = norm(m[1]); if (!out.includes(v)) out.push(v); }
  return out;
}
const ownerList = s => norm(s).split(/\s*(?:,|;|&|\band\b|\n)\s*/i).filter(Boolean);

/** sheets: { tabName: string[][] }. opts.owners: names; a measure matches when any owner cell text contains any name (case-insensitive). */
function parseSheets(sheets, opts = {}) {
  const wanted = (Array.isArray(opts.owners) ? opts.owners : String(opts.owners || '').split(/[,;\n]/)).map(low).filter(Boolean);
  const tabs = [], measures = [], skipped = [];
  for (const [tab, rows] of Object.entries(sheets || {}).slice(0, MAX_TABS)) {
    const list = Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : [];
    const h = findHeader(list);
    if (!h) { skipped.push({ tab, reason: 'No Measure and Owner header row found' }); continue; }
    const title = tabTitle(list, tab);
    let found = 0;
    for (let r = h.row + 1; r < list.length; r++) {
      const row = list[r] || [];
      const code = norm(row[h.code]), name = norm(row[h.measure]), owner = norm(row[h.owner]);
      if (!name || !CODE.test(code)) continue;
      if (code.split('.').length < 3 && !owner) continue; // two-level codes without an owner are section headings
      const refText = h.refs.map(i => norm(row[i])).filter(Boolean).join(' | ');
      found++;
      if (wanted.length && !wanted.some(w => low(owner).includes(w))) continue;
      measures.push({ tab, method: title, code, name, owners: ownerList(owner), ownerText: owner, refs: refList(refText), refText: refText.slice(0, 300) });
    }
    tabs.push({ tab, method: title, measures: found });
  }
  return { measures, tabs, skipped, owners: wanted };
}

/** Reads the named tabs of a Google Sheet: through the connected Sheets client when GUS Apps has one, else the public CSV export (link-shared sheets only). */
async function readSheetUrl(url, tabs, googleSheets) {
  let u; try { u = new URL(url); } catch { throw new Error('Enter the Google Sheets link.'); }
  const id = (u.pathname.match(/^\/spreadsheets\/d\/([A-Za-z0-9_-]+)/) || [])[1];
  if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com' || !id || u.username || u.password || u.port) throw new Error('Use a docs.google.com/spreadsheets link.');
  const names = [...new Set((tabs || []).map(norm).filter(Boolean))].slice(0, MAX_TABS);
  if (!names.length) throw new Error('Enter at least one tab name, for example M1, M2, M3.');
  const out = {};
  for (const tab of names) {
    let values;
    if (googleSheets && typeof googleSheets.getValues === 'function') {
      values = (await googleSheets.getValues({ spreadsheetId: id, range: "'" + tab.replace(/'/g, "''") + "'!A1:AK500" })).values;
    } else {
      if (typeof fetch !== 'function') throw new Error('Google Sheets access is unavailable here. Download the sheet as .xlsx and upload it instead.');
      const res = await fetch('https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent(tab), { signal: AbortSignal.timeout(15000) });
      const body = res.ok ? await res.text() : '';
      if (!res.ok || /^\s*</.test(body) || body.length > 2e6) throw new Error('Google Sheets would not share tab “' + tab + '” without sign-in. Set the sheet to “anyone with the link can view”, or download it as .xlsx and upload it instead.');
      values = csvRows(body);
    }
    out[tab] = Array.isArray(values) ? values : [];
  }
  return out;
}

module.exports = { parseSheets, readSheetUrl, refList, findHeader, ownerList };
