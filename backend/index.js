const MONTH_ORDER = ['April', 'May', 'June', 'July'];
const MONTH_KEY_MAP = { 'month-Apr': 'April', 'month-May': 'May', 'month-Jun': 'June', 'month-Jul': 'July' };
const HEALTH_VALUES = new Set(['On Track', 'Watch', 'Blocked', 'Not Started', 'On Hold', 'Completed', 'Canceled']);

function mergeMonthComment(existing, monthLabel, newText) {
  const sections = {};
  let currentMonth = null;
  for (const line of (existing || '').split('\n')) {
    const stripped = line.trim();
    let matched = false;
    for (const m of MONTH_ORDER) {
      if (stripped.toLowerCase().startsWith(m.toLowerCase() + ':') || stripped.toLowerCase().startsWith(m.toLowerCase() + ' ')) {
        currentMonth = m;
        sections[m] = stripped.slice(m.length).replace(/^[:\s]+/, '').trim();
        matched = true;
        break;
      }
    }
    if (!matched && currentMonth) {
      sections[currentMonth] = (sections[currentMonth] || '') + '\n' + line;
    }
  }
  sections[monthLabel] = newText.trim();
  return MONTH_ORDER
    .filter(m => sections[m] && sections[m].trim())
    .map(m => `${m}: ${sections[m].trim()}`)
    .join('\n');
}

async function sfUpdateRecord(sf, objectName, recordId, fields) {
  const record = { Id: recordId, ...fields };
  const errors = [];

  if (typeof sf.sobject === 'function') {
    try {
      const r = await sf.sobject(objectName).update(record);
      if (r && (r.id || r.success !== false)) return { ok: true, result: r, method: 'sobject' };
    } catch (e) { errors.push({ method: 'sobject', error: e.message || String(e) }); }
  }

  try {
    const r = await sf.update(objectName, record);
    if (r && (r.id || r.success !== false)) return { ok: true, result: r, method: 'update-2arg' };
  } catch (e) { errors.push({ method: 'update-2arg', error: e.message || String(e) }); }

  try {
    const r = await sf.update(objectName, [record]);
    const item = Array.isArray(r) ? r[0] : r;
    if (item && (item.id || item.success !== false)) return { ok: true, result: item, method: 'update-array' };
  } catch (e) { errors.push({ method: 'update-array', error: e.message || String(e) }); }

  try {
    const r = await sf.update(objectName, recordId, fields);
    if (r && (r.id || r.success !== false)) return { ok: true, result: r, method: 'update-3arg' };
  } catch (e) { errors.push({ method: 'update-3arg', error: e.message || String(e) }); }

  if (typeof sf.request === 'function') {
    try {
      const r = await sf.request({
        method: 'PATCH',
        url: `/services/data/v62.0/sobjects/${objectName}/${recordId}`,
        body: JSON.stringify(fields),
        headers: { 'Content-Type': 'application/json' }
      });
      return { ok: true, result: r || { id: recordId, success: true }, method: 'request-patch' };
    } catch (e) { errors.push({ method: 'request-patch', error: e.message || String(e) }); }
  }

  return { ok: false, error: 'All update approaches failed', details: errors };
}

function inspectSf(sf) {
  const info = { type: typeof sf, keys: [], methods: [], hasQuery: false, hasUpdate: false, hasSobject: false, hasRequest: false };
  if (sf && typeof sf === 'object') {
    info.keys = Object.keys(sf);
    info.methods = Object.keys(sf).filter(k => typeof sf[k] === 'function');
    info.hasQuery = typeof sf.query === 'function';
    info.hasUpdate = typeof sf.update === 'function';
    info.hasSobject = typeof sf.sobject === 'function';
    info.hasRequest = typeof sf.request === 'function';
    if (sf.constructor) info.constructorName = sf.constructor.name;
  }
  return info;
}

