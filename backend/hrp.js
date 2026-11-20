'use strict';
/* HRP measure details, read live from the HRP FY27 V2MOM in GUS (V2G_Measure__c), the same records the HRP V2MOM Tracker shows.
 * The HRP number is the measure's group (MeasureGroupId__c, e.g. 1.2) plus its position in that group; group-header rows are skipped. */
const V2MOM_NAME = 'HRP FY27 V2MOM';
const TTL = 60 * 60 * 1000;
let cache = null;

const decode = s => String(s || '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
/** Measure text is plain text with "- " bullets, sometimes HTML. Returns clean plain-text lines. */
const plain = s => decode(String(s || '').replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, '')).replace(/\r/g, '').split('\n').map(l => l.replace(/\s+$/, ''));

function parse(rows) {
  const seen = {}, out = {};
  for (const r of rows) {
    const raw = r.MeasureName__c || '';
    if (/group header/i.test(raw)) continue;
    const g = String(r.MeasureGroupId__c || '').trim();
    if (!g) continue;
    seen[g] = (seen[g] || 0) + 1;
    const lines = plain(raw), title = (lines.find(l => l.trim()) || '').replace(/^[-\s]+/, '').trim();
    const body = lines.slice(lines.findIndex(l => l.trim()) + 1);
    while (body.length && !body[0].trim()) body.shift();
    out[g + '.' + seen[g]] = {
      code: g + '.' + seen[g], title, body: body.join('\n').trim().slice(0, 4000),
      owners: String(r.Measure_Owners__c || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 12),
      status: r.Status__c || '', method: (r.Method__r && r.Method__r.Name) || ''
    };
  }
  return out;
}

async function getMeasures(sf, force) {
  if (!force && cache && Date.now() - cache.t < TTL) return cache.v;
  const rows = ((await sf.query(`SELECT Name, MeasureName__c, MeasureGroupId__c, Measure_Owners__c, Status__c, Method__r.Name FROM V2G_Measure__c WHERE V2MOM__r.Name = '${V2MOM_NAME}' ORDER BY Name LIMIT 500`)).records) || [];
  const v = { measures: parse(rows), source: 'GUS ' + V2MOM_NAME, fetchedAt: new Date().toISOString() };
  cache = { t: Date.now(), v };
  return v;
}
module.exports = { getMeasures, parse, plain };
