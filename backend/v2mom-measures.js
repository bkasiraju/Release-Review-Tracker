'use strict';
/* Measure names for the method references on a project ("HPS M6.2.2", "T&P M5.1.1", "T&I 7.1.1"), read live from the V2MOM
 * Google Sheets through the connected Sheets client (or the public CSV export for link-shared sheets). Nothing is stored in the repo.
 * Add a source in SOURCES to cover another V2MOM, for example the T&I sheet. */
const { readSheetUrl, findHeader } = require('./v2mom-import');
const TTL = 60 * 60 * 1000;
const tabs = (n, p = 'M') => Array.from({ length: n }, (_, i) => p + (i + 1));
const SOURCES = [
  { key: 'HPS', label: 'HPS FY27 V2MOM', sheetId: '1moQT0N8hJsSjyo973JRRcu8kZ565rYtnzm3CJfO0ZIg', tabs: tabs(12) },
  { key: 'T&P', label: 'T&P FY27 V2MOM', sheetId: '1obLloL4_lZ5HQzFRwnp_WuOtczhpvGSyMYLJthDKbtY', tabs: tabs(13) }
  // { key: 'T&I', label: 'T&I FY27 V2MOM', sheetId: '<sheet id>', tabs: tabs(12) }
];
const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
/** "HPS M6.2.2" / "hps 6.2.2" / "T&P M5.1.1" -> { key: 'HPS', code: '6.2.2' }, or null. */
function parseRef(text) {
  const m = /^\s*(HPS|T\s*&\s*P|T\s*&\s*I|TP|TI)\b[\s:-]*M?\s*(\d+(?:\.\d+)*)/i.exec(String(text || ''));
  if (!m) return null;
  const k = m[1].toUpperCase().replace(/\s/g, '');
  return { key: k === 'TP' ? 'T&P' : k === 'TI' ? 'T&I' : k, code: m[2] };
}
/** Pure: rows of one method tab -> { '6.2.2': { title, owner, xref } }. */
function parseTab(rows, key) {
  const out = {}, h = findHeader(rows);
  if (!h) return out;
  const hdr = (rows[h.row] || []).map(c => norm(c).toLowerCase());
  const xi = hdr.findIndex((c, i) => i !== h.code && /v2mom\s*#|v2mom ref/.test(c));
  for (let r = h.row + 1; r < rows.length; r++) {
    const row = rows[r] || [], code = norm(row[h.code]).replace(/^M/i, '');
    if (!/^\d+(\.\d+)+$/.test(code)) continue;
    const title = norm(String(row[h.measure] == null ? '' : row[h.measure]).split(/\r?\n/).find(l => norm(l)) || '').slice(0, 260);
    if (!title || /^HEADER$/i.test(norm(row[h.measure + 1]))) continue;
    const owner = norm(String(row[h.owner] || '').replace(/\r?\n/g, ', ')).slice(0, 120), xref = xi >= 0 ? norm(row[xi]).slice(0, 80) : '';
    if (!out[code]) out[code] = { title, owner, xref };
  }
  return out;
}
let cache = null;
async function getMeasures(googleSheets, force) {
  if (!force && cache && Date.now() - cache.t < TTL) return cache.v;
  const measures = {}, failed = [];
  await Promise.all(SOURCES.map(async src => {
    let sheets;
    try { sheets = await readSheetUrl('https://docs.google.com/spreadsheets/d/' + src.sheetId + '/edit', src.tabs, googleSheets); } catch (e) { failed.push(src.key); return; }
    for (const [tab, rows] of Object.entries(sheets)) for (const [code, m] of Object.entries(parseTab(rows, src.key))) measures[src.key + ' ' + code] = { ...m, label: src.label, tab };
  }));
  const v = { measures, sources: SOURCES.map(s => s.key), failed, fetchedAt: new Date().toISOString() };
  if (Object.keys(measures).length) cache = { t: Date.now(), v };
  return v;
}
module.exports = { getMeasures, parseTab, parseRef, SOURCES };