module.exports.handleRequest = async (ctx) => {
  const req = ctx.request || ctx;
  const sf = ctx.sf || {};
  const body = req.body || req;
  const action = body.action;

  if (action === 'debug') {
    const sfInfo = inspectSf(sf);
    const ctxKeys = Object.keys(ctx);
    const reqKeys = req ? Object.keys(req) : [];
    return { ok: true, payload: { sfInfo, ctxKeys, reqKeys, bodyKeys: Object.keys(body) } };
  }

  if (action === 'query') {
    const { soql } = body;
    if (!soql) return { ok: false, error: 'soql required' };
    const result = await sf.query(soql);
    return { ok: true, payload: { status: 'ok', records: result.records || [] } };
  }

  if (action === 'update') {
    const { epicId, field, value } = body;
    if (!epicId || !field) return { ok: false, error: 'epicId and field required' };

    let gusField, gusValue;

    if (field.startsWith('month-')) {
      const monthLabel = MONTH_KEY_MAP[field];
      if (!monthLabel) return { ok: false, error: `Unknown month field: ${field}` };
      const existing = await sf.query(
        `SELECT Id, Epic_Health_Comments__c FROM ADM_Epic__c WHERE Id = '${epicId.replace(/'/g, "''")}' LIMIT 1`
      );
      const current = (existing.records || [])[0]?.Epic_Health_Comments__c || '';
      gusField = 'Epic_Health_Comments__c';
      gusValue = mergeMonthComment(current, monthLabel, value || '');
    } else if (field === 'health') {
      if (!HEALTH_VALUES.has(value)) return { ok: false, error: `Invalid health: ${value}` };
      gusField = 'Health__c';
      gusValue = value;
    } else {
      const fieldMap = {
        pathToGreen: 'Path_to_Green__c',
        slippage: 'Slippage_Comments__c',
        priority: 'Priority__c',
        plannedStartDate: 'Planned_Start_Date__c',
        plannedEndDate: 'Planned_End_Date__c'
      };
      gusField = fieldMap[field];
      if (!gusField) return { ok: true, payload: { status: 'skipped', reason: `Field ${field} not mapped` } };
      gusValue = value;
    }

    const upd = await sfUpdateRecord(sf, 'ADM_Epic__c', epicId, { [gusField]: gusValue });
    return {
      ok: true,
      payload: { status: upd.ok ? 'ok' : 'error', epicId, gusField, method: upd.method || null, error: upd.error || null, details: upd.details || null }
    };
  }

  if (action === 'batchUpdate') {
    const { updates } = body;
    if (!updates || !updates.length) return { ok: false, error: 'updates array required' };

    const results = [];
    for (const upd of updates) {
      const { epicId, fields } = upd;
      if (!epicId || !fields) { results.push({ epicId, status: 'skipped' }); continue; }

      const gusUpdates = {};
      const monthUpdates = {};

      for (const [field, value] of Object.entries(fields)) {
        if (field.startsWith('month-')) {
          const ml = MONTH_KEY_MAP[field];
          if (ml) monthUpdates[ml] = value;
        } else if (field === 'health' && HEALTH_VALUES.has(value)) {
          gusUpdates.Health__c = value;
        } else {
          const map = { pathToGreen: 'Path_to_Green__c', slippage: 'Slippage_Comments__c', priority: 'Priority__c' };
          if (map[field]) gusUpdates[map[field]] = value;
        }
      }

      if (Object.keys(monthUpdates).length) {
        const existing = await sf.query(
          `SELECT Id, Epic_Health_Comments__c FROM ADM_Epic__c WHERE Id = '${epicId.replace(/'/g, "''")}' LIMIT 1`
        );
        let merged = (existing.records || [])[0]?.Epic_Health_Comments__c || '';
        for (const [ml, text] of Object.entries(monthUpdates)) {
          merged = mergeMonthComment(merged, ml, text);
        }
        gusUpdates.Epic_Health_Comments__c = merged;
      }

      if (Object.keys(gusUpdates).length) {
        try {
          const r = await sfUpdateRecord(sf, 'ADM_Epic__c', epicId, gusUpdates);
          results.push({ epicId, status: r.ok ? 'ok' : 'error', method: r.method || null, error: r.error || null, details: r.details || null, fields: Object.keys(gusUpdates) });
        } catch (e) {
          results.push({ epicId, status: 'error', error: e.message });
        }
      } else {
        results.push({ epicId, status: 'skipped', reason: 'no GUS fields' });
      }
    }

    return { ok: true, payload: { status: 'ok', results } };
  }

  return { ok: false, error: `Unknown action: ${action}` };
};
